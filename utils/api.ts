import { ApiPromise, WsProvider } from '@polkadot/api'
import { ApiDecoration, ApiOptions } from '@polkadot/api/types'
import { options } from '@acala-network/api'
import { Hash } from '@polkadot/types/interfaces'
import { performance } from 'perf_hooks'
import { start } from 'repl'
import { deflate } from 'zlib'
import { kStringMaxLength } from 'buffer'

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

export async function getKarLatencies() {
  let latencies: any[] = []
  let promises = []

  for (let i = 0; i < karuraWss.length; i++) {
    const promise = new Promise(async (resolve, reject) => {
      const provider = chooseWss('Karura', i)
      const startTime = performance.now()
      const api = await ApiPromise.create({ provider })
      switch (true) {
        case api.isConnected: {
          const duration = performance.now() - startTime
          const row = {
            Network: 'Karura',
            WSS: karuraWss[i],
            'Latency (ms)': Number(duration.toFixed(0)),
            Selected: false,
          }
          latencies.push(row)
          api.disconnect()
          resolve(duration)
          break
        }
        case performance.now() == startTime + Number(5000): {
          console.error('Timed out')
          reject(5000)
          break
        }
        default:
          throw new Error('RPC measure error')
      }
    })
    //@ts-ignore
    promises.push(promise)
  }

  await Promise.all(promises).then(() => {
    console.log('Karura Benchmark Complete')
  })
  return latencies
}

export async function getKintLatencies() {
  const latencies: any[] = []

  for (let i = 0; i < kintsugiWss.length; i++) {
    const provider = chooseWss('Kintsugi', i, false)
    const latency = await kintApi.measure({ provider: provider })
    const row = {
      Network: 'Kintsugi',
      WSS: kintsugiWss[i],
      'Latency (ms)': Number(latency),
      Selected: false,
    }
    latencies.push(row)
  }

  return latencies
}

export async function getKarApi(endpoint: number = 0) {
  if (!karApi) {
    const provider = chooseWss('Karura', 0)
    karApi = await new SubstrateApi().init({
      provider: provider,
    })
  }

  return karApi.api
}

export async function getKintApi() {
  if (!kintApi) {
    const provider = chooseWss('Kintsugi', 0)
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
