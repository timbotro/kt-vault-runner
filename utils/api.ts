import { ApiPromise, WsProvider } from '@polkadot/api'
import { ApiDecoration, ApiOptions } from '@polkadot/api/types'
import { options } from '@acala-network/api'
import { Hash } from '@polkadot/types/interfaces'
import { performance } from 'perf_hooks'

type Chains = 'Karura' | 'Kintsugi'

const kintsugiWss = [
  'wss://api-kusama.interlay.io/parachain',
  'wss://kintsugi.api.onfinality.io/public-ws',
  'wss://kintsugi-rpc.dwellir.com',
]

const karuraWss = [
  'wss://karura-rpc-0.aca-api.network/ws',
  'wss://karura-rpc-1.aca-api.network/ws',
  'wss://karura-rpc-2.aca-api.network/ws',
  'wss://karura-rpc-3.aca-api.network/ws',
  'wss://karura.polkawallet.io',
  'wss://karura.api.onfinality.io/public-ws',
  'wss://karura-rpc.dwellir.com',
]

export class SubstrateApi {
  private _api?: ApiPromise

  public async init(options: ApiOptions) {
    await this.connect(options)
    await this._api?.isReadyOrError
    return this
  }

  private async connect(options: ApiOptions) {
    this._api = await ApiPromise.create(options)
    this._api.on('error', async (e) => {
      console.log(`Api error: ${JSON.stringify(e)}, reconnecting....`)
      await this.connect(options)
    })
  }

  public async measure(options: ApiOptions) {
    const startTime = performance.now()
    await this.connect(options)
    await this._api?.isReady
    const endTime = performance.now()
    const duration = endTime - startTime
    await this._api?.disconnect()

    return duration.toFixed(0)
  }

  public async switch(prov: number, network: Chains) {
    await this._api?.disconnect()
    const provider = chooseWss(network, prov)
    await this.connect({ provider })
    await this._api?.isReady
  }

  public get api() {
    return this._api
  }
}

let karApi: SubstrateApi
let kintApi: SubstrateApi

export async function switchWss(prov: number, network: Chains) {
  switch (network) {
    case 'Karura':
      await karApi.switch(prov, network)
      break
    case 'Kintsugi':
      await kintApi.switch(prov, network)
      break
    default:
      throw new Error('Unrecognised network')
  }
}

export async function getLatencies(network: Chains) {
  let latencies: any[] = []
  let promises = []
  let wssList
  switch (network) {
    case 'Karura':
      wssList = karuraWss
      break
    case 'Kintsugi':
      wssList = kintsugiWss
      break
    default:
      throw new Error('Unrecognised')
  }

  for (let i = 0; i < wssList.length; i++) {
    const promise = new Promise(async (resolve, reject) => {
      const startTime = performance.now()
      const provider = new WsProvider(
        wssList[i]
      )

      provider.on('connected', async () => {
        const api = await ApiPromise.create({ provider })
        const duration = performance.now() - startTime
        const row = {
          Network: network,
          WSS: wssList[i],
          'Latency (ms)': Number(duration.toFixed(0)),
          Selected: false,
        }
        latencies.push(row)
        await api.disconnect()
        resolve(true)
      })

      provider.on('error', async () => {
        console.error(`Error connecting to ${wssList[i]}`)
        const row = {
          Network: network,
          WSS: wssList[i],
          'Latency (ms)': Number(9999),
          Selected: false,
        }
        latencies.push(row)
        await provider.disconnect()
        reject(false)
      })
    })
    //@ts-ignore
    promises.push(promise)
  }

  await Promise.allSettled(promises)
    .then(() => {
      console.log(`${network} Benchmark Complete`)
    })
    .catch(() => {
      console.error('One of the RPCs have failed')
    })
  return latencies
}

// export async function getKarLatencies() {
//   let latencies: any[] = []
//   let promises = []

//   for (let i = 0; i < karuraWss.length; i++) {
//     const promise = new Promise(async (resolve, reject) => {
//       const startTime = performance.now()
//       // const provider = chooseWss('Karura', i)
//       const provider = new WsProvider(
//         karuraWss[i],
//         undefined,
//         undefined,
//         undefined
//       )

//       provider.on('connected', async () => {
//         const api = await ApiPromise.create({ provider })
//         const duration = performance.now() - startTime
//         const row = {
//           Network: 'Karura',
//           WSS: karuraWss[i],
//           'Latency (ms)': Number(duration.toFixed(0)),
//           Selected: false,
//         }
//         latencies.push(row)
//         await api.disconnect()
//         resolve(true)
//       })

//       provider.on('error', async () => {
//         console.error(`Error connecting to ${karuraWss[i]}`)
//         const row = {
//           Network: 'Karura',
//           WSS: karuraWss[i],
//           'Latency (ms)': Number(9999),
//           Selected: false,
//         }
//         latencies.push(row)
//         await provider.disconnect()
//         reject(false)
//       })
//     })
//     //@ts-ignore
//     promises.push(promise)
//   }

//   await Promise.any(promises)
//     .then(() => {
//       console.log('Karura Benchmark Complete')
//     })
//     .catch(() => {
//       console.error('One of the RPCs have failed')
//     })
//   return latencies
// }

// export async function getKintLatencies() {
//   let latencies: any[] = []
//   let promises = []

//   for (let i = 0; i < kintsugiWss.length; i++) {
//     const promise = new Promise(async (resolve, reject) => {
//       const startTime = performance.now()
//       const provider = new WsProvider(kintsugiWss[i])

//       provider.on('connected', async () => {
//         const api = await ApiPromise.create({ provider })
//         const duration = performance.now() - startTime
//         const row = {
//           Network: 'Kintsugi',
//           WSS: kintsugiWss[i],
//           'Latency (ms)': Number(duration.toFixed(0)),
//           Selected: false,
//         }
//         latencies.push(row)
//         await api.disconnect()
//         resolve(true)
//       })

//       provider.on('error', async () => {
//         console.error(`Error connecting to ${kintsugiWss[i]}`)
//         const row = {
//           Network: 'Kintsugi',
//           WSS: kintsugiWss[i],
//           'Latency (ms)': Number(9999),
//           Selected: false,
//         }
//         latencies.push(row)
//         await provider.disconnect()
//         reject(false)
//       })
//     })
//     //@ts-ignore
//     promises.push(promise)
//   }

//   await Promise.any(promises)
//     .then(() => {
//       console.log('Kintsugi Benchmark Complete')
//     })
//     .catch(() => {
//       console.error('One of the RPCs have failed')
//     })
//   return latencies
// }

export async function getKarApi(endpoint: number = 0) {
  if (!karApi) {
    const provider = chooseWss('Karura', endpoint)
    karApi = await new SubstrateApi().init({
      provider: provider,
    })
  }

  return karApi.api
}

export async function getKintApi(endpoint: number = 0) {
  if (!kintApi) {
    const provider = chooseWss('Kintsugi', endpoint)
    kintApi = await new SubstrateApi().init({
      provider: provider,
    })
  }

  return kintApi.api
}

function chooseWss(
  network: Chains,
  number: number = 0,
  retry: false | number = 5000
) {
  switch (network) {
    case 'Karura':
      return new WsProvider(karuraWss[number])
    case 'Kintsugi':
      return new WsProvider(kintsugiWss[number])
    default:
      throw new Error(`Invalid network ${network}`)
  }
}
