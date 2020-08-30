# Experience report - August 30th 2020

This is mostly for the Agoric team, but could be useful to others

I recently saw [a tweet by Kate](https://twitter.com/kate_sills/status/1294718027418619904): 

> perhaps have a particular community currency in which a certain amount is given to each new member so as to level the field.

and i thought it'd be fun to play around this idea

I did not choose to do what's written in the tweet specifically, but i chose to implement currency with a [basic income](https://en.wikipedia.org/wiki/Basic_income). That is, a currency within which, each participant regularly gets some fixed amount at regular intervals.

Given i knew Agoric stack and ERTP and Zoe, i felt like it would be a great starting point

What follows is my experience in working on this.

## Overview

I had 2 goals:

1. Implement a basic income currency
2. Implement a basic income currency with melting

(disclaimer: i'm self-taught in economics, so what i think on this topic is not necessarily "good" or "right")

One problem often raised in basic income debates is "who is going to pay?"

One possible solution is "nobody, let's use [money creation](https://en.wikipedia.org/wiki/Money_creation)". In the current system, my understanding is that money is created as debt and only banks have the capability to create money via loans. But that's unfair, because they get to choose who gets the new money and who doesn't. Why would they be endowed special powers and not the rest of us?\
The basic-income-as-money-creation idea removes the money-creation capability from the banks and gives it to everybody

One problem that banks solve is money destruction which happens as the loan is being paid back. How would money be destructed with a basic income? Some [local/complementary/community currencies](https://en.wikipedia.org/wiki/Local_currency) implement "melting" the money, that is, it disappears after some time (maybe you lose -2% every month). This is meant to incentivize people to spend the money instead of accumulating it.

So i thought i'd implement a currency with basic income with melting. I have no clue whether any of this is a good idea, but that's what i went with

In the end, i succeeded at both exercices:
- basic income
    - tests: https://github.com/DavidBruant/basic-income-coin/blob/b19b5c323ae416d5bcb0f8b5a53bcb16aae0c315/test/test-basic-income.js
    - code: https://github.com/DavidBruant/basic-income-coin/blob/b19b5c323ae416d5bcb0f8b5a53bcb16aae0c315/contracts/basicIncomeCurrency.js
- basic income with melting
    - tests: https://github.com/DavidBruant/basic-income-coin/blob/main/test/test-basic-income-with-melting.js
    - code: https://github.com/DavidBruant/basic-income-coin/blob/main/contracts/basicIncomeCurrencyWithMelting.js


## Experience report

### Beginnings

My intention was to create and play with a currency concept, so the only thing i needed was Zoe (or a contract host?) and ERTP. At this stage, i didn't really need a browser UI, a server, vats, etc.

The setup for this was not really hard (because i'm already familiar with Agoric tooling and processes!), but not totally smooth either.

The ["getting started" documentation](https://agoric.com/documentation/getting-started/start-a-project.html) suggests to start a Dapp with a UI and a server and a blockchain, but that's a lot for my need\

So i took another route: i created a repo from scratch and tried to replicate the experience of [Zoe contract tests](https://github.com/Agoric/agoric-sdk/blob/c43a08fb1733596172a7dc5ca89353d837033e23/packages/zoe/test/unitTests/contracts/test-mintPayments.js) so that my developer experience would be "write test/code ; run `npm test` ; repeat"

It was fairly easy (because i'm very familiar with JS and npm tooling/processes):
- `npm install @agoric/zoe` (I used `0.7.0` from npm; i've seen a new version is coming, i haven't tried it yet, but the differences do not seem to affect my experience significantly) + a handful of other `@agoric` packages
- i had to [change a couple of `import` paths](https://github.com/DavidBruant/basic-income-coin/blob/b19b5c323ae416d5bcb0f8b5a53bcb16aae0c315/test/test-basic-income.js#L2-L13)
- ... and [copy a handful of test helper files](https://github.com/DavidBruant/basic-income-coin/tree/main/test/helpers) (and fix their a couple of their `import` paths)

And i was ready to go

One idea to make this process easier could be to keep Zoe test helpers in the `@agoric/zoe` package. This was i would import `fakeVatAdmin` from there (maybe `import fakeVatAdmin from "@agoric/zoe/test/helpers/fakeVatAdmin.js"`?)


### Implementing a basic income contract

- tests: https://github.com/DavidBruant/basic-income-coin/blob/b19b5c323ae416d5bcb0f8b5a53bcb16aae0c315/test/test-basic-income.js
- code: https://github.com/DavidBruant/basic-income-coin/blob/b19b5c323ae416d5bcb0f8b5a53bcb16aae0c315/contracts/basicIncomeCurrency.js

The core idea is that each person participating in the currency has an "account". An "account" is only an ERTP purse that the smart contract has kept a reference to. Regulary, for each "account", the contract mints the income transfers to the account. The person with access to the "account" can see that it is initially empty. And it becomes noticeably not-empty if they wait after some time.

Zoe trades invites for ERTP payments, so i need to create 2 internal issuers: one for the accounts (to be exchanged against zoe contract invites), another for the currency itself

One possible attack against the currency is that one person has access to several accounts (and consequently several basic income). There are several possible solutions (maybe some identity system?). I have chosen to not work on any, so in this contract, the ability to create invites (and create accounts) is public.


#### "regularly"

Zoe contracts do not have a notion of time. I tried to use `setInterval` inside a contract and the reaction was `setInterval is undefined`. Fair enough :-p
I implemented a rudimentary timer and passed it as a term of the contract. The contract subscribes to the timer.


#### what is this red squiggly underline?

At some point in my code, i saw a red squiggly underline. It was VSCode telling me i was trying to destructure a `Promise<something>` and get a property it this promise did not have.

`npm install`ing and `import`ing `@agoric/zoe` and a `// @ts-check` i had copy-pasted by accident (in my `.js` file) was enough to get type checking in my contract source code. This was an 😍 **AMAZING** 😍 surprise and experience. It really was a pleasant surprise that the type checking emerged and helped out without even having tried to set it up

... and obviously, it was correct, i needed to `await` before destructuring

This switch between promises and non-promises is a bit annoying. In the short term, `// @ts-check` is a good friend. In the long term `~.` is certainly the right answer


### Implementing a basic income with melting

- tests: https://github.com/DavidBruant/basic-income-coin/blob/main/test/test-basic-income-with-melting.js
- code: https://github.com/DavidBruant/basic-income-coin/blob/main/contracts/basicIncomeCurrencyWithMelting.js

This one is a bit trickier. The amount of each "account" (again, just a purse) needs to melt at each timer tick... but it could be easy to dodge the melt by `.withdraw()`ing from the account into a payment before the tick, wait the melt with the account at 0 and `.deposit()` back after the tick. **All the non-account purses and all the payments need to melt as well**


#### Melting accounts

Melting the currency in the accounts is fairly straightforward:
- compute how much should be lost
- `.withdraw()` the corresponding amount
- `.burn()` the withdrawn payment


#### Melting purses and payments

In order to do this, what i had to do was wrap every issuer and purse methods that takes a purse or a payment as argument or return one to convert between an public "wrapped" version and an internal "ERTP" version. (and keep a reference to all purses and payments to melt their amount on tick)

This means that the zoe contract has direct access to the `coinIssuer`, but everybody else [only ever has access to the wrapped issuer version](https://github.com/DavidBruant/basic-income-coin/blob/b19b5c323ae416d5bcb0f8b5a53bcb16aae0c315/contracts/basicIncomeCurrencyWithMelting.js#L134-L203) (the code is a bit long because i had to rewrite most methods, but it's straightforward).


##### Rambling on trust and issuers in Zoe contracts

This idea that no one else accesses the original issuer directly, but only an API-compatible version, with all purses and payments being themselves wrapped versions threw me into thinking whether this was the right path.

For instance, would it make sense to use this "fake" issuer in another zoe contract? Is it even a fake issuer? Sure, it doesn't come from a `makeIssuerKit` call, but it does implement the same API (modulo a handful of TODOs about error handling and promise/non-promise). It implements the same API so well that passing it to `zoe.makeInstance` as `issuerKeywordRecord` would certainly work

This got me thinking about whether a malicious issuer could do harm when passed to a Zoe contract. And my current answer is "maybe, but it doesn't matter". If i enter a zoe contract, i can always get the instance record, check the issuers in the `issuerKeywordRecord` and decide whether i trust the issuers to participate. Whether issuers come from `makeIssuerKit` or some custom code does not really matter. Whether i value the assets (and specifically the payment objects) associated with this issuer is what matters

The combination of ERTP performing atomic transfer of property rights and zoe offers being expressed as amounts takes care of the rest. This is a solid foundation.

In the long run, if people start writing their own issuers, maybe they'll start relying on the parts that the zoe service exercises (let's call this the `IssuerInterfaceUsedByZoe`) and this `IssuerInterfaceUsedByZoe` would become part of the Agoric product in the sense that changes to this `IssuerInterfaceUsedByZoe` would need to be communicated to people relying on it so they can adapt their code 


##### Wrapping issuer/purse/payment

Wrapping was fairly easy. The choice of methods not using JavaScript `this` helps a lot with reusing methods as individual functions.

One thing that surprised me was the `purse.makeDepositFacet` method. [Its documentation](https://agoric.com/documentation/ertp/api/purse.html#purse-makedepositfacet) lacked a complete list of all facet methods. A look at [the code](https://github.com/Agoric/agoric-sdk/blob/c43a08fb1733596172a7dc5ca89353d837033e23/packages/ERTP/src/issuer.js#L109) showed me that it only contains a single method, but this is not clear from the documentation right now.

Also, it's not clear to me why this method is part of ERTP. I see the value in creating this facet, but what is not clear is why this facet specifically and not others (i envision lots of useful facets that could wrap `.withdraw()` to give the capability to others to withdraw in a way that is restricted in amount and/or frequency). Also, it wasn't clear to me why this was part of ERTP and not a separate library.\
... or part of nothing at all? After all when you have a reference to a `purse`, the difference between making the facet by yourself or via the method is:
`const depositFacet = harden({ receive: purse.deposit })`
vs 
`const depositFacet = purse.makeDepositFacet()`


## Conclusion

Initially, i wasn't fully sure what i wanted to do was doable at all with Zoe/ERTP.

In the end it not only possible but was pretty easy for me (with a solid JS background and good knowledge of ERTP/Zoe) to invent a custom currency with ERTP/Zoe. Much easier than i anticipated.
