// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';

// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import { E } from '@agoric/eventual-send';

import { assert, details } from '@agoric/assert';

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


const basicIncomeContractSourceCode = `${__dirname}/../contracts/basicIncomeCurrency.js`;

const zoe = makeZoe(fakeVatAdmin);




// inspired from https://github.com/Agoric/agoric-sdk/blob/15f2d5dc04ccc85efdfb221b5cb15b475265defa/packages/zoe/test/unitTests/contracts/test-simpleExchange.js

test('simpleExchange with valid offers', async t => {
  try {
    // Pack the contract.
    const bundle = await bundleSource(basicIncomeContractSourceCode);
    const installationHandle = await E(zoe).install(bundle);
    //const inviteIssuer = await E(zoe).getInviteIssuer();

    let interval;

    const {
      instanceRecord: { publicAPI },
    } = await E(zoe).makeInstance(installationHandle, {}, {incomeTick(onTick){
      interval = setInterval(onTick, 1000)
    }});

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

    // wait a bit more than a second and notice the account is not empty anymore
    await new Promise(resolve => {
      setTimeout(() => {
        resolve();
        t.ok(coinAmountMath.isGTE(account.getCurrentAmount(), coinAmountMath.make(1)));
        
      }, 1100)
    })

    clearInterval(interval)
    t.pass()
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  }

});
