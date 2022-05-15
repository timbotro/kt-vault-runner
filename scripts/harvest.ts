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
  console.log(`Harvestable Amount: ${kintHarvest} KINT`)
  console.log("kar kint free: ", (await karContext.getKintFree()).toString())
  const rl = readline.createInterface({ input, output })
  const answer1 = await rl.question(
    `Would you like to proceed with harvesting and depositing for ${ksmHarvest.toFixed(2)} KSM? (yes/no) `
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
  console.log('=============================')
  process.stdout.write('(1/5) Claiming rewards....')
  await ktContext.claimRewards()
  process.stdout.write('Done. ✅\n')

  const ktAmount = await ktContext.getKintFree()
  if (Number(ktAmount) < 1) {
    console.error(`Insufficient amount to bridge and convert, only ${ktAmount}KINT free`)
    throw new Error('Insufficient harvest')
  }

  process.stdout.write('(2/5) Bridging to Karura...')
  const bridgeAmount = new Big(Number(ktAmount) - 1).mul(new Big(Math.pow(10, 12)))
  //   await karContext.bridgeFromKint(100)
  process.stdout.write(`Bridging ${bridgeAmount}`)
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
