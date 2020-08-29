/* eslint-disable no-use-before-define */
// @ts-check

import makeIssuerKit from '@agoric/ertp';
import { makeZoeHelpers } from '@agoric/zoe/src/contractSupport';


function makeAccount(coinPurse){
  // TODO
  // maybe it's exactly a purse, maybe not
  return coinPurse
}

function makeBasicIncomeCoinIssuer(coinIssuer){
  // TODO
  // at least remove makeEmptyPurse
  return coinIssuer
}

/**
 * This is a very simple contract ... (TODO)
 */
const makeContract = zcf => {
  const zoeHelpers = makeZoeHelpers(zcf);

  const { terms: {currencyTick, incomePerTick, meltingRate} } = zcf.getInstanceRecord()

  // Create the internal mint for a fungible digital asset
  const { issuer: coinIssuer, mint: coinMint, amountMath: coinAmountMath } = makeIssuerKit('basic-income-coin', 'nat');

  // Create the internal account mint
  const { issuer: accountIssuer, mint: accountMint, amountMath: accountAmountMath } = makeIssuerKit('basic-income-coin-account', 'set');

  const allAccounts = new Set()

  // Implement basic income
  currencyTick(() => {
    for(const account of allAccounts){
      // melt 
      const currentAccountAmount = coinAmountMath.getExtent(account.getCurrentAmount())
      const meltedAmount = coinAmountMath.make( Math.round(currentAccountAmount * meltingRate) )
      const meltPayment = account.withdraw(meltedAmount)

      // melted currency is destroyed
      coinIssuer.burn(meltPayment)

      // add basic income
      account.deposit(coinMint.mintPayment(coinAmountMath.make(incomePerTick)))
    }
  });


  // We need to tell Zoe about this issuer and add a keyword for the
  // issuer. Let's call this the 'Account' issuer.
  return zcf.addNewIssuer(accountIssuer, 'Account').then(() => {
    // We need to wait for the promise to resolve (meaning that Zoe
    // has done the work of adding a new issuer).
    const offerHook = async offerHandle => {
      const newAccount = makeAccount(coinIssuer.makeEmptyPurse());
      allAccounts.add(newAccount)

      const newAccountPayment = accountMint.mintPayment(accountAmountMath.make(harden([newAccount])));
      
      return zoeHelpers
        .escrowAndAllocateTo({
          amount: await accountIssuer.getAmountOf(newAccountPayment),
          payment: newAccountPayment,
          keyword: 'Account',
          recipientHandle: offerHandle,
        })
        .then(() => {
          zcf.complete(harden([offerHandle]));
          return 'Offer completed. You should receive a payment from Zoe';
        });
    };

    // A function for making invites to this contract
    const makeAccountInvite = () => zcf.makeInvitation(offerHook, 'make an account');

    zcf.initPublicAPI(
      harden({
        // in this contract, making invites is public. But might not be
        makeAccountInvite,
        getAccountIssuer: () => accountIssuer,
        getCoinIssuer: () => makeBasicIncomeCoinIssuer(coinIssuer)
      }),
    );

    // return an invite to the creator of the contract instance
    // through Zoe
    return makeAccountInvite();
  });
};

harden(makeContract);
export { makeContract };
