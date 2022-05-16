import { setup, karuraApi } from '../utils/helpers'
const readline = require('node:readline/promises')
import { stdin as input, stdout as output } from 'node:process'
import Big from 'big.js'

async function main() {
  const ktContext = await setup()
  await ktContext.printStats()
  const karContext = await karuraApi()
  await karContext.printStats()
  const kintHarvest = await ktContext.getKintPending()
  const ksmHarvest = Number(kintHarvest) * Number(await karContext.getKsmKintPrice())
  console.log(`🌾 Harvestable Amount: ${kintHarvest} KINT / ${ksmHarvest.toFixed(2)} KSM`)
  console.log('=============================')

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
  process.stdout.write('(1/5) Claiming rewards....')
  Number(kintHarvest) < 1 ? process.stdout.write('nothing to harvest...') : await ktContext.claimRewards()

  process.stdout.write('Done. ✅\n')

  process.stdout.write('(2/5) Bridging to Karura...')
  const bridgeAmount = new Big(amt).mul(new Big(Math.pow(10, 12)))
  await ktContext.bridgeToKarura(bridgeAmount.toFixed(0))
  process.stdout.write('Done. ✅\n')

  process.stdout.write('(3/5) Swapping KINT for KSM....')
  await karContext.swapKintForKsm((await karContext.getKintFree()).toString())
  process.stdout.write('Done. ✅\n')

  process.stdout.write('(4/5) Bridging back to Kintsugi...')
  const ksmAmount = await karContext.getKsmFree()
  await karContext.bridgeToKint(ksmAmount.toString())
  process.stdout.write('Done. ✅\n')

  process.stdout.write('(5/5) Depositing Collateral back into vault...')
  const ksmAmount2 = await ktContext.getKsmFree()
  await ktContext.depositCollateral(ksmAmount2.toString())
  process.stdout.write('Done. ✅\n')

  rl.close()
}

main()
  .catch((err) => {
    console.error('Error: ', Object.entries(err as object), err)
  })
  .finally(() => {
    process.exit()
  })
