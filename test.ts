import {mintQ1,mainMenu, confirmMessage, harvestQ2} from "./utils/inquirer"

async function main(){
    // await mintQ1()
    // await confirmMessage()
const timbo = await harvestQ2(11)
console.log(timbo.harvestInput)
}

main()