import { describe, expect, test } from 'bun:test';

import { parseArgs, runCli } from '../src/cli.js';
import { generateMidnightWallet } from '../src/wallet.js';

function stripAnsi(text: string): string {
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}

describe('parseArgs', () => {
  test('defaults to preprod', () => {
    expect(parseArgs([])).toEqual({ help: false, network: 'preprod' });
  });

  test('accepts a valid network id', () => {
    expect(parseArgs(['--network', 'preview'])).toEqual({
      help: false,
      network: 'preview',
    });
  });

  test('rejects an invalid network id', () => {
    expect(() => parseArgs(['--network', 'invalid'])).toThrow('Invalid network id: invalid');
  });
});

test('runCli writes JSON output', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  const exitCode = runCli(['--network', 'mainnet'], {
    stdout: (text) => stdout.push(text),
    stderr: (text) => stderr.push(text),
    generateWallet: (network) => ({
      network,
      seedHex: 'ab'.repeat(32),
      addresses: {
        unshielded: {
          bech32: 'mn_addr1example',
          hex: '12'.repeat(32),
        },
        shielded: {
          bech32: 'mn_shield-addr1example',
          coinPublicKeyBech32: 'mn_shield-cpk1example',
          encryptionPublicKeyBech32: 'mn_shield-epk1example',
        },
        dust: {
          bech32: 'mn_dust1example',
        },
      },
      publicKeys: {
        unshielded: '34'.repeat(32),
        shieldedCoin: '56'.repeat(32),
        shieldedEncryption: '78'.repeat(32),
        dust: '123456789',
      },
      secretKeys: {
        zswap: 'cd'.repeat(32),
        nightExternal: 'ef'.repeat(32),
        dust: '01'.repeat(32),
      },
    }),
  });

  expect(exitCode).toBe(0);
  expect(stderr).toHaveLength(0);
  expect(stdout[0]).not.toContain('\u001b[');
  expect(JSON.parse(stdout[0])).toEqual({
    network: 'mainnet',
    seed: 'ab'.repeat(32),
    addresses: {
      unshielded: {
        bech32: 'mn_addr1example',
        hex: '12'.repeat(32),
      },
      shielded: {
        bech32: 'mn_shield-addr1example',
        coinPublicKeyBech32: 'mn_shield-cpk1example',
        encryptionPublicKeyBech32: 'mn_shield-epk1example',
      },
      dust: {
        bech32: 'mn_dust1example',
      },
    },
    publicKeys: {
      unshielded: '34'.repeat(32),
      shieldedCoin: '56'.repeat(32),
      shieldedEncryption: '78'.repeat(32),
      dust: '123456789',
    },
    secretKeys: {
      zswap: 'cd'.repeat(32),
      nightExternal: 'ef'.repeat(32),
      dust: '01'.repeat(32),
    },
  });
});

test('runCli shows a legend and colorized JSON on a terminal', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  const exitCode = runCli(['--network', 'preview'], {
    stdout: (text) => stdout.push(text),
    stderr: (text) => stderr.push(text),
    stdoutIsTTY: true,
    env: {},
    generateWallet: (network) => ({
      network,
      seedHex: 'ab'.repeat(32),
      addresses: {
        unshielded: {
          bech32: 'mn_addr1example',
          hex: '12'.repeat(32),
        },
        shielded: {
          bech32: 'mn_shield-addr1example',
          coinPublicKeyBech32: 'mn_shield-cpk1example',
          encryptionPublicKeyBech32: 'mn_shield-epk1example',
        },
        dust: {
          bech32: 'mn_dust1example',
        },
      },
      publicKeys: {
        unshielded: '34'.repeat(32),
        shieldedCoin: '56'.repeat(32),
        shieldedEncryption: '78'.repeat(32),
        dust: '123456789',
      },
      secretKeys: {
        zswap: 'cd'.repeat(32),
        nightExternal: 'ef'.repeat(32),
        dust: '01'.repeat(32),
      },
    }),
  });

  expect(exitCode).toBe(0);
  expect(stderr).toHaveLength(1);
  expect(stripAnsi(stderr[0])).toContain('public/shareable: addresses.*, publicKeys.*');
  expect(stripAnsi(stderr[0])).toContain('secret/do not share: seed, secretKeys.zswap, secretKeys.nightExternal, secretKeys.dust');
  expect(stdout[0]).toContain('\u001b[');
  expect(JSON.parse(stripAnsi(stdout[0]))).toEqual({
    network: 'preview',
    seed: 'ab'.repeat(32),
    addresses: {
      unshielded: {
        bech32: 'mn_addr1example',
        hex: '12'.repeat(32),
      },
      shielded: {
        bech32: 'mn_shield-addr1example',
        coinPublicKeyBech32: 'mn_shield-cpk1example',
        encryptionPublicKeyBech32: 'mn_shield-epk1example',
      },
      dust: {
        bech32: 'mn_dust1example',
      },
    },
    publicKeys: {
      unshielded: '34'.repeat(32),
      shieldedCoin: '56'.repeat(32),
      shieldedEncryption: '78'.repeat(32),
      dust: '123456789',
    },
    secretKeys: {
      zswap: 'cd'.repeat(32),
      nightExternal: 'ef'.repeat(32),
      dust: '01'.repeat(32),
    },
  });
});

test('generateMidnightWallet derives keys for a deterministic seed', () => {
  const seed = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
  const wallet = generateMidnightWallet('preview', seed);

  expect(wallet.network).toBe('preview');
  expect(wallet.seedHex).toHaveLength(64);
  expect(wallet.addresses.unshielded.bech32).toStartWith('mn_addr_preview1');
  expect(wallet.addresses.unshielded.hex).toMatch(/^[0-9a-f]+$/);
  expect(wallet.addresses.shielded.bech32).toStartWith('mn_shield-addr_preview1');
  expect(wallet.addresses.shielded.coinPublicKeyBech32).toStartWith('mn_shield-cpk_preview1');
  expect(wallet.addresses.shielded.encryptionPublicKeyBech32).toStartWith('mn_shield-epk_preview1');
  expect(wallet.addresses.dust.bech32).toStartWith('mn_dust_preview1');
  expect(wallet.publicKeys.unshielded).toMatch(/^[0-9a-f]+$/);
  expect(wallet.publicKeys.shieldedCoin).toMatch(/^[0-9a-f]+$/);
  expect(wallet.publicKeys.shieldedEncryption).toMatch(/^[0-9a-f]+$/);
  expect(wallet.publicKeys.dust).toMatch(/^[0-9]+$/);
  expect(wallet.secretKeys.zswap).toMatch(/^[0-9a-f]+$/);
  expect(wallet.secretKeys.nightExternal).toMatch(/^[0-9a-f]+$/);
  expect(wallet.secretKeys.dust).toMatch(/^[0-9a-f]+$/);
});
