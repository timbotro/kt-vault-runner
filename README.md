## Description
> :warning: Use at own risk, no responsibility taken for loss of funds!
>
This is a collection of scripts for *Kintsugi Vault Operators* to better help them automate the process of maintaining the collateral levels of their vault.


## Pre-requisites

1. Kintsugi vault fully set up
2. KINT balance in your vault
3. Seed phrase of your vault
4. (for some scripts) Free KAR balance on Karura chain

## Installation
1. Create a local seedphrase file somewhere on your filesystem: e.g. `mkdir ~/.private && touch ~/.private/seed.txt && vim ~/.private/seed.txt`
2. Change permissions to be readable to only owner: e.g. `chmod 600 ~/.private/seed.txt`
3. Change file owner to root: e.g. `sudo chown root seed.txt`
4. Back in repo dir, create a local environment file: `cp .env.example .env`
5. Replace seed path with absolute path to file created in step1
6. Install libraries with `yarn`


## Scripts Added
:question: Are you sure you wish to take the risk? Be sure to ask around the Discord channel if you are wary.

- For self issuance workflow: `yarn run:mint`
- For harvest & compound workflow: `yarn run:harvest`
- For rebalancing vault with LP: `yarn run:rebalance`
- For targetted premium redeems: *COMING SOON*


Enjoy!

### Example Output
```
=============================
⚡️ Connected to: kintsugi-parachain v15
🔑 Signer address: a3aPvmjypKaDtjRgjjwppKKK082kseYR3SLwvPevL6j7wF67aFtV4
ℹ️  Current status: CLOSED 🔒
❓ Permission: OPEN ✅
🐤 Collateral: 114.98 KSM
🕰  Outstanding issue requests: 0.018862 kBTC
💰 Issued: 0.08938 kBTC
🤌  Collateral Ratio: 305.93%
🌱 Mint Capacity Remaining: 0.01470 kBTC
💸 KINT Balance Free: 1.39 KINT
=============================
Would you like to proceed with submitting a self-mint issue request? (yes/no) yes
What collateral ratio would you like to issue upto? (min/default: 261) 303
Txns built. Waiting...
Txns in unfinalized block: 0xbac3ec02c3f6407a12672922d8a5062426f6fc574ac0c9fb421e73f068e22c1 waiting...
Batched TXNs in finalized block: 0xbac3ec02c3f6407a1244db268d7267393f6fc574ac0c9fb421e73f068e22c1
Events posted in transaction:
        {"applyExtrinsic":2}: utility.ItemCompleted::[]
        {"applyExtrinsic":2}: tokens.Reserved::[{"token":"KINT"},"a3aPvmjypKaDtjHHABKeYR3SLw28282L6j7wF67aFtV4",61818848]
        {"applyExtrinsic":2}: vaultRegistry.IncreaseToBeIssuedTokens::[{"accountId":"a3aPvm89278283632CCkseYR3SLwvPevL6j7wF67aFtV4","currencies":{"collateral":{"token":"KSM"},"wrapped":{"token":"KBTC"}}},27000]
        {"applyExtrinsic":2}: vaultRegistry.RegisterAddress::[{"accountId":"a3aPvmjypKaDtjRgYbDL2CCkseYR3SLwvPevL6j7wF67aFtV4","currencies":{"collateral":{"token":"KSM"},"wrapped":{"token":"KBTC"}}},{"p2wpkHv0":"0xccfa75cf68b729278358273673b03f9c8d61bf1a"}]
        {"applyExtrinsic":2}: issue.RequestIssue::["0x3885ee30a254076f846c85ae2b2fea1707bbe7c3658283eacb200dd5640c974ad","a3aPvmjypKaDtjRgYbDL2CCkseYR3SLwvPevL6j7wF67aFtV4",26959,41,61818848,{"accountId":"a3aPvmjypKaDtjRgYbDL2CCkseYR3SLwvPevL6j7wF67aFtV4","currencies":{"collateral":{"token":"KSM"},"wrapped":{"token":"KBTC"}}},{"p2wpkHv0":"0xccfa75cf68283737515f7f188b03f9c8d61bf1a"},"0x02aca66424646b34d160257929382951b4cfcaed45fe19549c11256a15fa58839b"]
        {"applyExtrinsic":2}: utility.ItemCompleted::[]
        {"applyExtrinsic":2}: utility.ItemCompleted::[]
        {"applyExtrinsic":2}: utility.BatchCompleted::[]
        {"applyExtrinsic":2}: system.ExtrinsicSuccess::[{"weight":1625865000,"class":"Normal","paysFee":"Yes"}]
=============================
🔏 Issue Request submitted to vault a3aPvmjypKaDtjRgjjwppKKK082kseYR3SLwvPevL6j7wF67aFtV4
🔏 Destination vault address: bc1qena8tnmgkc72829lcc3vplnjxkr0c6jm3rwy
💳 Amount to send: 0.00026959 kBTC
✨  Done in 48.14s.
```

## FAQ
### Is this going to steal my funds?
Good question to ask whenever pasting your seed phrase anywhere. 

However, the seed phrase is only used to generate a signer key using the official Parity `@polkadot/api` library. 
You can see exactly where how it is used in: `utils/helpers.ts::line24`
```
    .then((data) => (signer = keyring.addFromMnemonic(data.toString().replace('\n', ''))))
```

### Will this work for interlay vaults?
No. The current version uses many hardcoded values specifically for Kintsugi only. This may change in the future

### Is there a read-only mode so that I don't have to reveal my seed phrase?
I haven't built that feature yet. However you can quite easily see these stats on your corresponding vault dashboard
