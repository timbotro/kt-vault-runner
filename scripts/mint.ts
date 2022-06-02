import { parseResponse } from '../utils/helpers'
import { printSuccess } from '../utils/fetch'
import { setupKintsugi } from '../utils/kintsugi'
import { mintQ1, mintQ3, confirmMessage, mintQ2 } from '../utils/inquirer'
var rl = require('readline-sync')

export async function mint() {
  const context = await setupKintsugi()
  await context.printStats()

  const answer1 = await mintQ1()
  if (!answer1.MintIntro) {
    console.log('Goodbye. 👋')
    return
  }
  const answer2 = await mintQ2(await context.getRatio())
  const resp = await context.submitIssueRequest(answer2.mintInput)

  console.log(`Batched TXNs in finalized block: ${resp.hash}`)
  await printSuccess('kintsugi', resp.hash)
  const { vaultBtcAddress, amount, events } = parseResponse(resp)
  console.log('Events posted in transaction:' + events)

  console.log('=============================')
  console.log(`📇 Issue Request submitted to vault ${context.address}`)
  console.log(`🔏 Destination vault address: ${vaultBtcAddress}`)
  console.log(`💳 Amount to send: ${(amount as number) / 10 ** 8} kBTC`)

  while (true) {
    const answer = await mintQ3()
    if (answer.MintNag) break
  }

  await confirmMessage()
}
