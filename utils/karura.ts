import 'dotenv/config'
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api'
import { getCgPrice } from '../utils/fetch'
import { options } from '@acala-network/api'
import { FixedPointNumber, FixedPointNumber as FP } from '@acala-network/sdk-core'
import { kusd, kint, ksm, kbtc, kar, kusdKbtcDexshare } from '../static/tokens'
import { setupKeys, printPercentages, submitTx } from './helpers'


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
    const respKint = ((await api.query.dex.liquidityPool([kusd, tokenA])) as any).toJSON()
    const respKsm = ((await api.query.dex.liquidityPool([kusd, tokenB])) as any).toJSON()
    const tokenAPrice = new FP(respKint[0]).div(new FP(respKint[1]))
    const tokenBPrice = new FP(respKsm[0]).div(new FP(respKsm[1]))
    return { tokenAPrice, tokenBPrice }
  }

  const getKsmKintPrice = async () => {
    const respKint = (await api.query.dex.liquidityPool([kusd, kint])).toJSON()!
    const respKsm = (await api.query.dex.liquidityPool([kusd, ksm])).toJSON()!
    const kintPrice = respKint[0] / respKint[1]
    const ksmPrice = respKsm[0] / respKsm[1]

    return Number(kintPrice / ksmPrice).toFixed(5)
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
    // const value = myTokenA.add(myTokenB.mul(tokenBPrice))

    return tokenAAmount.add(tokenBAmount)
  }

  const getMySharesInKsm = async () => {
    const mySharesValue = await getMySharesValue()
    const ksmPool = (await api.query.dex.liquidityPool([kusd, ksm])).toJSON()!
    const ksmPrice = new FP(ksmPool[0].toString()).div(new FP(ksmPool[1].toString()))
    const ksmReceived = mySharesValue.div(ksmPrice)
    return ksmReceived
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

  const getStakedLp = async () => {
    const resp = await api.query.rewards.sharesAndWithdrawnRewards({ Dex: kusdKbtcDexshare }, address)
    const json = resp.toJSON()!

    return { balance: new FP(json[0]), rewards: json[1] }
  }

  const getStakedLpBalance = async () => {
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
    console.log(`🧮 Karura KINT Price: ${kintInKsm} KSM / $${kintInUsd.toFixed(2)}`)
    printPercentages(kintPrice, kintInUsd)
    console.log(
      `🌾 Harvestable Amount: ${kintHarvest} KINT / ${ksmHarvest.toFixed(2)} KSM / $${(
        kintPrice * Number(kintHarvest)
      ).toFixed(2)}`
    )
    console.log('=============================')
  }

  // bridge from kintsugi

  const bridgeToKint = (amount: FixedPointNumber) => {
    const txn = api.tx.xTokens.transfer(ksm, amount.toChainData(), destinationKintsugi, 5000000000)
    return txn
  }

  const bridgeToKintAction = async (amount: FixedPointNumber) => {
    const txn = api.tx.xTokens.transfer(ksm, amount.toString(), destinationKintsugi, 5000000000)
    const details = await submitTx(txn, signer)
    return details
  }

  const bridgeToKusama = async (amount) => {
    const txn = api.tx.xTokens.transfer(ksm, amount, destinationKusama, 5000000000)
    const details = await submitTx(txn, signer)
    return details
  }

  const getKsmFree = async () => {
    const free = ((await api.query.tokens.accounts(address, ksm)) as any).free
    const reserved = ((await api.query.tokens.accounts(address, ksm)) as any).reserved
    const available = new FP(free.toString(), 1).sub(new FP(reserved.toString(), 1))
    return available
  }

  const getKintFree = async () => {
    const free = ((await api.query.tokens.accounts(address, kint)) as any).free.toString()
    const reserved = ((await api.query.tokens.accounts(address, kint)) as any).reserved.toString()
    const available = new FP(free, 1).sub(new FP(reserved, 1))
    return available
  }

  const swapKintForKsm = (amount: FixedPointNumber) => {
    const txn = api.tx.dex.swapWithExactSupply([kint, kusd, kar, ksm], amount.toString(), 0)
    return txn
  }

  const swapKintForKsmAction = async (amount: FixedPointNumber) => {
    const txn = api.tx.dex.swapWithExactSupply([kint, kusd, kar, ksm], amount.toString(), 0)
    const details = await submitTx(txn, signer)
    return details
  }

  const submitBatch = async (calls: any[]) => {
    const txn = api.tx.utility.batchAll(calls)
    const details = await submitTx(txn, signer)
    return details
  }

  return {
    api,
    printStats,
    getKarBalance,
    getKsmFree,
    getKsmKintPrice,
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
    bridgeToKint,
    bridgeToKusama,
    getKintFree,
    swapKintForKsm,
    submitBatch,
    getTotalDexShares,
  }
}
