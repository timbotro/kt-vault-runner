import { sleep } from '../utils/helpers'
import { printSuccess } from '../utils/fetch'
const readline = require('node:readline/promises')
import { stdin as input, stdout as output } from 'node:process'
import { FixedPointNumber as FP } from '@acala-network/sdk-core'
import { kar, ksm } from '../static/tokens'
import { setupKintsugi } from '../utils/kintsugi'
import { setupKarura } from '../utils/karura'
var colors = require('colors')

async function main() {
  const ktContext = await setupKintsugi()
  await ktContext.printStats()
  const karContext = await setupKarura()

  // calculate dex shares
  const resp = await karContext.getStakedLpBalance()
  console.log('LP tokens owned: ', resp.toString())

  // calculate calculate value of dex shares (in kUSD and kBTC)
  const resp7 = await karContext.getMySharesValueView()
  console.log(`Total LP value: $${resp7}`)

  // calculate possible collateral values possible with current pools
  // work out how much ksm you can buy with staked amount
  const resp8 = await karContext.getMySharesInKsmView()
  console.log(`LP shares as collateral: ${resp8} KSM`)
  // work out what the collat ratio of that amount equates to

  // TODO : Work out how much collateral you can remove dynamically
  const resp9 = await karContext.getMySharesInKsm()
  const ratio = await ktContext.getCollateralRatio(resp9)
  console.log(`Max LP/Collateral rebalancing: ` + colors.red(`-0% `) + ' / ' + colors.green(`+${ratio.toNumber(2)}% `))

  ////// Execution

  const rl = readline.createInterface({ input, output })
  const answer1 = await rl.question('Would you like to proceed with rebalancing the vault with staked LP? (yes/no) ')
  switch (answer1) {
    case 'yes':
      break
    case 'no':
      console.log('Goodbye. 👋')
      return
      break
    default:
      console.error(`⚠️ Invalid yes/no response entered: ${answer1} \n Aborting.`)
      throw new Error('Invalid user answer')
  }

  // TODO : Account for negative rebalances - i.e. withdraw and turn into LP
  const answer2 = await rl.question(
    `What ratio would you like to rebalance to? (` +
      colors.red('-0%') +
      ` - ` +
      colors.green(ratio.toNumber(1) + '%') +
      `) `
  )
  const number = Number(answer2)
  if (!number) {
    console.error('Answer given is not a valid decimal number')
    throw new Error('Invalid ratio input')
  }

  if (number < 0) {
    console.error('Ratio requested is too low for free collateral available')
    throw new Error('Ratio too low')
  }

  if (number > ratio.toNumber()) {
    console.error('Ratio requested is too high for LP available')
    throw new Error('Ratio too high')
  }
  // work out how many shares to unstake: 1) convert ratio into KSM equivalent
  // 2) convert ksm equivalent
  // 3) unstake and withdraw those shares
  // 4) convert into ksm
  // 5) bridge ksm
  // 6) deposit ksm as collateral
  // 7) print out new collateral % you are
}

main()
  .catch((err) => {
    console.error('Error: ', Object.entries(err as object), err)
  })
  .finally(() => {
    process.exit()
  })
