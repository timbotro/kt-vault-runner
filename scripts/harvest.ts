import { setup, parseResponse, karuraApi , kusamaApi} from '../utils/helpers'
const readline = require('node:readline/promises')
import { stdin as input, stdout as output } from 'node:process'
import Big from 'big.js'

async function main() {
  const ktContext = await setup()
  await ktContext.printStats()
  const karContext = await karuraApi()
//   const kusContext = await kusamaApi()
  await karContext.printStats()
  const kintHarvest = await ktContext.getKintPending()
  const ksmHarvest = Number(kintHarvest) * Number(await karContext.getKsmKintPrice())
  console.log(`Harvestable Amount: ${kintHarvest} KINT`)

  console.log((await karContext.getKintFree()).toString())

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

  // Claim
  await ktContext.claimRewards()
  const ktAmount = await ktContext.getKintFree()
  if (Number(ktAmount) < 1) {
      console.error(`Insufficient amount to bridge and convert, only ${ktAmount}KINT free`)
      throw new Error("Insufficient harvest")
  }
  // bridge to karura
  const bridgeAmount = new Big(Number(ktAmount) - 1).mul(new Big(Math.pow(10,12)))
  await karContext.bridgeFromKint(100)
  console.log(`Bridging ${bridgeAmount}`)
//   await karContext.bridgeFromKint(bridgeAmount)

  // swap to ksm
  await karContext.swapKintForKsm(await karContext.getKintFree())
  // bridge back to kint
  const ksmAmount = await karContext.getKsmFree()
  await karContext.bridgeToKint(ksmAmount)

  // deposit collateral
  const ksmAmount2 = await ktContext.getKsmFree()
  await ktContext.depositCollateral(ksmAmount2)

  rl.close()
}

main()
  .catch((err) => {
    console.error('Error: ', Object.entries(err as object), err)
  })
  .finally(() => {
    process.exit()
  })
