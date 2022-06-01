import { parseResponse } from '../utils/helpers'
import { printSuccess } from '../utils/fetch'
import { setupKintsugi } from '../utils/kintsugi'
var rl = require('readline-sync');

export async function mint() {
  const context = await setupKintsugi()
  await context.printStats()

  // const rl = readline.createInterface({ input, output })
  const answer1 = await rl.question('Would you like to proceed with submitting a self-mint issue request? (yes/no) ')
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

  const answer2 = await rl.question('What collateral ratio would you like to issue upto? (min/default: 261) ')
  let resp: any
  if (answer2 == '') {
    resp = await context.submitIssueRequest(261)
  } else {
    const percent = Number(answer2)
    if (percent < 261) {
      console.error(
        `⚠️ Entered collateral percent is invalid or unsafe. Please try again with a number higher than 261`
      )
      throw new Error('Invalid user input')
    }

    resp = await context.submitIssueRequest(Number(answer2))
  }

  console.log(`Batched TXNs in finalized block: ${resp.hash}`)
  await printSuccess('kintsugi', resp.hash)
  const { vaultBtcAddress, amount, events } = parseResponse(resp)
  console.log('Events posted in transaction:' + events)

  console.log('=============================')
  console.log(`📇 Issue Request submitted to vault ${context.address}`)
  console.log(`🔏 Destination vault address: ${vaultBtcAddress}`)
  console.log(`💳 Amount to send: ${(amount as number) / 10 ** 8} kBTC`)

}