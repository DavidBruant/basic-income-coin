# Basic income currency

This is [Zoe](https://agoric.com/documentation/zoe/guide/#what-is-zoe) smart contract implementing a currency. Participation to this currency means receiving regularly some amount of this currency ("basic income")

## First iteration

Each person with an account gets a basic income regularly

### Implementation discussion

The currency system needs to credit each person's "account" regularly (like 1000 units per month)

As a consequence, it cannot be simply a mint with purses. Some notion of "person" and "account" is needed so one person does not have two or more "accounts" (two or more purses). So, the currency needs some **identity system**. Hence a zoe contract and not just a mint.
I'm keeping the identity system and the verification that one person cannot have several acccounts out of this contract


## Second iteration

The currency melts at a regular rate (like -1% per month)

This creates a per-account ceiling of amount that cannot be pierced in the long term




## Expectations and licence

i, David Bruant, expect to be credited for this work

As far as legal considerations, this work is CC0-licenced (Public Domain)