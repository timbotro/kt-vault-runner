import 'dotenv/config'
import { ApiPromise, WsProvider } from '@polkadot/api'
import { Keyring } from '@polkadot/api'

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
  const vaultInfo = (
    await api.query.vaultRegistry.vaults({
      accountId: address,
      currencies: tokenPair,
    })
  ).toJSON() as any

  if ((await vaultInfo) === null) {
    console.error(`No vault details found for ${address}, exitting.`)
    throw new Error('No vault details found.')
  }

  const active = (await vaultInfo.status.active) ? true : false
  const unbanned = (await vaultInfo.bannedUntil) === null ? true : false

  const getCollateral = async () => {
    const resp = ((await api.query.tokens.accounts(address, { Token: 'KSM' })) as any).reserved
    return (Number(await resp) / 10 ** 12).toFixed(2)
  }

  const getIssued = () => {
    return (Number(vaultInfo.issuedTokens) / 10 ** 8).toFixed(5)
  }

  const getPrice = async () => {
    const resp = (await api.query.oracle.aggregate({ ExchangeRate: { Token: 'KSM' } })) as unknown
    const bigInt = BigInt(resp as number)
    const formatted = bigInt / BigInt(10 ** 19)

    return (Number(formatted.toString()) / 1000).toFixed(2)
  }

  const getRatio = async () => {
    const price = await getPrice()
    const issuedValue = Number(price) * Number(getIssued())
    const ratio = Number(await getCollateral()) / issuedValue

    return (ratio * 100).toFixed(2)
  }

  const getMintCapacity = async (desiredRatio: number = 261) => {
    const collat = Number(await getCollateral())
    const price = Number(await getPrice())
    const issued = Number(getIssued())
    const remaining = collat / (desiredRatio / 100) / price - issued

    return remaining.toFixed(5)
  }

  const submitIssueRequest = async () => {
    if (!(Number(await getMintCapacity()) > 0.0001)) {
      console.error('Mint capacity is below minimum threshold. Aborting')
      return
    }
    const amount = BigInt(Number(await getMintCapacity()) * 10 ** 8)

    const calls = [
      api.tx.vaultRegistry.acceptNewIssues(tokenPair, true),
      api.tx.issue.requestIssue(amount, { address, tokenPair }),
      api.tx.vaultRegistry.acceptNewIssues(tokenPair, false),
    ]

    let txn_hash
    const txn = api.tx.utility.batchAll(calls)
    let promise = new Promise(async (resolve, reject) => {
      const unsub = await txn.signAndSend(signer, { nonce: -1 }, (block) => {
        if (block.status.isInBlock) resolve(block.status.asInBlock)
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
    getRatio,
    getMintCapacity,
    submitIssueRequest,
  }
}
