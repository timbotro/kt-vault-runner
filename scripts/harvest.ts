import { setup, karuraApi, sleep } from '../utils/helpers'
import { printSuccess } from '../utils/fetch'
const readline = require('node:readline/promises')
import { stdin as input, stdout as output } from 'node:process'
import { FixedPointNumber as FP } from '@acala-network/sdk-core'
import Big from 'big.js'
import { kar, ksm } from '../static/tokens'

async function main() {
  const ktContext = await setup()
  await ktContext.printStats()
  const karContext = await karuraApi()

  const kintHarvest = await ktContext.getKintPending()
  const ksmHarvest = Number(kintHarvest) * Number(await karContext.getKsmKintPrice())
  await karContext.printStats(kintHarvest, ksmHarvest)

  const rl = readline.createInterface({ input, output })
  const answer1 = await rl.question(
    `Would you like to proceed with harvesting, bridging, swapping and depositing? (yes/no) `
  )
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

  const ktAmount = await ktContext.getKintFree()
  if (Number(kintHarvest) + Number(ktAmount) < 1) {
    console.error(`Insufficient amount to bridge and convert, only ${kintHarvest + ktAmount} KINT free`)
    throw new Error('Insufficient harvest')
  }
  const max = (Number(kintHarvest) + Number(ktAmount) - 1).toFixed(2)
  const answer2 = await rl.question(
    `How much KINT would you like to harvest and convert to KSM? (min:1 | max: ${max}) `
  )
  const amt = Number(answer2)
  if (amt < 1) return console.error('Harvest amount entered too small')
  if (amt > Number(max)) return console.error('Harvest amount exceeds maximum')

  console.log('=============================')
  process.stdout.write('(1/3) Claiming and Bridging rewards....')
  let step1txns: any[] = []
  if (Number(kintHarvest) > 0) {
    const txn = ktContext.claimRewards()
    step1txns.push(txn)
  }

  if ((await ktContext.getKintFree()) >= amt) {
    const bridgeAmount = new FP(amt, 12)
    const txn = ktContext.bridgeToKarura(bridgeAmount)
    step1txns.push(txn)
    const hash = await ktContext.submitBatch(step1txns)
    await printSuccess('kintsugi', hash.hash)
  } else {
    console.error('Unexpected balance values, aborting....')
    throw new Error('Free kint < requested amount')
  }

  await sleep(6000) // Wait one relay chain block
  const swapAmount = await karContext.getKintFree()
  process.stdout.write(
    `(2/3) Swapping and bridging back ${swapAmount.div(new FP(1000000000000, 12)).toString(2)} KINT for KSM....`
  )
  let step2Txns: any[] = []
  const { kintPrice, ksmPrice } = await karContext.getDexPrices()

  try {
    step2Txns.push(karContext.swapKintForKsm(swapAmount))
    const safetyFactor = new FP(0.0995)
    const result = swapAmount.mul(kintPrice).div(ksmPrice).mul(safetyFactor)
    step2Txns.push(karContext.bridgeToKint(result))
    const hash = await karContext.submitBatch(step2Txns)
    await printSuccess('karura', hash.hash)
  } catch (e) {
    console.error(e)
    throw new Error('error on step2')
  }

  await sleep(6000) // Wait one relay chain block
  const ksmAmountOnKt = await ktContext.getKsmFree()
  process.stdout.write(`(3/3) Depositing ${(ksmAmountOnKt.div(new FP(1000000000000,12))).toString(5)} KSM Collateral back into vault...`)
  const hash5 = await ktContext.depositCollateral(ksmAmountOnKt)
  await printSuccess('kintsugi', hash5.hash)

  rl.close()
}

main()
  .catch((err) => {
    console.error('Error: ', Object.entries(err as object), err)
  })
  .finally(() => {
    process.exit()
  })
