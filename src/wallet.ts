import { Buffer } from 'node:buffer';

import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { HDWallet, Roles, generateRandomSeed } from '@midnight-ntwrk/wallet-sdk-hd';
import { createKeystore } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';

export const NETWORK_IDS = ['preview', 'preprod', 'mainnet'] as const;

export type NetworkId = (typeof NETWORK_IDS)[number];

export type DerivedWallet = {
  network: NetworkId;
  seedHex: string;
  unshieldedAddressBech32: string;
  roleKeysHex: {
    zswap: string;
    nightExternal: string;
    dust: string;
  };
};

export function isNetworkId(value: string): value is NetworkId {
  return NETWORK_IDS.includes(value as NetworkId);
}

function hex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

export function generateMidnightWallet(
  networkId: NetworkId,
  seed: Uint8Array = generateRandomSeed(),
): DerivedWallet {
  const seedHex = toHex(Buffer.from(seed));
  const hdWalletResult = HDWallet.fromSeed(Buffer.from(seedHex, 'hex'));

  if (hdWalletResult.type !== 'seedOk') {
    throw new Error('Invalid seed');
  }

  try {
    const derived = hdWalletResult.hdWallet
      .selectAccount(0)
      .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
      .deriveKeysAt(0);

    if (derived.type !== 'keysDerived') {
      throw new Error('Key derivation failed');
    }

    const keys = derived.keys;

    setNetworkId(networkId);
    const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], networkId);

    return {
      network: networkId,
      seedHex,
      unshieldedAddressBech32: unshieldedKeystore.getBech32Address().toString(),
      roleKeysHex: {
        zswap: hex(keys[Roles.Zswap]),
        nightExternal: hex(keys[Roles.NightExternal]),
        dust: hex(keys[Roles.Dust]),
      },
    };
  } finally {
    hdWalletResult.hdWallet.clear();
  }
}
