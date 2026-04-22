import { Buffer } from 'node:buffer';

import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { DustSecretKey, ZswapSecretKeys } from '@midnight-ntwrk/ledger-v8';
import { HDWallet, Roles, generateRandomSeed } from '@midnight-ntwrk/wallet-sdk-hd';
import {
  DustAddress,
  MidnightBech32m,
  ShieldedAddress,
  ShieldedCoinPublicKey,
  ShieldedEncryptionPublicKey,
} from '@midnight-ntwrk/wallet-sdk-address-format';
import { createKeystore } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';

export const NETWORK_IDS = ['preview', 'preprod', 'mainnet'] as const;

export type NetworkId = (typeof NETWORK_IDS)[number];

export type DerivedWallet = {
  network: NetworkId;
  seedHex: string;
  addresses: {
    unshielded: {
      bech32: string;
      hex: string;
    };
    shielded: {
      bech32: string;
      coinPublicKeyBech32: string;
      encryptionPublicKeyBech32: string;
    };
    dust: {
      bech32: string;
    };
  };
  publicKeys: {
    unshielded: string;
    shieldedCoin: string;
    shieldedEncryption: string;
    dust: string;
  };
  secretKeys: {
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
    const zswapSecretKeys = ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
    const shieldedCoinPublicKey = ShieldedCoinPublicKey.fromHexString(zswapSecretKeys.coinPublicKey);
    const shieldedEncryptionPublicKey = ShieldedEncryptionPublicKey.fromHexString(
      zswapSecretKeys.encryptionPublicKey,
    );
    const shieldedAddress = new ShieldedAddress(shieldedCoinPublicKey, shieldedEncryptionPublicKey);
    const dustSecretKey = DustSecretKey.fromSeed(keys[Roles.Dust]);
    const dustAddress = new DustAddress(dustSecretKey.publicKey);

    return {
      network: networkId,
      seedHex,
      addresses: {
        unshielded: {
          bech32: unshieldedKeystore.getBech32Address().toString(),
          hex: unshieldedKeystore.getAddress(),
        },
        shielded: {
          bech32: MidnightBech32m.encode(networkId, shieldedAddress).toString(),
          coinPublicKeyBech32: ShieldedCoinPublicKey.codec.encode(networkId, shieldedCoinPublicKey).toString(),
          encryptionPublicKeyBech32: ShieldedEncryptionPublicKey.codec
            .encode(networkId, shieldedEncryptionPublicKey)
            .toString(),
        },
        dust: {
          bech32: MidnightBech32m.encode(networkId, dustAddress).toString(),
        },
      },
      publicKeys: {
        unshielded: unshieldedKeystore.getPublicKey(),
        shieldedCoin: zswapSecretKeys.coinPublicKey,
        shieldedEncryption: zswapSecretKeys.encryptionPublicKey,
        dust: dustSecretKey.publicKey.toString(),
      },
      secretKeys: {
        zswap: hex(keys[Roles.Zswap]),
        nightExternal: hex(keys[Roles.NightExternal]),
        dust: hex(keys[Roles.Dust]),
      },
    };
  } finally {
    hdWalletResult.hdWallet.clear();
  }
}
