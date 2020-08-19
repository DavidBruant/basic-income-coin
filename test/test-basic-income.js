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


const basicIncomeContractSourceCode = `../contracts/basicIncomeContractSourceCode.js`;

const zoe = makeZoe(fakeVatAdmin);




// inspired from https://github.com/Agoric/agoric-sdk/blob/15f2d5dc04ccc85efdfb221b5cb15b475265defa/packages/zoe/test/unitTests/contracts/test-simpleExchange.js

test('simpleExchange with valid offers', async t => {
  t.plan(1);

  //console.log('zoe', zoe)

  const invitationIssuer = zoe.getInviteIssuer();
  /*const installation = await installationPFromSource(zoe, basicIncomeContractSourceCode);

  // Setup Alice
  const aliceMoolaPayment = moolaMint.mintPayment(moola(3));

  // Setup Bob
  const bobSimoleanPayment = simoleanMint.mintPayment(simoleans(7));

  // 1: Alice creates a simpleExchange instance and spreads the publicFacet far
  // and wide with instructions on how to call makeInvitation().
  const { publicFacet, instance } = await zoe.startInstance(installation, {
    Asset: moolaIssuer,
    Price: simoleanIssuer,
  });

  const aliceInvitation = E(publicFacet).makeInvitation();*/

  t.ok(true)

});
