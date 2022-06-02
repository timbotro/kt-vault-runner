[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Overview
|Title| KT Vault Runner|
|------|---------|
|Hackathon|[amsterDOT Hack](https://dorahacks.io/hackathon/22/detail)|
|Bounty Name|[Interlay: VAULT INTERFACE](https://github.com/interlay/bounties/issues/1) |
|Summary| CLI application for Kintsugi Vault operators to automate tasks.|
|Video Link| [youtube](http://www.youtube.com)|

### Full Description
The dream of Kintsugi is to have the most decentralized wrapped BTC token, that is fully insured by collateral. 
To encourage decentralization, the network should attract high quantities of smaller vault operators (VOs), instead of a few whale accounts. 
Smaller VOs, however, may not have the luxury of delegated funds and so will operate in a more self-interested fashion. 
This CLI application is designed to service these VOs and help to manage exposures to multiple crypto assets.

Second only to liveness, the VO's key responsibility is to manage the ratio between the value of the collateral versus the value of issued kBTC. 
This means the monitoring the markets and reacting to the changing volatile price of not only KBTC but also the collateral asset (e.g. KSM).
This application allows for full automation of: self-issuing, harvesting rewards and farming BTC. 
The goal here is to make running small VOs far more attractive and thus increase network issuance whilst maintaining decentralization.


## Pre-requisites
1. Node version 18 and later
2. Kintsugi vault fully set up
3. KINT balance in your vault
4. Seed phrase of your vault
5. (for some scripts) Free KAR balance on Karura chain

## Installation
1. Create a local seedphrase file somewhere on your filesystem: e.g. `mkdir ~/.private && touch ~/.private/seed.txt && vim ~/.private/seed.txt`
2. Change permissions to be readable to only owner: e.g. `chmod 600 ~/.private/seed.txt`
3. Change file owner to root: e.g. `sudo chown root seed.txt`
4. Back in repo dir, create a local environment file: `cp .env.example .env`
5. Replace seed path with absolute path to file created in step1
6. Install libraries with `yarn`

## Usage
> :warning: Use at own risk, no responsibility taken for loss of funds!

```
yarn start
```

## Scripts Added
:question: Are you sure you wish to take the risk? Be sure to ask around the Discord channel if you are wary.

- For self issuance workflow
- For harvest & compound workflow
- For rebalancing vault with LP
<!-- - For targetted premium redeems: *COMING SOON* -->

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
No. The current version uses many hardcoded values specifically for Kintsugi only. This may change in the future.

### Will this work for vaults with non-KSM collaterals?
No. However, no reason why this can't change in the future.