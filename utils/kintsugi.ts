import 'dotenv/config'
import { ApiPromise, WsProvider } from '@polkadot/api'
import Big from 'big.js'
import {
  FixedPointNumber,
  FixedPointNumber as FP,
} from '@acala-network/sdk-core'
import { kusd, kint, ksm, kbtc, kar } from '../static/tokens'
import {
  setupKeys,
  printPercentages,
  submitTx,
  waitForBalChange,
} from './helpers'
import { request } from 'http'

export const setupKintsugi = async () => {
  const tokenPair = { collateral: ksm, wrapped: kbtc }

  const provider = new WsProvider(process.env.WSS_URI)
  const api = await ApiPromise.create({ provider })
  await api.isReady

  const { address, signer } = await setupKeys(api)

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
  const blob = api.consts.system.version.toJSON() as any
  const ksmBtcVaultPrimitive = { accountId: address, currencies: tokenPair }
  const ksmCurrencyPair = {
    collateral: { Token: 'KSM' },
    wrapped: { Token: 'KBTC' },
  }

  const getVaultInfo = async () => {
    const resp = (
      await api.query.vaultRegistry.vaults(ksmBtcVaultPrimitive)
    ).toJSON()

    if (resp === null) {
      console.error(`No vault details found for ${address}, exitting.`)
      throw new Error('No vault details found.')
    }
    return resp
  }

  const active = ((await getVaultInfo()) as any).status.active ? true : false
  const unbanned =
    ((await getVaultInfo()) as any).bannedUntil === null ? true : false

  const getToBeIssued = async () => {
    const resp =
      Number(((await getVaultInfo()) as any).toBeIssuedTokens) / 10 ** 8

    return resp.toFixed(5)
  }

  const getCollateral = async () => {
    const resp = ((await api.query.tokens.accounts(address, ksm)) as any)
      .reserved
    return (Number(await resp) / 10 ** 12).toFixed(2)
  }

  const getIssued = async () => {
    return (
      Number(((await getVaultInfo()) as any).issuedTokens) /
      10 ** 8
    ).toFixed(5)
  }

  const getKintFree = async (formatted: boolean = false) => {
    // const resp = Number(((await api.query.tokens.accounts(address, kint)) as any).free) / 10 ** 12
    // const resp = (await api.query.tokens.accounts(address,kint) as any).free
    const { free, frozen } = (await api.query.tokens.accounts(
      address,
      kint
    )) as any
    const freeFP = new FP(free.toString())
    const frozenFP = new FP(frozen.toString())
    const result = freeFP.sub(frozenFP).div(new FP(10 ** 12))

    return formatted ? result.toNumber(2) : result.toNumber()
  }

  const getKsmFree = async (formatted: boolean = false) => {
    const free = ((await api.query.tokens.accounts(address, ksm)) as any).free
    // const reserved = ((await api.query.tokens.accounts(address, ksm)) as any).reserved
    // const available = new FP(free.toString(),1).sub(new FP(reserved.toString(),1))
    // console.log(free.toString())
    return new FP(free.toString())
  }

  const getKintPending = async () => {
    const rewardPerToken: Big = (await api.query.vaultRewards.rewardPerToken(
      kint
    )) as any
    const rewardTally: Big = (await api.query.vaultRewards.rewardTally(
      kint,
      ksmBtcVaultPrimitive
    )) as any
    const stake: Big = (await api.query.vaultRewards.stake(
      ksmBtcVaultPrimitive
    )) as any

    const xStake = new Big(stake.toString())
    const scalingFactor = new Big(Math.pow(10, 18))
    const xScaled = xStake.div(scalingFactor)
    const calc = xScaled.mul(rewardPerToken).sub(rewardTally)
    const rewardFactor = new Big(Math.pow(10, 30))
    const formattedCalc = calc.div(rewardFactor)
    return formattedCalc.toFixed(2)
  }

  const getPrice = async () => {
    const resp = (await api.query.oracle.aggregate({
      ExchangeRate: ksm,
    })) as unknown
    const bigInt = BigInt(resp as number)
    const formatted = bigInt / BigInt(10 ** 19)

    return (Number(formatted.toString()) / 1000).toFixed(2)
  }

  const getRatio = async (extra: number = 0) => {
    const price = await getPrice()
    const issuedValue = Number(price) * Number(await getIssued())
    const ratio = (Number(await getCollateral()) + extra) / issuedValue

    return (ratio * 100).toFixed(2)
  }

  const getCollateralFromRatio = async (ratio: number) => {
    const resp = (
      await api.query.vaultRegistry.vaults(ksmBtcVaultPrimitive)
    ).toJSON()!
    const issued = (resp as any).issuedTokens + (resp as any).toBeIssuedTokens
    const oracle = new FP(
      (await api.query.oracle.aggregate({ ExchangeRate: ksm })).toString()
    )
    const price = oracle.div(new FP(10 ** 22))
    const obligation = new FP(issued).mul(price)
    const ratioFp = new FP(ratio)
    const collat = ratioFp.mul(obligation).mul(new FP(100))

    return collat
  }

  const getCollateralRatio = async (collateral: FixedPointNumber) => {
    const resp = (
      await api.query.vaultRegistry.vaults(ksmBtcVaultPrimitive)
    ).toJSON()!
    const issued = (resp as any).issuedTokens + (resp as any).toBeIssuedTokens
    const oracle = new FP(
      (await api.query.oracle.aggregate({ ExchangeRate: ksm })).toString()
    )
    const price = oracle.div(new FP(10 ** 22))
    const obligation = new FP(issued).mul(price)
    const ratio = collateral.div(obligation).div(new FP(100))
    return ratio
  }

  const bridgeToKarura = (amount: FixedPointNumber) => {
    const txn = api.tx.xTokens.transfer(
      kint,
      amount.toChainData(),
      destinationKarura,
      5000000000
    )
    return txn
  }

  const bridgeToKaruraAction = async (amount: FixedPointNumber) => {
    const txn = api.tx.xTokens.transfer(
      kint,
      amount.toChainData(),
      destinationKarura,
      5000000000
    )
    const details = await submitTx(txn, signer)
    return details
  }

  const getMintCapacity = async (desiredRatio: number = 261) => {
    const collat = Number(await getCollateral())
    const price = Number(await getPrice())
    const issued = Number(await getIssued())
    const remaining = collat / (desiredRatio / 100) / price - issued

    return remaining.toFixed(5)
  }

  const claimRewards = () => {
    const txn = api.tx.fee.withdrawRewards(ksmBtcVaultPrimitive, 0)
    return txn
  }

  const claimRewardsAction = async () => {
    const txn = api.tx.fee.withdrawRewards(ksmBtcVaultPrimitive, 0)
    const claim = await submitTx(txn, signer)
    return claim
  }

  const depositCollateral = async (amount: FixedPointNumber) => {
    const txn = api.tx.vaultRegistry.depositCollateral(
      tokenPair,
      amount.toString()
    )
    const details = await submitTx(txn, signer)
    return details
  }

  const submitBatch = async (calls: any[]) => {
    const txn = api.tx.utility.batchAll(calls)
    const details = await submitTx(txn, signer)
    return details
  }

  const withdrawCollateralAndBridge = async (
    number: number,
    initialBal: FP,
    balCheck
  ) => {
    const requested = new FP(number / 100, 0)
    const ratio = new FP(await getIssued()).mul(new FP(await getPrice()))
    const amount = requested.mul(new FP(10 ** 12)).mul(ratio).toChainData()
    const txns = [
      api.tx.vaultRegistry.withdrawCollateral(
        ksmCurrencyPair,
        amount
      ),
      api.tx.xTokens.transfer(
        ksm,
        amount,
        destinationKarura,
        5000000000
      ),
    ]

    process.stdout.write(
      `(1/3) Withdrawing and bridging ${new FP(amount)
        .div(new FP(10 ** 12))
        .toString(5)} KSM from vault...`
    )
    const details = await submitBatch(txns)

    const diff = await waitForBalChange(initialBal, balCheck)
    details.bridged = diff
    return details
  }

  const submitIssueRequest = async (collatPercent: number) => {
    if (!(Number(await getMintCapacity()) > 0.0001)) {
      console.error('Mint capacity is below minimum threshold. Aborting')
      throw new Error('Remaining capacity too low')
    }

    if (!(Number(await getKintFree()) > 0.01)) {
      console.error(
        'Not enough free KINT balance to submit issue request. Aborting'
      )
      throw new Error('Insufficient KINT')
    }

    if (Number(await getToBeIssued()) > 0.0001) {
      console.error(
        'This vault already have issue requests currently pending. Aborting'
      )
      throw new Error('Pending issue requests detected')
    }
    const amount = BigInt(
      (Number(await getMintCapacity(collatPercent)) * 10 ** 8).toFixed(0)
    )

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
    bridgeToKarura,
    claimRewards,
    depositCollateral,
    unbanned,
    getIssued,
    getCollateral,
    getCollateralRatio,
    getCollateralFromRatio,
    getKintFree,
    getKintPending,
    getKsmFree,
    getRatio,
    getMintCapacity,
    getToBeIssued,
    submitIssueRequest,
    submitBatch,
    printStats,
    withdrawCollateralAndBridge,
  }
}
