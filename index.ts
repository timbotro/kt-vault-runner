import { printDash, printIntro, chooser, printChoices } from './utils/helpers'
import chalk from 'chalk'
import clear from 'clear'
// var figlet = require('figlet');
var readlineSync = require('readline-sync')
var colors = require('colors')

async function main() {
  while (true) {
    clear()
    printIntro()
    await printDash()
    printChoices()

    var choice = readlineSync.question(chalk.bgBlack.greenBright.bold(`Please select an option (0-4):> `))
    if (await chooser(choice)) break
  }
}

main()
  .catch((err) => {
    console.error('Error: ', Object.entries(err as object), err)
  })
  .finally(() => {
    process.exit()
  })
