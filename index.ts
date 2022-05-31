import { printIntro } from './utils/helpers'
import { stdin as input, stdout as output } from 'node:process'
import { harvest } from './scripts/harvest'
import { mint } from './scripts/mint'
import { rebalance } from './scripts/rebalance'

var readline = require('node:readline/promises')

async function main() {
  printIntro()

  const rl = readline.createInterface({ input, output })
  const answer1 = await rl.question(`Please select an option (1-3):>  `)
  const number = Number(answer1)
  rl.close()

  switch (number) {
    case 1:
      await mint()
      break
    default:
      console.error(`⚠️ Invalid yes/no response entered: ${answer1} \n Aborting.`)
      throw new Error('Invalid user answer')
  }
}

main()
  .catch((err) => {
    console.error('Error: ', Object.entries(err as object), err)
  })
  .finally(() => {
    process.exit()
  })
