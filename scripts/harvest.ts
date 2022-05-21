import { setup, karuraApi } from '../utils/helpers'
import { printSuccess } from '../utils/fetch'
const readline = require('node:readline/promises')
import { stdin as input, stdout as output } from 'node:process'
import Big from 'big.js'

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
  process.stdout.write('(1/5) Claiming rewards....')

  if (Number(kintHarvest) < 1) {
    process.stdout.write('nothing to harvest. Done ✅\n')
  } else {
    const hash = await ktContext.claimRewards()
    await printSuccess('kintsugi', hash.hash)
  }

  process.stdout.write('(2/5) Bridging to Karura...')
  const bridgeAmount = new Big(amt).mul(new Big(Math.pow(10, 12)))
  const hash2 = await ktContext.bridgeToKarura(bridgeAmount.toFixed(0))
  await printSuccess('kintsugi', hash2.hash)

  process.stdout.write('(3/5) Swapping KINT for KSM....')
  const hash3 = await karContext.swapKintForKsm((await karContext.getKintFree()).toString())
  await printSuccess('karura', hash3.hash)

  process.stdout.write('(4/5) Bridging back to Kintsugi...')
  const ksmAmount = await karContext.getKsmFree()
  const hash4 = await karContext.bridgeToKint(ksmAmount.toString())
  await printSuccess('karura', hash4.hash)

  process.stdout.write('(5/5) Depositing Collateral back into vault...')
  const ksmAmount2 = await ktContext.getKsmFree()
  const hash5 = await ktContext.depositCollateral(ksmAmount2.toString())
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
