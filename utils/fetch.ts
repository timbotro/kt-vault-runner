const cgUri = 'https://api.coingecko.com/api/v3'
const karUri = 'https://api.polkawallet.io/price-server/'
var shortUrl = require('node-url-shortener')
import { FixedPointNumber as FP } from '@acala-network/sdk-core'

export const getCgPrice = async (asset: string) => {
  try {
    const resp = (await fetch(
      cgUri + `/simple/price?ids=${asset}&vs_currencies=usd`,
      { method: 'GET' }
    )) as any
    const json = await resp.json()
    return json[asset].usd.toFixed(2)
  } catch (e) {
    console.log('coingecko call failed with: ', e)
    return -1
  }
}

export const getKarStatsPrice = async (asset: string) => {
  try {
    const resp = (await fetch(karUri + `/?token=${asset}&from=market`, {
      method: 'GET',
    })) as any
    const json = await resp.json()
    return Number(json.data.price[0]).toFixed(2)
  } catch (e) {
    console.log('coingecko call failed with: ', e)
    return -1
  }
}

export const printSuccess = async (network: string, hash: string) => {
  const string = `https://${network}.subscan.io/block/${hash}`

  // let promise = new Promise(async (resolve, reject) => {
  //   try {
  //     shortUrl.short(string, function (err, url) {
  //       resolve(url)
  //     })
  //   } catch (e) {
  //     reject(e)
  //   }
  // })

  // await promise
  //   .then((message) => {
  //     console.log(`Done: ${message} ✅ `)
  //   })
  //   .catch((message) => {
  //     console.error('Cannot shorten URL link', message)
    // })

    console.log(`Done: ${string} ✅ `)
}

async function main() {
  const price = await getCgPrice('kintsugi')
  console.log(price)
  const num = new FP('10000000000000')
  const timbo = num.frac()
  console.log(num._getInner().toString())
}

// main()
