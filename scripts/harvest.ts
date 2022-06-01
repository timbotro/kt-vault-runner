import { sleep } from '../utils/helpers'
import { setupKintsugi } from '../utils/kintsugi'
import { setupKarura } from '../utils/karura'
import { printSuccess } from '../utils/fetch'
import { FixedPointNumber as FP } from '@acala-network/sdk-core'
var rl = require('readline-sync');

export async function harvest() {
  const ktContext = await setupKintsugi()
  await ktContext.printStats()
  const karContext = await setupKarura()

  const kintHarvest = await ktContext.getKintPending()
  const ksmHarvest = Number(kintHarvest) * Number(await karContext.getKsmKintPrice())
  await karContext.printStats(kintHarvest, ksmHarvest)

  // const rl = readline.createInterface({ input, output })
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
  process.stdout.write('(1/4) Claiming and Bridging rewards....')
  try {
    let step1txns: any[] = []
    if (Number(kintHarvest) > 1) {
      const txn = ktContext.claimRewards()
      step1txns.push(txn)
    }
    const bridgeAmount = new FP(amt, 12)
    const txn = ktContext.bridgeToKarura(bridgeAmount)
    step1txns.push(txn)
    const hash = await ktContext.submitBatch(step1txns)
    await printSuccess('kintsugi', hash.hash)
  } catch (e) {
    console.error(e)
    throw new Error('error on step1')
  }
  await sleep(6000)
  const swapAmount = await karContext.getKintFree()
  process.stdout.write(
    `(2/4) Swapping ${swapAmount.div(new FP(10 ** 12)).toNumber(5)} KINT for KSM....`
  )
  try {
    const hash2 = await karContext.swapAllKintForKsm()
    await printSuccess('karura', hash2.hash)
  } catch (e) {
    console.error(e)
    throw new Error('error on step2')
  }

  const bridgeBack= await karContext.getKsmFree()
  process.stdout.write(
    `(3/4) Bridging back ${bridgeBack.div(new FP(10**12)).toNumber(5)} KSM....`
  )
  const hash3 = await karContext.bridgeAllKsmToKint()
  await printSuccess("karura", hash3.hash)
  
  await sleep(6000)
  const ksmAmountOnKt = await ktContext.getKsmFree()
  process.stdout.write(
    `(4/4) Depositing ${ksmAmountOnKt.div(new FP(10**12)).toNumber(5)} KSM Collateral back into vault...`
  )
  const hash5 = await ktContext.depositCollateral(ksmAmountOnKt)
  await printSuccess('kintsugi', hash5.hash)

  console.log(`✅  Collateral Ratio is now: ${await ktContext.getRatio()}%`)
  await rl.question('<< Action Complete. Press Enter to return to menu >>')
}