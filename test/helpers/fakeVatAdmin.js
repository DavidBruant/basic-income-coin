import { E } from '@agoric/eventual-send';

import { makePromiseKit } from './promiseKit';
import { evalContractBundle } from './evalContractCode';

export default harden({
  createVat: bundle => {
    return harden({
      root: E(evalContractBundle(bundle)).buildRootObject(),
      adminNode: {
        done: () => {
          return makePromiseKit().promise;
        },
        terminate: () => {},
        adminData: () => ({}),
      },
    });
  },
  createVatByName: _name => {
    throw Error(`createVatByName not supported in fake mode`);
  },
});
