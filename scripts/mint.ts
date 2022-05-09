import { setup } from '../utils/helpers'
const readline = require('node:readline/promises')
import { stdin as input, stdout as output } from 'node:process'

async function main() {
  const context = await setup()

  console.log('=============================')
  console.log(`⚡️ Connected to: ${context.blob.specName} v${context.blob.specVersion}`)
  console.log(`🔑 Signer key: ${context.address}`)
  console.log(`ℹ️  Current status: ${context.active ? 'OPEN 🔓' : 'CLOSED 🔒'}`)
  console.log(`❓ Permission: ${context.unbanned ? 'OPEN ✅' : 'BANNED ❌'}`)
  console.log(`🐤 Collateral: ${await context.getCollateral()} KSM`)
  // take into account any outstanding issues
  console.log(`💰 Issued: ${context.getIssued()} kBTC`)
  console.log(`🤌  Collateral Ratio: ${await context.getRatio()}%`)
  console.log(`🌱 Mint Capacity Remaining: ${await context.getMintCapacity()} kBTC`)
  console.log('=============================')

  const rl = readline.createInterface({ input, output })
  const answer = await rl.question('Would you like to proceed with submitting a self-mint issue request? (yes/no) ')
  switch (answer) {
    case 'yes':
      console.log('Yes has been typed')
      const hash = await context.submitIssueRequest()
      console.log(`Issue request has successfully been submitted with hash: ${hash}`)
      //print the amount that needs to be sent
      //print the address that it needs to be sent to
      break
    case 'no':
      console.log('Goodbye. 👋')
      break
    default:
      console.error(`⚠️ Invalid yes/no response entered: ${answer} \n Aborting.`)
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
