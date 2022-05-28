import { setup, karuraApi, sleep } from '../utils/helpers'
import { printSuccess } from '../utils/fetch'
const readline = require('node:readline/promises')
import { stdin as input, stdout as output } from 'node:process'
import { FixedPointNumber as FP } from '@acala-network/sdk-core'
import Big from 'big.js'
import { kar, ksm } from '../static/tokens'
import { appendFile } from 'node:fs'

async function main() {
  const ktContext = await setup()
  await ktContext.printStats()
  const karContext = await karuraApi()

// calculate dex shares
const resp = await karContext.getStakedLpBalance()
console.log(resp.toNumber())

// calculate price of dex shares
// calculate calculate value of dex shares (in kUSD and kBTC)
// calculate possible collateral values possible with current pools
  

}

main()
  .catch((err) => {
    console.error('Error: ', Object.entries(err as object), err)
  })
  .finally(() => {
    process.exit()
  })
