/* eslint-disable no-use-before-define */
// @ts-check

import makeIssuerKit from '@agoric/ertp';
import { makeZoeHelpers } from '@agoric/zoe/src/contractSupport';


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
  const allNonAccountPurses = new Set()
  const wrappedPaymentToERTPPayment = new Map()

  function makeWrappedPurse(ertpPurse){
    return {
      ...ertpPurse,
      deposit(payment, optAmount){
        return ertpPurse.deposit(wrappedPaymentToERTPPayment.get(payment), optAmount)
      },
      withdraw(amount){
        return makeWrappedPayment(ertpPurse.withdraw(amount))
      }
    }
  }

  function makeWrappedPayment(ertpPayment){
    const wrappedPayment = {
      ...ertpPayment
    }

    wrappedPaymentToERTPPayment.set(wrappedPayment, ertpPayment)

    return wrappedPayment
  }


  // Implement basic income
  currencyTick(async () => {
    for(const account of allAccounts){
      // melt 
      const currentAccountExtent = coinAmountMath.getExtent(account.getCurrentAmount())
      const meltedAmount = coinAmountMath.make( Math.floor(currentAccountExtent * meltingRate) )
      const wrappedMeltedPayment = account.withdraw(meltedAmount)
      const meltPayment = wrappedPaymentToERTPPayment.get(wrappedMeltedPayment)

      // melted currency is destroyed
      coinIssuer.burn(meltPayment)
      wrappedPaymentToERTPPayment.delete(wrappedMeltedPayment)

      // add basic income
      const incomePayment = coinMint.mintPayment(coinAmountMath.make(incomePerTick))
      account.deposit(makeWrappedPayment(incomePayment))
    }

    for(const purse of allNonAccountPurses){
      // melt 
      const currentAccountExtent = coinAmountMath.getExtent(purse.getCurrentAmount())
      const meltedAmount = coinAmountMath.make( Math.floor(currentAccountExtent * meltingRate) )
      const wrappedMeltedPayment = purse.withdraw(meltedAmount)
      const meltPayment = wrappedPaymentToERTPPayment.get(wrappedMeltedPayment)

      // melted currency is destroyed
      coinIssuer.burn(meltPayment)
      wrappedPaymentToERTPPayment.delete(wrappedMeltedPayment)
    }

    // awaits in this loop are not great for perf
    for(const [wrappedPayment, ertpPayment] of wrappedPaymentToERTPPayment){
      // melt 
      if(!await coinIssuer.isLive(ertpPayment)){
        wrappedPaymentToERTPPayment.delete(wrappedPayment)
      }
      else{
        const currentAccountExtent = coinAmountMath.getExtent(await coinIssuer.getAmountOf(ertpPayment))
        const meltedAmount = coinAmountMath.make( Math.floor(currentAccountExtent * meltingRate) )
        const [meltPayment, remainingPayment] = await coinIssuer.split(ertpPayment, meltedAmount)

        // melted currency is destroyed
        coinIssuer.burn(meltPayment)

        // reassign payment
        wrappedPaymentToERTPPayment.set(wrappedPayment, remainingPayment)
      }
    }
  });

  // We need to tell Zoe about this issuer and add a keyword for the
  // issuer. Let's call this the 'Account' issuer.
  return zcf.addNewIssuer(accountIssuer, 'Account').then(() => {
    // We need to wait for the promise to resolve (meaning that Zoe
    // has done the work of adding a new issuer).
    const offerHook = async offerHandle => {
      // an account is actually a purse...
      const newAccount = makeWrappedPurse(coinIssuer.makeEmptyPurse());
      // ... a reference of which is kept to put basic income at each tick
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
        // in this contract, making invites is public. But it could be otherwise
        makeAccountInvite,
        getAccountIssuer: () => accountIssuer,

        // participants never use the coinIssuer directly
        // instead, they use this wrapped version
        getCoinIssuer: () => ({
          // copy all of coinIssuer
          ...coinIssuer,
          // then override a couple of methods
          makeEmptyPurse(){
            const purse = makeWrappedPurse(coinIssuer.makeEmptyPurse())
            
            allNonAccountPurses.add(purse)

            return purse
          },
          getAmountOf(payment){
            return coinIssuer.getAmountOf( wrappedPaymentToERTPPayment.get(payment) )
          },
          // TODO wrappedPayment shouldn't be removed from wrappedPaymentToERTPPayment if .burn fails
          // TODO maybe add Promise.resolve
          burn(wrappedPayment){
            const ertpPayment = wrappedPaymentToERTPPayment.get(wrappedPayment)
            wrappedPaymentToERTPPayment.delete(wrappedPayment)
            return coinIssuer.burn( ertpPayment )
          },
          // TODO wrappedPayment shouldn't be removed from wrappedPaymentToERTPPayment if .claim fails
          // TODO maybe add Promise.resolve
          claim(wrappedPayment){
            const ertpPayment = wrappedPaymentToERTPPayment.get(wrappedPayment)
            wrappedPaymentToERTPPayment.delete(wrappedPayment)

            return makeWrappedPayment(
              coinIssuer.claim( ertpPayment )
            )
          },
          // TODO wrappedPayments shouldn't be removed from wrappedPaymentToERTPPayment if .combine fails
          // TODO maybe add Promise.resolve
          combine(wrappedPayments){
            const ertpPayments = wrappedPayments.map(wp => wrappedPaymentToERTPPayment.get(wp))
            for(const wp of wrappedPayments)
              wrappedPaymentToERTPPayment.delete(wp)

            return makeWrappedPayment(
              coinIssuer.combine( ertpPayments )
            )
          },
          // TODO wrappedPayment shouldn't be removed from wrappedPaymentToERTPPayment if .split fails
          // TODO maybe add Promise.resolve
          async split(wrappedPayment, amount){
            const ertpPayment = wrappedPaymentToERTPPayment.get(wrappedPayment)
            wrappedPaymentToERTPPayment.delete(wrappedPayment)

            const payments = await coinIssuer.split( ertpPayment, amount )

            return payments.map(makeWrappedPayment)
          },
          // TODO wrappedPayment shouldn't be removed from wrappedPaymentToERTPPayment if .splitMany fails
          // TODO maybe add Promise.resolve
          async splitMany(wrappedPayment, amounts){
            const ertpPayment = wrappedPaymentToERTPPayment.get(wrappedPayment)
            wrappedPaymentToERTPPayment.delete(wrappedPayment)

            const payments = await coinIssuer.splitMany( ertpPayment, amounts )
            return payments.map(makeWrappedPayment)
          },
          isLive(wrappedPayment){
            return Promise.resolve(wrappedPayment).then(wp => {
              const ertpPayment = wrappedPaymentToERTPPayment.get(wp)
              return coinIssuer.isLive(ertpPayment)
            })
          }
        })
      }),
    );

    // return an invite to the creator of the contract instance
    // through Zoe
    return makeAccountInvite();
  });
};

harden(makeContract);
export { makeContract };
