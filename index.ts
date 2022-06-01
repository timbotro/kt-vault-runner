import { printDash, printIntro, chooser, printChoices } from './utils/helpers'
var readlineSync = require('readline-sync')
var colors = require('colors')

async function main() {
  printIntro()

  while (true) {
    await printDash()
    printChoices()

    var choice = readlineSync.question(colors.brightGreen(`Please select an option (0-4):>  `))
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
