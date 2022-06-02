import inquirer from 'inquirer'
import chalk from 'chalk'
import PressToContinuePrompt from 'inquirer-press-to-continue'

export const mainMenu = () => {
  return inquirer.prompt({
    name: 'menuChoice',
    type: 'list',
    message: 'Please select a choice: ',
    default: 0,
    pageSize: 10,
    choices: [
      { name: `1) Refresh:       Refresh this page.`, value: 0, short: 'RFRSH' },
      new inquirer.Separator(),
      {
        name: 
        `2) Self-Mint:     Submit kBTC issue request against your own vault whilst keeping 
                    it shut to outsiders.`,
        value: 1,
        short: 'MINT',
      },
      {
        name: 
        `3) Harvest:       Harvest any KINT earnt as rewards, bridge to Karura to swap it for 
                    KSM, bridge back to Kintsugi to deposit it as collateral.`,
        value: 2,
        short: 'HVST',
      },
      {
        name: 
        `4) Rebalance:     Manage your vault's collateral ratio by using aUSD/kBTC liquidity pool
                    on Karura.`,
        value: 3,
        short: 'RBAL',
      },
      new inquirer.Separator(),
      { name: `5) Quit:          Leave with regret.`, value: 4, short: 'QUIT' },
    ],
    filter(val) {
      return val
    },
  })
}

export const rebalanceQ1 = () => {
    return inquirer.prompt({
        name: 'rebalanceIntro',
        type: 'confirm',
        message: 'Would you like to proceed with rebalancing the vault with staked LP?',
        validate: function (value) {
          return value
        },
      })
}

export const rebalanceQ2 = (negRatio, ratio) => {
    return inquirer.prompt({
        name: 'rebalanceInput',
        type: 'number',
        message: `What collateral ratio would you like to rebalance? (${chalk.redBright(`${negRatio}%`)} <-> ${chalk.greenBright(`+${ratio.toNumber(2)}%`)})`,
        filter(val){
            if (val == 0) throw Error("0% Adjustment means no action required.")
            if (val < Number(negRatio)) throw Error("Adjustment requested is too low for free collateral available.")
            if (val > ratio.toNumber()) throw Error("Adjustment requested is too high for LP available")
            return val
        }
      })
}


export const harvestQ1 = () => {
    return inquirer.prompt({
        name: 'harvestIntro',
        type: 'confirm',
        message: 'Would you like to proceed with harvesting, bridging, swapping and depositing?',
        validate: function (value) {
          return value
        },
      })
}

export const harvestQ2 = (max) => {
    return inquirer.prompt({
        name: 'harvestInput',
        type: 'number',
        default: 1,
        message: `How much KINT would you like to harvest and convert to KSM? (min:1 | max: ${max.toFixed(2)}) `,
        filter(val){
            if (val < 1) throw Error("Harvest amount entered too small")
            if (val > max) throw Error("Harvest amount exceeds maximum")
            return val
        }
      })
}

export const mintQ1 = () => {
  return inquirer.prompt({
    name: 'MintIntro',
    type: 'confirm',
    message: 'Would you like to proceed with submitting a self-mint issue request?',
    validate: function (value) {
      return value
    },
  })
}

export const mintQ2 = (current) => {
    return inquirer.prompt({
        name: 'mintInput',
        type: 'number',
        default: 261,
        message: `What collateral ratio would you like to issue upto? <min/default:>`,
        filter(val){
            if (val < 261) throw Error("Input is below safe threshold.")
            if (val > current) throw Error("Input above current, issue is moot.")
            return val
        }
      })
}

export const mintQ3 = () => {
  return inquirer.prompt({
    name: 'MintNag',
    type: 'confirm',
    message: 'Have you written the above payment details down?',
    validate: function (value) {
      return value
    },
  })
}

export const confirmMessage = async () => {
  inquirer.registerPrompt('press-to-continue', PressToContinuePrompt)
  const { key: enterKey } = await inquirer.prompt({
    name: 'key',
    type: 'press-to-continue',
    enter: true,
  })
}
