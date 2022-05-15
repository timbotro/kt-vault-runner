import 'dotenv/config'
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api'
import { payments } from 'bitcoinjs-lib'
import Big from 'big.js'
import { options } from '@acala-network/api'
import { parseConfigFileTextToJson } from 'typescript'

const kint = { Token: 'KINT' }
const ksm = { Token: 'KSM' }
const kbtc = { Token: 'KBTC' }
const kusd = { Token: 'KUSD' }
const kar = { Token: 'KAR' }

const setupKeys = (api: ApiPromise) => {
  const ss58Prefix = api.consts.system.ss58Prefix as unknown
  const keyring = new Keyring({ type: 'sr25519' })
  const signer = keyring.addFromMnemonic(process.env.SEED_PHRASE as string)

  return { ss58Prefix, keyring, signer, address: keyring.encodeAddress(signer.publicKey, ss58Prefix as number) }
}

export const setup = async () => {
  const tokenPair = { collateral: ksm, wrapped: kbtc }

  const provider = new WsProvider(process.env.WSS_URI)
  const api = await ApiPromise.create({ provider })
  await api.isReady

  const { address, signer } = setupKeys(api)

  const blob = api.consts.system.version.toJSON() as any
  const ksmBtcVaultPrimitive = { accountId: address, currencies: tokenPair }

  const getVaultInfo = async () => {
    const resp = (await api.query.vaultRegistry.vaults(ksmBtcVaultPrimitive)).toJSON()

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
    const resp = ((await api.query.tokens.accounts(address, ksm)) as any).reserved
    return (Number(await resp) / 10 ** 12).toFixed(2)
  }

  const getIssued = async () => {
    return (Number(((await getVaultInfo()) as any).issuedTokens) / 10 ** 8).toFixed(5)
  }

  const getKintFree = async (formatted: boolean = false) => {
    const resp = Number(((await api.query.tokens.accounts(address, kint)) as any).free) / 10 ** 12
    return formatted ? resp : resp.toFixed(2)
  }

  const getKsmFree = async (formatted: boolean = false) => {
    const resp = await api.query.tokens.accounts(address, ksm) as any
    return resp.free
  }

  const getKintPending = async () => {
    const rewardPerToken: Big = (await api.query.vaultRewards.rewardPerToken(kint)) as any
    const rewardTally: Big = (await api.query.vaultRewards.rewardTally(kint, ksmBtcVaultPrimitive)) as any
    const stake: Big = (await api.query.vaultRewards.stake(ksmBtcVaultPrimitive)) as any

    const xStake = new Big(stake.toString())
    const scalingFactor = new Big(Math.pow(10, 18))
    const xScaled = xStake.div(scalingFactor)
    const calc = xScaled.mul(rewardPerToken).sub(rewardTally)
    const rewardFactor = new Big(Math.pow(10, 30))
    const formattedCalc = calc.div(rewardFactor)
    return formattedCalc.toFixed(2)
  }

  const getPrice = async () => {
    const resp = (await api.query.oracle.aggregate({ ExchangeRate: ksm })) as unknown
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

  const claimRewards = async () => {
    const txn = await api.tx.fee.withdrawRewards(ksmBtcVaultPrimitive, 0)
    const claim = submitTx(txn, signer)
    return claim
  }

  const depositCollateral = async () => {}

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
      api.tx.issue.requestIssue(amount, ksmBtcVaultPrimitive),
      api.tx.vaultRegistry.acceptNewIssues(tokenPair, false),
    ]

    const txn = api.tx.utility.batchAll(calls)
    const details = await submitTx(txn, signer)
    return details
  }

  const printStats = async () => {
    console.log('=============================')
    console.log(`⚡️ Connected to: ${blob.specName} v${blob.specVersion}`)
    console.log(`🔑 Signer address: ${address}`)
    console.log(`ℹ️  Current status: ${active ? 'OPEN 🔓' : 'CLOSED 🔒'}`)
    console.log(`❓ Permission: ${unbanned ? 'OPEN ✅' : 'BANNED ❌'}`)
    console.log(`🐤 Collateral: ${await getCollateral()} KSM`)
    console.log(`🕰  Outstanding issue requests: ${await getToBeIssued()} kBTC`)
    console.log(`💰 Issued: ${await getIssued()} kBTC`)
    console.log(`🤌  Collateral Ratio: ${await getRatio()}%`)
    console.log(`🌱 Mint Capacity Remaining: ${await getMintCapacity()} kBTC`)
    console.log(`💸 KINT Balance Free: ${await getKintFree()} KINT`)
    console.log('=============================')
  }

  return {
    api,
    signer,
    address,
    blob,
    active,
    claimRewards,
    depositCollateral,
    unbanned,
    getIssued,
    getCollateral,
    getKintFree,
    getKintPending,
    getKsmFree,
    getRatio,
    getMintCapacity,
    getToBeIssued,
    submitIssueRequest,
    printStats,
  }
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const parseResponse = (resp) => {
  let issueJson
  let events = ''
  resp.events.forEach(({ phase, event: { data, method, section } }) => {
    events = events.concat(`\n\t${phase}: ${section}.${method}::${data}`)
    if (section == 'issue' && method == 'RequestIssue') issueJson = data
  })
  events.concat('\n')
  const vaultAddressJson = issueJson[6]
  const amount = Number(issueJson[2]) + Number(issueJson[3])
  const parsedAddress = JSON.parse(vaultAddressJson)
  const hexHash = parsedAddress.p2wpkHv0
  const hash = Buffer.from(hexHash.substring(2), 'hex')
  const vaultBtcAddress = payments.p2wpkh({ hash }).address

  return { vaultBtcAddress, amount, events }
}

