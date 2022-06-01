import { printIntro, chooser, printChoices } from './utils/helpers'
var readlineSync = require('readline-sync')
var colors = require('colors')

async function main() {
  printIntro()

  while (true) {
    printChoices()

    var choice = readlineSync.question(colors.orange(`Please select an option (1-4):>  `))
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
