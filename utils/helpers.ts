import 'dotenv/config'
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api'

export const setup = async () => {
  const tokenPair = { collateral: { Token: 'KSM' }, wrapped: { Token: 'KBTC' } }

  const provider = new WsProvider(process.env.WSS_URI)
  const api = await ApiPromise.create({ provider })
  await api.isReady

  const ss58Prefix = api.consts.system.ss58Prefix as unknown

  const keyring = new Keyring({ type: 'sr25519' })
  const signer = keyring.addFromMnemonic(process.env.SEED_PHRASE as string)
  const address = keyring.encodeAddress(signer.publicKey, ss58Prefix as number)
  const blob = api.consts.system.version.toJSON() as any

  const getVaultInfo = async () => {
    const resp = (await api.query.vaultRegistry.vaults({ accountId: address, currencies: tokenPair })).toJSON()

    if (resp === null) {
      console.error(`No vault details found for ${address}, exitting.`)
      throw new Error('No vault details found.')
    }
    return resp
  }

  const active = ((await getVaultInfo()) as any).status.active ? true : false
  const unbanned = ((await getVaultInfo()) as any).bannedUntil === null ? true : false

  const getToBeIssued = async () => {
    const resp = Number(((await getVaultInfo()) as any).toBeIssuedTokens) / 10 ** 8

    return resp.toFixed(5)
  }

  const getCollateral = async () => {
    const resp = ((await api.query.tokens.accounts(address, { Token: 'KSM' })) as any).reserved
    return (Number(await resp) / 10 ** 12).toFixed(2)
  }

  const getIssued = async () => {
    return (Number(((await getVaultInfo()) as any).issuedTokens) / 10 ** 8).toFixed(5)
  }

  const getKintFree = async () => {
    const resp = Number(((await api.query.tokens.accounts(address, { Token: 'KINT' })) as any).free) / 10 ** 12
    return resp.toFixed(2)
  }

  const getPrice = async () => {
    const resp = (await api.query.oracle.aggregate({ ExchangeRate: { Token: 'KSM' } })) as unknown
    const bigInt = BigInt(resp as number)
    const formatted = bigInt / BigInt(10 ** 19)

    return (Number(formatted.toString()) / 1000).toFixed(2)
  }

  const getRatio = async () => {
    const price = await getPrice()
    const issuedValue = Number(price) * Number(await getIssued())
    const ratio = Number(await getCollateral()) / issuedValue

    return (ratio * 100).toFixed(2)
  }

  const getMintCapacity = async (desiredRatio: number = 261) => {
    const collat = Number(await getCollateral())
    const price = Number(await getPrice())
    const issued = Number(await getIssued())
    const remaining = collat / (desiredRatio / 100) / price - issued

    return remaining.toFixed(5)
  }

  const submitIssueRequest = async (collatPercent: number) => {
    if (!(Number(await getMintCapacity()) > 0.0001)) {
      console.error('Mint capacity is below minimum threshold. Aborting')
      throw new Error('Remaining capacity too low')
    }

    if (!(Number(await getKintFree()) > 0.01)) {
      console.error('Not enough free KINT balance to submit issue request. Aborting')
      throw new Error('Insufficient KINT')
    }

    if (Number(await getToBeIssued()) > 0.0001) {
      console.error('This vault already have issue requests currently pending. Aborting')
      throw new Error('Pending issue requests detected')
    }
    const amount = BigInt((Number(await getMintCapacity(collatPercent)) * 10 ** 8).toFixed(0))

    const calls = [
      api.tx.vaultRegistry.acceptNewIssues(tokenPair, true),
      api.tx.issue.requestIssue(amount, {accountId: address, currencies: tokenPair}),
      api.tx.vaultRegistry.acceptNewIssues(tokenPair, false),
    ]

    let txn_hash
    const txn = api.tx.utility.batchAll(calls)
    console.log('Txns built. Waiting...')
    let promise = new Promise(async (resolve, reject) => {
      const unsub = await txn.signAndSend(signer, { nonce: -1 }, (block) => {
        if (block.status.isInBlock) console.log(`Txns in unfinalized block: ${block.status.asInBlock} waiting...`)
        if (block.status.isFinalized) resolve(block.status.asFinalized)
        if (block.status.isDropped) reject('Block has been dropped!')
      })
    })

    await promise
      .then((message) => {
        txn_hash = message
      })
      .catch((message) => {
        throw new Error('Sending transaction failed.')
      })
    return txn_hash
  }

  return {
    api,
    signer,
    address,
    blob,
    active,
    unbanned,
    getIssued,
    getCollateral,
    getKintFree,
    getRatio,
    getMintCapacity,
    getToBeIssued,
    submitIssueRequest,
  }
}
