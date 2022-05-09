import { setup } from '../utils/helpers'
const readline = require('node:readline/promises')
import { stdin as input, stdout as output } from 'node:process'

async function main() {
  const context = await setup()

  console.log('=============================')
  console.log(`⚡️ Connected to: ${context.blob.specName} v${context.blob.specVersion}`)
  console.log(`🔑 Signer address: ${context.address}`)
  console.log(`ℹ️  Current status: ${context.active ? 'OPEN 🔓' : 'CLOSED 🔒'}`)
  console.log(`❓ Permission: ${context.unbanned ? 'OPEN ✅' : 'BANNED ❌'}`)
  console.log(`🐤 Collateral: ${await context.getCollateral()} KSM`)
  console.log(`🕰  Outstanding issue requests: ${await context.getToBeIssued()} kBTC`)
  console.log(`💰 Issued: ${await context.getIssued()} kBTC`)
  console.log(`🤌  Collateral Ratio: ${await context.getRatio()}%`)
  console.log(`🌱 Mint Capacity Remaining: ${await context.getMintCapacity()} kBTC`)
  console.log(`💸 KINT Balance Free: ${await context.getKintFree()} KINT`)
  console.log('=============================')

  const rl = readline.createInterface({ input, output })
  const answer = await rl.question('Would you like to proceed with submitting a self-mint issue request? (yes/no) ')
  switch (answer) {
    case 'yes':
      const hash = await context.submitIssueRequest()
      console.log(`Batched TXNs in finalized block: ${hash}`)
      console.log('=============================')
      console.log(`Issue Request submitted to vault ${context.address}`)
      console.log(`Please now send ${await context.getToBeIssued()} kBTC`)
      console.log(
        'Pleaase visit web gui to see btc vault address to send to: https://kintsugi.interlay.io/transactions' 
      )
      break
    case 'no':
      console.log('Goodbye. 👋')
      break
    default:
      console.error(`⚠️ Invalid yes/no response entered: ${answer} \n Aborting.`)
      throw new Error('Invalid user answer')
  }
  rl.close()
}

main()
  .catch((err) => {
    console.error('Error: ', Object.entries(err as object), err)
  })
  .finally(() => {
    process.exit()
  })
