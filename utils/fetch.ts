const fetch = require('node-fetch')
const cgUri = 'https://api.coingecko.com/api/v3'

export const getCgPrice = async (asset: string) => {
  try {
    const resp = await fetch(cgUri + `/simple/price?ids=${asset}&vs_currencies=usd`, { method: 'GET' })
    const json = await resp.json()
    return json[asset].usd
  } catch (e) {
    console.log("coingecko call failed with: ", e)
    return -1
  }
}

async function main() {
  const price = await getCgPrice('kintsugi')
  console.log(price)
}

// main()
