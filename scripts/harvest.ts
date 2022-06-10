import { sleep, parseSwappedResult, waitForBalChange } from '../utils/helpers'
import { setupKintsugi } from '../utils/kintsugi'
import { setupKarura } from '../utils/karura'
import { printSuccess } from '../utils/fetch'
import { FixedPointNumber as FP } from '@acala-network/sdk-core'
import { confirmMessage, harvestQ1, harvestQ2 } from '../utils/inquirer'

export async function harvest() {
  const ktContext = await setupKintsugi()
  await ktContext.printStats()
  const karContext = await setupKarura()

  const kintHarvest = await ktContext.getKintPending()
  const ksmHarvest =
    Number(kintHarvest) * Number(await karContext.getKsmKintPrice())
  await karContext.printStats(kintHarvest, ksmHarvest)

  const answer1 = await harvestQ1()
  if (!answer1.harvestIntro) {
    console.log('Goodbye. 👋')
    return
  }

  const ktAmount = await ktContext.getKintFree()
  if (Number(kintHarvest) + Number(ktAmount) < 1) {
    console.error(
      `Insufficient amount to bridge and convert, only ${
        kintHarvest + ktAmount
      } KINT free`
    )
    throw new Error('Insufficient harvest')
  }
  const max = Number(kintHarvest) + Number(ktAmount) - 1
  const answer2 = await harvestQ2(max)

  console.log('=============================')
  process.stdout.write('(1/4) Claiming and Bridging rewards....')
  const initialKintBal = await karContext.getKintFree()
  try {
    let step1txns: any[] = []
    if (Number(kintHarvest) > 1) {
      const txn = ktContext.claimRewards()
      step1txns.push(txn)
    }
    const bridgeAmount = new FP(answer2.harvestInput, 12)
    const txn = ktContext.bridgeToKarura(bridgeAmount)
    step1txns.push(txn)
    const hash = await ktContext.submitBatch(step1txns)
    await printSuccess('kintsugi', hash.hash)
  } catch (e) {
    console.error(e)
    throw new Error('error on step1')
  }
  
  const diff1 = await waitForBalChange(initialKintBal, karContext.getKintFree)
  process.stdout.write(
    `(2/4) Swapping ${diff1.div(new FP(10 ** 12)).toNumber(5)} KINT for KSM....`
  )
  const hash2 = await karContext.swapKintForKsmTxn(diff1)
  await printSuccess('karura', hash2.hash)
  const { amount } = parseSwappedResult(hash2)

  process.stdout.write(
    `(3/4) Bridging back ${amount
      .div(new FP(10 ** 12))
      .toNumber(5)} KSM....`
  )

  const initialKsmBal = await ktContext.getKsmFree()
  const hash3 = await karContext.bridgeKsmToKint(amount)
  await printSuccess('karura', hash3.hash)
  const diff2 = await waitForBalChange(initialKsmBal, ktContext.getKsmFree)

  process.stdout.write(
    `(4/4) Depositing ${diff2
      .div(new FP(10 ** 12))
      .toNumber(5)} KSM Collateral back into vault...`
  )
  const hash5 = await ktContext.depositCollateral(diff2)
  await printSuccess('kintsugi', hash5.hash)

  console.log(`✅  Collateral Ratio is now: ${await ktContext.getRatio()}%`)
  await confirmMessage()
}
