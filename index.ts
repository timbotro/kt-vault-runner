import { chooser, runInit } from './utils/helpers'
import { mainMenu } from './utils/inquirer'

async function main() {
  await runInit()
  while (true) {
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
