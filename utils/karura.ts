import 'dotenv/config'
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api'
import { getCgPrice } from '../utils/fetch'
import { options } from '@acala-network/api'
import {
  FixedPointNumber,
  FixedPointNumber as FP,
} from '@acala-network/sdk-core'
import {
  kusd,
  kint,
  lksm,
  ksm,
  kbtc,
  kar,
  kusdKbtcDexshare,
} from '../static/tokens'
import {
  setupKeys,
  printPercentages,
  parseSpecificResult,
  submitTx,
} from './helpers'
import { sign } from 'crypto'

export const kusamaApi = async () => {
  const wsProvider = new WsProvider('wss://kusama.api.onfinality.io/public-ws')
  const api = await ApiPromise.create({ provider: wsProvider })
  await api.isReady

  return { api }
}

export const setupKarura = async () => {
  const wsProvider = new WsProvider('wss://karura-rpc-1.aca-api.network')
  const api = await ApiPromise.create(options({ provider: wsProvider }))
  await api.isReady

  const { signer, address } = await setupKeys(api)

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
  const getDexPrices = async (tokenA = kint, tokenB = ksm) => {
    const respKint = (
      (await api.query.dex.liquidityPool([kusd, tokenA])) as any
    ).toJSON()
    const respKsm = (
      (await api.query.dex.liquidityPool([kusd, tokenB])) as any
    ).toJSON()
    const tokenAPrice = new FP(respKint[0]).div(new FP(respKint[1]))
    const tokenBPrice = new FP(respKsm[0]).div(new FP(respKsm[1]))
    return { tokenAPrice, tokenBPrice }
  }

  const getKsmKintPrice = async (fp: boolean = false) => {
    const respKint = (await api.query.dex.liquidityPool([kusd, kint])).toJSON()!
    const respKsm = (await api.query.dex.liquidityPool([kusd, ksm])).toJSON()!
    const kintPrice = respKint[0] / respKint[1]
    const ksmPrice = respKsm[0] / respKsm[1]

    return fp
      ? new FP(kintPrice / ksmPrice)
      : Number(kintPrice / ksmPrice).toFixed(5)
  }

  const getMyShares = async () => {
    const { tokenA, tokenB } = await getPoolDepth()
    const totalShares = await getTotalDexShares()
    const myShares = await getStakedLp()

    const myTokenA = tokenA.mul(myShares.balance).div(totalShares)
    const myTokenB = tokenB.mul(myShares.balance).div(totalShares)

    return { myTokenA, myTokenB }
  }

  const getMySharesView = async (precA = 12, precB = 8) => {
    const myShares = await getMyShares()
    const myTokenA = myShares.myTokenA.div(new FP(10 ** precA)).toNumber(6)
    const myTokenB = myShares.myTokenB.div(new FP(10 ** precB)).toNumber(6)
    return { myTokenA, myTokenB: myTokenB }
  }

  const getMySharesValue = async (tokenA = kusd, tokenB = kbtc) => {
    // TODO: Check if a token is kusd and take that to be price=1
    const { myTokenA: tokenAAmount, myTokenB } = await getMyShares()
    // const tokenAPrice = await getDexPrice(kusd, tokenA)
    const tokenBPrice = await getDexPrice(kusd, tokenB)
    const tokenBAmount = myTokenB.mul(tokenBPrice)

    return tokenAAmount.add(tokenBAmount)
  }

  const getShareValue = async (tokenA = kusd, tokenB = kbtc) => {
    // const tokenBPrice = await getDexPrice(kusd, tokenB)
    // const tokenBAmount = myTokenB.mul(tokenBPrice)
    // return tokenAAmount.add(tokenBAmount)
  }

  const getMySharesInKsm = async () => {
    const mySharesValue = await getMySharesValue()
    const ksmPool = (await api.query.dex.liquidityPool([kusd, ksm])).toJSON()!
    const ksmPrice = new FP(ksmPool[0].toString()).div(
      new FP(ksmPool[1].toString())
    )
    const ksmReceived = mySharesValue.div(ksmPrice)
    return ksmReceived
  }

  const getSharesFromKsm = async () => {
    const ksmPool = (await api.query.dex.liquidityPool([kusd, ksm])).toJSON()!
    const ksmPrice = new FP(ksmPool[0].toString()).div(
      new FP(ksmPool[1].toString())
    )
  }

  const getMySharesInKsmView = async () => {
    const resp = await getMySharesInKsm()
    const val = resp.div(new FP(10 ** 12))
    return val.toNumber(4)
  }

  const getMySharesValueView = async () => {
    const resp = await getMySharesValue()
    const val = resp.div(new FP(10 ** 12))
    return val.toNumber(2)
  }

  const getDexPrice = async (tokenA, tokenB) => {
    const resp = await api.query.dex.liquidityPool([tokenA, tokenB])
    const json = resp.toJSON()!
    const price = new FP(json[0].toString()).div(new FP(json[1].toString()))

    return price
  }

  const getKsmPrice = async () => {
    const price = await getDexPrice(kusd, ksm)
    return price
  }

  const getStakedLp = async () => {
    const resp = await api.query.rewards.sharesAndWithdrawnRewards(
      { Dex: kusdKbtcDexshare },
      address
    )
    const json = resp.toJSON()!

    return { balance: new FP(json[0]), rewards: json[1] }
  }

  const getStakedLpBalance = async () => {
    const resp = (await getStakedLp()).balance
    const bal = resp.div(new FP(10 ** 12))
    return bal
  }

  const getStakedLpBalanceView = async () => {
    const resp = (await getStakedLp()).balance
    const bal = resp.div(new FP(10 ** 12))
    return bal
  }

  const getTotalDexShares = async () => {
    const resp = await api.query.tokens.totalIssuance(kusdKbtcDexshare)
    const shares = new FP(resp.toString())
    return shares
  }

  const getPoolDepth = async (pool = [kusd, kbtc]) => {
    const resp = await api.query.dex.liquidityPool(pool)
    const json = resp.toJSON()!
    const tokenA = new FP(json[0].toString())
    const tokenB = new FP(json[1].toString())
    return { tokenA, tokenB }
  }

  const getTokensPerShare = async () => {
    const { tokenA, tokenB } = await getPoolDepth()
    const totalShares = await getTotalDexShares()
    const aPerShare = tokenA.div(totalShares)
    const bPerShare = tokenB.div(totalShares)
    return { aPerShare, bPerShare }
  }

  const printStats = async (kintHarvest, ksmHarvest) => {
    const kintPrice = await getCgPrice('kintsugi')
    const ksmPrice = await getCgPrice('kusama')

    const kintInKsm = await getKsmKintPrice()
    const kintInUsd = Number(kintInKsm) * ksmPrice

    // const diff = calcPercentages(kintPrice, kintInUsd)

    console.log(`🏠 KAR Address: ${address}`)
    console.log(`🚗 KAR Balance (for fees): ${await getKarBalance()}`)
    console.log(
      `🧮 Karura KINT Price: ${kintInKsm} KSM / $${kintInUsd.toFixed(2)}`
    )
    printPercentages(kintPrice, kintInUsd)
    console.log(
      `🌾 Harvestable Amount: ${kintHarvest} KINT / ${ksmHarvest.toFixed(
        2
      )} KSM / $${(kintPrice * Number(kintHarvest)).toFixed(2)}`
    )
    console.log('=============================')
  }

  // bridge from kintsugi

  const bridgeAllKsmToKint = async () => {
    const amount = await getKsmFree()
    const txn = api.tx.xTokens.transfer(
      ksm,
      amount.toString(),
      destinationKintsugi,
      5000000000
    )
    const details = await submitTx(txn, signer)

    return details
  }

  const bridgeKsmToKint = async (amount: FixedPointNumber) => {
    const txn = api.tx.xTokens.transfer(
      ksm,
      amount.toString(),
      destinationKintsugi,
      5000000000
    )
    const details = await submitTx(txn, signer)

    return details
  }

  const bridgeToKint = (amount: FixedPointNumber) => {
    const txn = api.tx.xTokens.transfer(
      ksm,
      amount.toChainData(),
      destinationKintsugi,
      5000000000
    )
    return txn
  }

  const bridgeToKintAction = async (amount: FixedPointNumber) => {
    const txn = api.tx.xTokens.transfer(
      ksm,
      amount.toString(),
      destinationKintsugi,
      5000000000
    )
    const details = await submitTx(txn, signer)
    return details
  }

  const bridgeToKusama = async (amount) => {
    const txn = api.tx.xTokens.transfer(
      ksm,
      amount,
      destinationKusama,
      5000000000
    )
    const details = await submitTx(txn, signer)
    return details
  }

  const getKsmFree = async () => {
    const free = ((await api.query.tokens.accounts(address, ksm)) as any).free
    const reserved = ((await api.query.tokens.accounts(address, ksm)) as any)
      .reserved
    const available = new FP(free.toString()).sub(new FP(reserved.toString()))
    return available
  }

  const getKintFree = async () => {
    const free = (
      (await api.query.tokens.accounts(address, kint)) as any
    ).free.toString()
    const reserved = (
      (await api.query.tokens.accounts(address, kint)) as any
    ).reserved.toString()
    const available = new FP(free, 1).sub(new FP(reserved, 1))
    return available
  }

  const swapKintForKsm = (amount: FixedPointNumber) => {
    const txn = api.tx.dex.swapWithExactSupply(
      [kint, kusd, ksm],
      amount.toString(),
      0
    )
    return txn
  }

  const swapKintForKsmTxn = async (amount: FixedPointNumber) => {
    const tx = api.tx.dex.swapWithExactSupply(
      [kint, kusd, ksm],
      amount.toString(),
      0
    )
    const details = await submitTx(tx, signer)

    return details
  }

  const swapAllKintForKsm = async () => {
    const kintBalance = await getKintFree()
    const kintAsKsm = kintBalance.mul(
      (await getKsmKintPrice(true)) as FixedPointNumber
    )
    const tx = api.tx.dex.swapWithExactSupply(
      [kint, kusd, ksm],
      kintBalance.toString(),
      kintAsKsm.mul(new FP(0.98)).toNumber(0)
    )
    const details = await submitTx(tx, signer)

    return details
  }

  const getKbtcBal = async () => {
    const resp = (await api.query.tokens.accounts(address, kbtc)) as any
    return resp.free.toString()
  }
  const getKusdBal = async () => {
    const resp2 = (await api.query.tokens.accounts(address, kusd)) as any
    return resp2.free.toString()
  }

  const swapKusdKbtcforKsm = async (kusdBal: FP, kbtcBal: FP) => {
    const txns = [
      api.tx.dex.swapWithExactSupply([kusd, ksm], kusdBal.toString(), 0),
      api.tx.dex.swapWithExactSupply([kbtc, kusd, ksm], kbtcBal.toString(), 0),
    ]
    const details = await submitBatch(txns)
    const {results} = parseSpecificResult(details, 'dex', 'Swap')
    console.log(JSON.stringify(results))
    const total = new FP(
      results[0][2][results[0][2].length - 1].toString()
    ).add(new FP(results[1][2][results[1][2].length - 1].toString()))

    details.returned = total

    return details
  }

  const swapAllForKsm = async () => {
    const kbtcBal = await getKbtcBal()
    // const min1 = Number(resp.free) * 0.95 // TODO - add price in KSM for accurate min
    const kusdBal = await getKusdBal()
    // const min2 = Number(resp2.free) * 0.95 // TODO - add price in KSM for accurate min
    const txns = [
      api.tx.dex.swapWithExactSupply([kbtc, kusd, ksm], kbtcBal, 0),
      api.tx.dex.swapWithExactSupply([kusd, ksm], kusdBal, 0),
    ]
    const details = await submitBatch(txns)
    return details
  }

  const swapKsmForDexShare = async (ksmAmt: FP ) => {
    // const ksmAmt = await getKsmFree()
    const displayAmt = ksmAmt.div(new FP(10 ** 12))

    process.stdout.write(
      `(2/3) Swapping ${ksmAmt
        .div(new FP(10 ** 12))
        .toString()} KSM for kBTC and aUSD...`
    )
    ksmAmt.setPrecision(0)
    const ksmAmount = ksmAmt.div(new FP(2))
    const txs = [
      api.tx.dex.swapWithExactSupply(
        [ksm, lksm, kusd],
        ksmAmount.toString(),
        0
      ),
      api.tx.dex.swapWithExactSupply(
        [ksm, lksm, kusd, kbtc],
        ksmAmount.toString(),
        0
      ),
    ]
    const details = await submitBatch(txs)

    return details
  }

  const swapKintForKsmAction = async (amount: FixedPointNumber) => {
    const txn = api.tx.dex.swapWithExactSupply(
      [kint, kusd, kar, ksm],
      amount.toString(),
      0
    )
    const details = await submitTx(txn, signer)
    return details
  }

  const submitBatch = async (calls: any[]) => {
    const txn = api.tx.utility.batchAll(calls)
    const details = await submitTx(txn, signer)
    return details
  }

  const depositLpShares = async () => {
    const kbtcBal = await getKbtcBal()
    const kusdBal = await getKusdBal()

    process.stdout.write(
      `(3/3) Deposting ${new FP(kbtcBal)
        .div(new FP(10 ** 8))
        .toString()} kBTC and ${new FP(kusdBal)
        .div(new FP(10 ** 12))
        .toString()} aUSD into vault...`
    )
    const txn = api.tx.dex.addLiquidity(kusd, kbtc, kusdBal, kbtcBal, 0, true)
    const details = await submitTx(txn, signer)
    return details
  }

  const withdrawLpShares = async (shares: FixedPointNumber) => {
    const txns = [
      api.tx.incentives.withdrawDexShare(
        { DexShare: [kusd, kbtc] },
        shares.toString()
      ),
      api.tx.dex.removeLiquidity(kusd, kbtc, shares.toString(), 0, 0, false),
    ]
    const details = await submitBatch(txns)
    return details
  }

  return {
    api,
    depositLpShares,
    printStats,
    getKarBalance,
    getKsmFree,
    getKsmKintPrice,
    getKsmPrice,
    getDexPrices,
    getPoolDepth,
    getMyShares,
    getMySharesView,
    getMySharesValue,
    getMySharesInKsm,
    getMySharesInKsmView,
    getMySharesValueView,
    getStakedLp,
    getTokensPerShare,
    getStakedLpBalance,
    getStakedLpBalanceView,
    bridgeAllKsmToKint,
    bridgeKsmToKint,
    bridgeToKint,
    bridgeToKusama,
    getKintFree,
    swapAllKintForKsm,
    swapKintForKsmTxn,
    swapAllForKsm,
    swapKintForKsm,
    swapKsmForDexShare,
    swapKusdKbtcforKsm,
    submitBatch,
    withdrawLpShares,
    getTotalDexShares,
  }
}
