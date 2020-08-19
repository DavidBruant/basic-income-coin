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
  t.plan(2);
  try {
    const zoe = makeZoe(fakeVatAdmin);
    // Pack the contract.
    const bundle = await bundleSource(basicIncomeContractSourceCode);
    const installationHandle = await E(zoe).install(bundle);
    const inviteIssuer = await E(zoe).getInviteIssuer();

    // Alice creates a contract instance
    const {
      instanceRecord: { publicAPI },
    } = await E(zoe).makeInstance(installationHandle);

    // Bob wants to get 1000 tokens so he gets an invite and makes an
    // offer
    const invite = await E(publicAPI).makeInvite();
    t.ok(await E(inviteIssuer).isLive(invite), `valid invite`);
    const { payout: payoutP } = await E(zoe).offer(invite);

    // Bob's payout promise resolves
    const bobPayout = await payoutP;
    const bobTokenPayout = await bobPayout.Token;

    // Let's get the tokenIssuer from the contract so we can evaluate
    // what we get as our payout
    const tokenIssuer = await E(publicAPI).getTokenIssuer();
    const amountMath = await E(tokenIssuer).getAmountMath();

    const tokens1000 = await E(amountMath).make(1000);
    const tokenPayoutAmount = await E(tokenIssuer).getAmountOf(bobTokenPayout);

    // Bob got 1000 tokens
    t.deepEquals(tokenPayoutAmount, tokens1000);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  }

});
