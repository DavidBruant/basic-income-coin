// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';

// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import { E } from '@agoric/eventual-send';

import bundleSource from '@agoric/bundle-source';

import { makeZoe } from '@agoric/zoe';

import fakeVatAdmin from './helpers/fakeVatAdmin';


// https://github.com/Agoric/agoric-sdk/blob/15f2d5dc04ccc85efdfb221b5cb15b475265defa/packages/zoe/test/unitTests/installFromSource.js
/**
 * @param {ZoeService} zoe
 * @param {string} path
 * @returns {Promise<Installation>}
 */
export const installationPFromSource = (zoe, path) =>
  bundleSource(path).then(b => zoe.install(b));


const basicIncomeContractSourceCode = `${__dirname}/../contracts/basicIncomeCurrencyWithMelting.js`;

const zoe = makeZoe(fakeVatAdmin);


// inspired from https://github.com/Agoric/agoric-sdk/blob/15f2d5dc04ccc85efdfb221b5cb15b475265defa/packages/zoe/test/unitTests/contracts/test-simpleExchange.js

test('basic income with melting', async t => {
  const incomePerTick = 10;
  const meltingRate = 0.1;

  try {
    // Pack the contract.
    const bundle = await bundleSource(basicIncomeContractSourceCode);
    const installationHandle = await E(zoe).install(bundle);
    //const inviteIssuer = await E(zoe).getInviteIssuer();

    let interval;

    const {
      instanceRecord: { publicAPI },
    } = await E(zoe).makeInstance(installationHandle, {}, {
      currencyTick(onTick){
        interval = setInterval(onTick, 1000)
      },
      incomePerTick,
      meltingRate
    });

    const accountInvite = await E(publicAPI).makeAccountInvite();
    const accountIssuer = await E(publicAPI).getAccountIssuer();
    const coinIssuer = await E(publicAPI).getCoinIssuer();
    const coinAmountMath = coinIssuer.getAmountMath()


    // Create an account
    const { payout: accountPaymentP } = await E(zoe).offer(accountInvite);
    const {'Account': accountPayment} = await accountPaymentP;
    const accountPaymentAmount = await accountIssuer.getAmountOf(accountPayment)
    const [account] = accountIssuer.getAmountMath().getExtent(accountPaymentAmount);

    // The account is initially empty
    t.ok(coinAmountMath.isEmpty(account.getCurrentAmount()))

    // wait a bit more than 1sec and notice the account is not empty anymore
    await new Promise(resolve => {
      setTimeout(() => {
        resolve();
        t.ok(coinAmountMath.isEqual(
          account.getCurrentAmount(), 
          coinAmountMath.make(0*(1-meltingRate) + incomePerTick)
        ));
      }, 1100)
    })

    // wait a bit more to see melting in action
    await new Promise(resolve => {
      setTimeout(() => {
        resolve();
        t.ok(coinAmountMath.isEqual(
          account.getCurrentAmount(), 
          coinAmountMath.make( (0*(1-meltingRate) + incomePerTick)*(1-meltingRate) + incomePerTick )
        ));
      }, 1100)
    })

    clearInterval(interval)
    t.pass()
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  }

});

test('basic income with melting - purses and payment also melt', async t => {
  const incomePerTick = 100;
  const meltingRate = 0.1;

  const tickDelay = 200; // ms

  try {
    // Pack the contract.
    const bundle = await bundleSource(basicIncomeContractSourceCode);
    const installationHandle = await E(zoe).install(bundle);

    let interval;

    const {
      instanceRecord: { publicAPI },
    } = await E(zoe).makeInstance(installationHandle, {}, {
      currencyTick(onTick){
        interval = setInterval(onTick, tickDelay)
      },
      incomePerTick,
      meltingRate
    });

    const accountInvite = await E(publicAPI).makeAccountInvite();
    const accountIssuer = await E(publicAPI).getAccountIssuer();
    const coinIssuer = await E(publicAPI).getCoinIssuer();
    const coinAmountMath = coinIssuer.getAmountMath()


    // Create an account
    const { payout: accountPaymentP } = await E(zoe).offer(accountInvite);
    const {'Account': accountPayment} = await accountPaymentP;
    const accountPaymentAmount = await accountIssuer.getAmountOf(accountPayment)
    const [account] = accountIssuer.getAmountMath().getExtent(accountPaymentAmount);

    // The account is initially empty
    t.ok(coinAmountMath.isEmpty(account.getCurrentAmount()))

    const extentAfter2Ticks = (0*(1-meltingRate) + incomePerTick)*(1-meltingRate) + incomePerTick; // 190

    // wait a bit to see melting in action
    await new Promise(resolve => {
      setTimeout(() => {
        resolve();
        t.ok(coinAmountMath.isEqual(
          account.getCurrentAmount(), 
          coinAmountMath.make( extentAfter2Ticks ) 
        ));
      }, 2*tickDelay + 10)
    })
    
    // create empty purse
    const coinPurse = coinIssuer.makeEmptyPurse()
    // transfer 100 units to this purse from the account
    const transferPayment = account.withdraw( coinAmountMath.make(100) )
    coinPurse.deposit(transferPayment)

    const withdrawnFromPurse = coinPurse.withdraw( coinAmountMath.make(50) )

    t.ok(coinAmountMath.isEqual(
      coinPurse.getCurrentAmount(), 
      coinAmountMath.make( 50 ) 
    ));
    t.ok(coinAmountMath.isEqual(
      await coinIssuer.getAmountOf(withdrawnFromPurse), 
      coinAmountMath.make( 50 ) 
    ));

    // wait one more tick
    await new Promise(resolve => {
      setTimeout(async () => {
        resolve();
        t.ok(coinAmountMath.isEqual(
          account.getCurrentAmount(), 
          coinAmountMath.make( (extentAfter2Ticks - 100)*(1-meltingRate) + incomePerTick ) 
        ));
        
        t.ok(coinAmountMath.isEqual(
          coinPurse.getCurrentAmount(), 
          coinAmountMath.make( Math.floor(50*(1-meltingRate)) ) 
        ));

        t.ok(coinAmountMath.isEqual(
          await coinIssuer.getAmountOf(withdrawnFromPurse), 
          coinAmountMath.make( Math.floor(50*(1-meltingRate)) ) 
        ));

      }, tickDelay)
    })

    clearInterval(interval)
    t.pass()
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  }

});
