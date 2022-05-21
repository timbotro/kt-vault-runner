const fetch = require('node-fetch')
const cgUri = 'https://api.coingecko.com/api/v3'
var shortUrl = require('node-url-shortener')

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

  printSuccess('kintsugi', '0x90ceff13e02b60349426aea30118c5a1282b102a8a6fd0fef054d998558ba78c')
  // console.log(link)
}

// main()
