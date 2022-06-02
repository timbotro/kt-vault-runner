import { printDash, printIntro, chooser, printChoices } from './utils/helpers'
import chalk from 'chalk'
import { mainMenu } from './utils/inquirer'
import clear from 'clear'
var readlineSync = require('readline-sync')
var colors = require('colors')

async function main() {
  while (true) {
    clear()
    printIntro()
    await printDash()
    const answer = await mainMenu()
    if (await chooser(answer.menuChoice)) break
  }
}

main()
  .catch((err) => {
    console.error('Error: ', Object.entries(err as object), err)
  })
  .finally(() => {
    process.exit()
  })
