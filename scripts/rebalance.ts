import { sleep } from '../utils/helpers'
import { printSuccess } from '../utils/fetch'
import { FixedPointNumber as FP } from '@acala-network/sdk-core'
import { kar, ksm } from '../static/tokens'
import { setupKintsugi } from '../utils/kintsugi'
import { setupKarura } from '../utils/karura'
var colors = require('colors')
var rl = require('readline-sync')

export async function rebalance() {
  const ktContext = await setupKintsugi()
  await ktContext.printStats()
  const karContext = await setupKarura()

  const resp = await karContext.getStakedLpBalance()
  console.log('🏦 LP tokens owned: ', resp.toString())
  const TotalLPValue = await karContext.getMySharesValueView()
  console.log(`💵 Total LP value: $${TotalLPValue}`)
  const resp8 = await karContext.getMySharesInKsmView()
  console.log(`🧮 LP shares as collateral: ${resp8} KSM`)
  const resp9 = await karContext.getMySharesInKsm()
  const ratio = await ktContext.getCollateralRatio(resp9)
  const ratioAvailable = Number(await ktContext.getRatio()) - 260
  const negRatio = ratioAvailable < 0 ? 0 : (ratioAvailable * -1).toFixed(2)

  console.log(
    `⚖️  Max LP/Collateral rebalancing: ` +
      colors.red(`${negRatio}% `) +
      ' / ' +
      colors.green(`+${ratio.toNumber(2)}% `)
  )

  const answer1 = await rl.question('❓ Would you like to proceed with rebalancing the vault with staked LP? (yes/no) ')
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

  const answer2 = await rl.question(
    `❓ What collateral ratio would you like to rebalance? (` +
      colors.red(`${negRatio}%`) +
      ` <-> ` +
      colors.green(`+${ratio.toNumber(2)}%`) +
      `) `
  )
  const number = Number(answer2)
  if (!number) {
    console.error('Answer given is not a valid decimal number')
    throw new Error('Invalid ratio input')
  }

  if (number == 0) {
    console.error('0% Ratio means no action needed')
    throw new Error('Ratio is zero')
  }

  if (number < Number(negRatio)) {
    console.error('Ratio requested is too low for free collateral available')
    throw new Error('Ratio too low')
  }

  if (number > ratio.toNumber()) {
    console.error('Ratio requested is too high for LP available')
    throw new Error('Ratio too high')
  }
  console.log('=============================')

  if (number > 0) {
    const ksmAmount = await ktContext.getCollateralFromRatio(number)
    const ksmPrice = await karContext.getKsmPrice()
    const ksmValue = ksmAmount.mul(ksmPrice)
    const shares = (await karContext.getStakedLp()).balance
    const totalVal = await karContext.getMySharesValue()
    const valPerShare = totalVal.div(shares)
    const sharesToWithdraw = new FP(ksmValue.toNumber(0), 0).div(valPerShare)

    process.stdout.write(
      `(1/4) Withdrawing ${sharesToWithdraw.div(new FP(10 ** 12)).toNumber(2)} staked LP shares ....`
    )
    const hash1 = await karContext.withdrawLpShares(sharesToWithdraw)
    await printSuccess('kintsugi', hash1.hash)

    process.stdout.write(`(2/4) Swapping withdrawn shares for KSM....`)
    const hash2 = await karContext.swapAllForKsm()
    await printSuccess('karura', hash2.hash)

    const bridgeBack = await karContext.getKsmFree()
    process.stdout.write(`(3/4) Bridging back ${bridgeBack.div(new FP(10 ** 12)).toNumber(5)} KSM....`)
    const hash3 = await karContext.bridgeAllKsmToKint()
    await printSuccess('karura', hash3.hash)

    await sleep(6000)
    const ksmAmountOnKt = await ktContext.getKsmFree()
    process.stdout.write(
      `(4/4) Depositing ${ksmAmountOnKt.div(new FP(10 ** 12)).toNumber(5)} KSM Collateral back into vault...`
    )
    const hash5 = await ktContext.depositCollateral(ksmAmountOnKt)
    await printSuccess('kintsugi', hash5.hash)
  } else {
    const hash1 = await ktContext.withdrawCollateralAndBridge(number)
    await printSuccess('kintsugi', hash1.hash)

    const hash2 = await karContext.swapKsmForDexShare()
    await printSuccess('karura', hash2.hash)

    const hash3 = await karContext.depositLpShares()
    await printSuccess('karura', hash3.hash)
  }

  console.log('=============================')
  console.log(`✅  Collateral Ratio is now: ${await ktContext.getRatio()}%`)
  await rl.question('<< Action Complete. Press Enter to return to menu >>')
}
