import 'dotenv/config'
import { ApiPromise, Keyring } from '@polkadot/api'
import { payments } from 'bitcoinjs-lib'
import { harvest } from '../scripts/harvest'
import { mint } from '../scripts/mint'
import { rebalance } from '../scripts/rebalance'
import {
  FixedPointNumber as FP,
  isLiquidCrowdloanName,
} from '@acala-network/sdk-core'
import { getCgPrice, getKarStatsPrice } from '../utils/fetch'
var fs = require('sudo-fs-promise')
var colors = require('colors')

export const setupKeys = async (api: ApiPromise) => {
  let signer
  const keyring = new Keyring({ type: 'sr25519' })
  const ss58Prefix = api.consts.system.ss58Prefix as unknown

  await fs
    .readFile(process.env.SEED_PATH)
    .then(
      (data: { toString: () => string }) =>
        (signer = keyring.addFromMnemonic(data.toString().replace('\n', '')))
    )
    .catch((err: any) => {
      console.error('err:', err)
      throw new Error('Problem reading seed phrase file')
    })

  return {
    ss58Prefix,
    keyring,
    signer,
    address: keyring.encodeAddress(signer.publicKey, ss58Prefix as number),
  }
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const parseSwappedResult = (resp) => {
  let issueJson
  let events = ''
  resp.events.forEach(({ phase, event: { data, method, section } }) => {
    events = events.concat(`\n\t${phase}: ${section}.${method}::${data}`)
    if (section == 'dex' && method == 'Swap') issueJson = data
  })
  events.concat('\n')
  const liqChanges = issueJson[2]
  const amt = liqChanges[liqChanges.length - 1]
  const amount = new FP(amt.toString())

  return { amount, events }
}

export const parseSpecificResult = (resp, module, call) => {
  let events = ''
  let results: any[] = []
  resp.events.forEach(({ phase, event: { data, method, section } }) => {
    events = events.concat(`\n\t${phase}: ${section}.${method}::${data}`)
    if (section == module && method == call) results.push(data)
  })
  events.concat('\n')

  return { results, events }
}

export const parseResponse = (resp) => {
  let issueJson
  let events = ''
  resp.events.forEach(({ phase, event: { data, method, section } }) => {
    events = events.concat(`\n\t${phase}: ${section}.${method}::${data}`)
    if (section == 'issue' && method == 'RequestIssue') issueJson = data
  })
  events.concat('\n')
  const vaultAddressJson = issueJson[6]
  const amount = Number(issueJson[2]) + Number(issueJson[3])
  const parsedAddress = JSON.parse(vaultAddressJson)
  const hexHash = parsedAddress.p2wpkHv0
  const hash = Buffer.from(hexHash.substring(2), 'hex')
  const vaultBtcAddress = payments.p2wpkh({ hash }).address

  return { vaultBtcAddress, amount, events }
}

export const submitTx = async (tx, signer) => {
  let details
  console.log('Txns built. Waiting...')
  let promise = new Promise(async (resolve, reject) => {
    const unsub = await tx.signAndSend(
      signer,
      { nonce: -1 },
      ({ events = [], status }) => {
        if (status.isInBlock)
          console.log(
            `Txns in unfinalized block: ${status.asInBlock} waiting...`
          )
        if (status.isDropped) reject('Block has been dropped!')
        if (status.isFinalized) resolve({ events, hash: status.asFinalized })
      }
    )
  })

  await promise
    .then((message) => {
      details = message
    })
    .catch((message) => {
      throw new Error('Sending transaction failed.')
    })

  return details
}

export const printPercentages = (num1: number, num2: number) => {
  const percent = calcPercentages(num1, num2)

  process.stdout.write(`🦎 Chain vs CoinGecko price: `)
  if (percent > 0) {
    process.stdout.write(colors.green(`${percent.toFixed(2)}%\n`))
  } else {
    process.stdout.write(colors.red(`${percent.toFixed(2)}%\n`))
  }
}

export const calcPercentages = (num1: number, num2: number) => {
  const diff = num2 - num1
  const ratio = diff / num1
  const percent = ratio * 100

  return percent
}

export const printIntro = () => {
  let string = `                                                            
                                                    ,/&&&&&&&&&&&&&&&&(         
                                     #&&&&&&&&&&(.      .   .     .  . .&&      
                          /&&&&&&&#.   .                             &&&/       
                  %&&&&&% . .                                  %&&&&..          
            &&&&&. .                                   #&&&&&&...               
        &&&(.                               .#&&&&&&&(                          
       &&&.                .. (&&&&&&&&&&&/                                     
         . /&&&&&&&&&&&&#*..                                                    
                                  .,,,,&&&&&&&&.                                
                              ,&****&&&&&&&**&&&&&&                             
                            #&&&/&&&//////&&&&&&&&&&&/                          
                          /&&&//////&&&&&&&&&&&&&&&&&&&.                        
                         *&/&&&&&%/////%&&&&&&&&&&&&&&&&                        
                         &&&&&&&&&&&&&&&&********&&%&&&*&                       
                         &&&&&&&&&&&&&&,*,%&&&&,,&&&&&&&&                       
                         &&&&&&#,,,,,#&&&&&&&&&*&&&&&&&&&                       
                         ,&%,,,*&&&&&&&&&&&&&&&&,&&&&&&&.                       
                          .&&&*****&&*%&&&&&&&&&&&*/&&&                         
                           .&&&&&///&&&&&&##//////%/&.                          
                               &&&&&%&&&&&&&&&&&&&&                             
                                   #&&/&&&&&&&/                                 
                                              .      .,(%&&&&&&&&&&&&(.         
                                      %&&&&&&&&&&&,...  . .   .. .    .%&&      
                           #&&&&&&&/                                 %&&% .     
                  ,&&&&&&*.                                    ,&&&&%.          
            (&&&&/. .                                   &&&&&&*                 
        #&&&                                 ,%&&&&&&&,                         
       &&.                    .,&&&&&&&&&&&/.                                   
        . /&&&&&&&&&&&&&&&#,.`

  string = string.concat(
    colors
      .green(
        `
 ============================ KT VAULT RUNNER ==============================`
      )
      .concat(
        colors
          .rainbow(
            `
 by timbotronic`
          )
          .concat(
            colors.rainbow(`
 https://github.com/timbotro/kt-vault-runner \n\n`)
          )
      )
  )

  console.log(string)
}

export const printChoices = () => {
  const string = colors.yellow(`Choices:
  
  0.) Refresh:    Refresh this page.

  1.) Self-Mint:  Submit kBTC issue request against your own vault whilst keeping 
                  it shut to outsiders.

  2.) Harvest:    Harvest any KINT earnt as rewards, bridge to Karura to swap it for 
                  KSM, bridge back to Kintsugi to deposit it as collateral.

  3.) Rebalance:  Manage your vault's collateral ratio by using aUSD/kBTC liquidity pool
                  on Karura.

  4.) Quit:       Leave with regret.
                `)
  console.log(string)
}

export const chooser = async (answer) => {
  const number = Number(answer)
  switch (number) {
    case 0:
      break
    case 1:
      await mint()
      break
    case 2:
      await harvest()
      break
    case 3:
      await rebalance()
      break
    case 4:
      console.log('Goodbye. 👋')
      return true
    default:
      console.error(
        `⚠️ Invalid yes/no response entered: ${answer} \n Aborting.`
      )
      throw new Error('Invalid user answer')
  }

  return false
}

export const printDash = async () => {
  await Promise.all([
    getCgPrice('kusama'),
    getKarStatsPrice('KSM'),
    getCgPrice('kintsugi'),
    getKarStatsPrice('KINT'),
    getCgPrice('bitcoin'),
    getKarStatsPrice('BTC'),
  ]).then((prices) => {
    const table = {
      KSM: { CoinGecko: Number(prices[0]), 'Karura SubQL': Number(prices[1]) },
      KINT: { CoinGecko: Number(prices[2]), 'Karura SubQL': Number(prices[3]) },
      BTC: { CoinGecko: Number(prices[4]), 'Karura SubQL': Number(prices[5]) },
    }
    console.table(table)
    console.log(
      colors.random(
        '\n============================================================================'
      )
    )
  })
}

export const waitForBalChange = async (
  initialBal: FP,
  balCall,
  verbose = false
) => {
  let loops1 = 0
  let difference
  while (loops1 <= 12) {
    const currentBal = await balCall()
    if (currentBal.isGreaterThan(initialBal)) {
      difference = currentBal.sub(initialBal)
      break
    }
    await sleep(1000)
    loops1++
  }
  if (verbose)
    console.log(`⏱ Waited ${loops1} seconds for bridge txn to propagate`)
  return difference
}
