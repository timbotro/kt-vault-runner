## Description
> :warning: Use at own risk, no responsibility taken for loss of funds!
>
This is a self minting script for kintsugi vault operators to submit issue requests against their own vault whilst keeping it closed to outsiders.

Often when opening your vault, participants will initiate issue requests which will never complete. This is not only annoying having to wait 1-2 days for them to expire, and during this time it can be very capital efficient.

This script will submit an atomic batched transaction which will:

1. Open the vault
2. Submit an issue request
3. Close the vault

## Pre-requisites

1. Kintsugi vault
2. KINT balance in your vault
3. Seed phrase of your vault

## Usage
:question: Are you sure you wish to take the risk? Be sure to ask around the Discord channel if you are wary.

1. Create a local environment file: `cp .env.example .env`
2. Replace seed phrase in `.env` file with your vault's one
3. Install libraries with `yarn`
4. Run script: `yarn self-mint`
5. Follow instruction prompts and read ALL console output to verify numbers you are happy with
6. Navigate to `https://kintsugi.interlay.io/transactions` to get issue request details

Enjoy!

## FAQ
### Is this going to steal my funds?
Good question to ask whenever pasting your seed phrase anywhere. 

However, the seed phrase is only used to generate a signer key using the official Parity `@polkadot/api` library. 
You can see exactly where how it is used in: `utils/helpers.ts::line15`
```
const signer = keyring.addFromMnemonic(process.env.SEED_PHRASE as string)
```

**_The seed phrase is not used anywhere else in the code._**

Furthermore the only place the signer key is used to submit an extrinsic is at: `utils/helpers.ts::line15`
```
const unsub = await txn.signAndSend(signer, { nonce: -1 }, (block) => {
```

### Will this work for interlay vaults?
No. The current version uses many hardcoded values specifically for Kintsugi only. This may change in the future

### Why does this not show BTC addresses for successful issue requests?
I am not an expert on BTC and for safety sake you must navigate to the official kintsugi web app to get the precise deposit details.

### Is there a read-only mode so that I don't have to reveal my seed phrase?
I haven't built that feature yet. However you can quite easily see these stats on your corresponding vault dashboard

### What is up with the number precisions used here? Why do you keep truncating DPs?
This is to increase readability at the expense of 100% precision in working out how much BTC you need. This was for my sanity but you will not be able to get true 260% collateralisation utilization.
No money will be lost through the imprecision, this just affects how close to 260% you get to.
