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
      unshieldedAddressBech32: 'midnight1example',
      roleKeysHex: {
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
      unshieldedBech32: 'midnight1example',
    },
    keys: {
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
      unshieldedAddressBech32: 'midnight1example',
      roleKeysHex: {
        zswap: 'cd'.repeat(32),
        nightExternal: 'ef'.repeat(32),
        dust: '01'.repeat(32),
      },
    }),
  });

  expect(exitCode).toBe(0);
  expect(stderr).toHaveLength(1);
  expect(stripAnsi(stderr[0])).toContain('public/shareable: addresses.unshieldedBech32');
  expect(stripAnsi(stderr[0])).toContain('secret/do not share: seed, keys.zswap, keys.nightExternal, keys.dust');
  expect(stdout[0]).toContain('\u001b[');
  expect(JSON.parse(stripAnsi(stdout[0]))).toEqual({
    network: 'preview',
    seed: 'ab'.repeat(32),
    addresses: {
      unshieldedBech32: 'midnight1example',
    },
    keys: {
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
  expect(wallet.unshieldedAddressBech32.length).toBeGreaterThan(0);
  expect(wallet.roleKeysHex.zswap).toMatch(/^[0-9a-f]+$/);
  expect(wallet.roleKeysHex.nightExternal).toMatch(/^[0-9a-f]+$/);
  expect(wallet.roleKeysHex.dust).toMatch(/^[0-9a-f]+$/);
});
