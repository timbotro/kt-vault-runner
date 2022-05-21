const cgUri = 'https://api.coingecko.com/api/v3'
var shortUrl = require('node-url-shortener')
var fetch = require('node-fetch')
import { FixedPointNumber as FP } from '@acala-network/sdk-core'
import { nToBigInt } from '@polkadot/util'

export const getCgPrice = async (asset: string) => {
  try {
    const resp = await fetch(cgUri + `/simple/price?ids=${asset}&vs_currencies=usd`, { method: 'GET' })
    const json = await resp.json()
    return json[asset].usd
  } catch (e) {
    console.log('coingecko call failed with: ', e)
    return -1
  }
}

export const printSuccess = async (network: string, hash: string) => {
  const string = `https://${network}.subscan.io/block/${hash}`

  let promise = new Promise(async (resolve, reject) => {
    try {
      shortUrl.short(string, function (err, url) {
        resolve(url)
      })
    } catch (e) {
      reject(e)
    }
  })

  await promise
  .then((message) => {
    console.log(`Done: ${message} ✅ `)
  })
  .catch((message) => {
    console.error("Cannot shorten URL link", message)
  })

}

async function main() {
  const price = await getCgPrice('kintsugi')
  console.log(price)
const num = new FP("10000000000000")
const timbo  = num.frac()
console.log(num._getInner().toString())
}

// main()