export const kusamaApi = async () => {
  const wsProvider = new WsProvider('wss://kusama.api.onfinality.io/public-ws')
  const api = await ApiPromise.create({ provider: wsProvider })
  await api.isReady

  return { api }
}

export const karuraApi = async () => {
  const wsProvider = new WsProvider('wss://karura-rpc-1.aca-api.network')
  const api = await ApiPromise.create(options({ provider: wsProvider }))
  await api.isReady

  const { signer, address } = setupKeys(api)

  const destinationKarura = {
    V1: {
      parents: 1,
      interior: {
        X2: [
          {
            Parachain: 2000,
          },
          {
            AccountId32: { network: 'Any', id: signer.publicKey },
          },
        ],
      },
    },
  }

  const destinationKintsugi = {
    V1: {
      parents: 1,
      interior: {
        X2: [
          {
            Parachain: 2092,
          },
          {
            AccountId32: { network: 'Any', id: signer.publicKey },
          },
        ],
      },
    },
  }

  const destinationKusama = {
    V1: {
      parents: 1,
      interior: {
        X1: {
          AccountId32: { network: 'Any', id: signer.publicKey },
        },
      },
    },
  }

  const getKarBalance = async () => {
    const resp = (await api.query.system.account(address)) as any
    const bal = resp.data.free
    return (Number(bal) / 10 ** 12).toFixed(2)
  }
  const getKsmKintPrice = async () => {
    const respKint = (await api.query.dex.liquidityPool([kusd, kint])).toJSON()!
    const respKsm = (await api.query.dex.liquidityPool([kusd, ksm])).toJSON()!
    const kintPrice = respKint[0] / respKint[1]
    const ksmPrice = respKsm[0] / respKsm[1]

    return Number(kintPrice / ksmPrice).toFixed(5)
  }
  const printStats = async () => {
    console.log(signer.addressRaw)
    console.log(signer.publicKey)
    //   console.log(sig)
    console.log(`KAR Address: ${address}`)
    console.log(`🚗 KAR Balance: ${await getKarBalance()}`)
    console.log(`KAR/KSM Price: ${await getKsmKintPrice()}`)
  }
  // bridge from kintsugi
  const bridgeFromKint = async (amount) => {
    const txn = api.tx.xTokens.transfer(kint, amount, destinationKarura, 5000000000)
    const details = await submitTx(txn, signer)
    return details
  }

  const bridgeToKint = async (amount) => {
    const txn = api.tx.xTokens.transer(ksm, amount, destinationKintsugi, 5000000000)
    const details = await submitTx(txn, signer)
    return details
  }

  const bridgeToKusama = async (amount) => {
    const txn = api.tx.xTokens.transfer(ksm, amount, destinationKusama, 5000000000)
    const details = await submitTx(txn, signer)
    return details
  }

  const getKsmFree = async () => {
    const bal = (await api.query.tokens.accounts(address, ksm)) as any
    return bal.free
  }

  const getKintFree = async () => {
    const bal = (await api.query.tokens.accounts(address, kint)) as any
    return bal.free
  }

  const swapKintForKsm = async (amount) => {
    const txn = api.tx.dex.swapWithExactSupply([kint, kusd, kar, ksm], amount, 0)
    const details = await submitTx(txn, signer)
    return details
  }

  return {
    api,
    printStats,
    getKarBalance,
    getKsmFree,
    getKsmKintPrice,
    bridgeFromKint,
    bridgeToKint,
    bridgeToKusama,
    getKintFree,
    swapKintForKsm,
  }
}

const submitTx = async (tx, signer) => {
  let details
  console.log('Txns built. Waiting...')
  let promise = new Promise(async (resolve, reject) => {
    const unsub = await tx.signAndSend(signer, { nonce: -1 }, ({ events = [], status }) => {
      if (status.isInBlock) console.log(`Txns in unfinalized block: ${status.asInBlock} waiting...`)
      if (status.isDropped) reject('Block has been dropped!')
      if (status.isFinalized) resolve({ events, hash: status.asFinalized })
    })
  })

  await promise
    .then((message) => {
      details = message
    })
    .catch((message) => {
      throw new Error('Sending transaction failed.')
    })

  return details
}
