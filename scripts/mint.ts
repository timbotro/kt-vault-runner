import { setup } from '../utils/helpers'

async function main() {
  const context = await setup()

  console.log('=============================')
  console.log(`⚡️ Connected to: ${context.blob.specName} v${context.blob.specVersion}`)
  console.log(`🔑 Signer key: ${context.address}`)
  console.log(`ℹ️ Current status: ${context.active? "OPEN 🔓" : "CLOSED 🔒"  }`)
  console.log(`❓ Permission: ${context.unbanned? "OPEN ✅" : "BANNED ❌"  }`)
  console.log(`🐤 KSM Collateral: ${context.ksmCollateral / (10 ** 12)}`)
  console.log(`💰 kBTC Issued: ${context.kbtcIssued / (10 ** 8)}`)
  console.log(`🤌 Collateral Ratio: ${context.kbtcIssued / (10 ** 8)}`)

  // console.log(vaultInfo)
}

main()
  .catch((err) => {
    console.error('Error: ', Object.entries(err as object), err)
  })
  .finally(() => {
    process.exit()
  })
