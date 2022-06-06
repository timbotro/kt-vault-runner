import { printDash, printIntro, chooser } from './utils/helpers'
import { mainMenu } from './utils/inquirer'
import clear from 'clear'

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
