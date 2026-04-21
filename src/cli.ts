import { generateMidnightWallet, isNetworkId, type DerivedWallet, type NetworkId } from './wallet.js';

export class CliUsageError extends Error {}

export type CliOptions = {
  help: boolean;
  network: NetworkId;
};

type WalletOutput = {
  network: NetworkId;
  seed: string;
  addresses: {
    unshieldedBech32: string;
  };
  keys: DerivedWallet['roleKeysHex'];
};

type CliRuntime = {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  stdoutIsTTY: boolean;
  env: NodeJS.ProcessEnv;
  generateWallet: (networkId: NetworkId) => DerivedWallet;
};

const DEFAULT_NETWORK: NetworkId = 'preprod';
const ANSI = {
  reset: '\u001b[0m',
  bold: '\u001b[1m',
  dim: '\u001b[2m',
  red: '\u001b[31m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  blue: '\u001b[34m',
  cyan: '\u001b[36m',
} as const;

function usage(): string {
  return [
    'Usage: create-midnight-wallet [--network <preview|preprod|mainnet>]',
    '',
    'Options:',
    '  -n, --network   Network id for the derived unshielded address.',
    '  -h, --help      Show this help message.',
  ].join('\n');
}

function readNetworkValue(args: string[], index: number): [string, number] {
  const value = args[index + 1];

  if (!value) {
    throw new CliUsageError('Missing value for --network');
  }

  return [value, index + 1];
}

export function parseArgs(args: string[]): CliOptions {
  let network = DEFAULT_NETWORK;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help' || arg === '-h') {
      return { help: true, network };
    }

    if (arg === '--network' || arg === '-n') {
      const [value, nextIndex] = readNetworkValue(args, index);

      if (!isNetworkId(value)) {
        throw new CliUsageError(`Invalid network id: ${value}`);
      }

      network = value;
      index = nextIndex;
      continue;
    }

    if (arg.startsWith('--network=')) {
      const value = arg.slice('--network='.length);

      if (!isNetworkId(value)) {
        throw new CliUsageError(`Invalid network id: ${value}`);
      }

      network = value;
      continue;
    }

    throw new CliUsageError(`Unknown argument: ${arg}`);
  }

  return { help: false, network };
}

function createOutput(wallet: DerivedWallet): WalletOutput {
  return {
    network: wallet.network,
    seed: wallet.seedHex,
    addresses: {
      unshieldedBech32: wallet.unshieldedAddressBech32,
    },
    keys: wallet.roleKeysHex,
  };
}

function shouldUseColor(stdoutIsTTY: boolean, env: NodeJS.ProcessEnv): boolean {
  if (env.NO_COLOR !== undefined || env.FORCE_COLOR === '0') {
    return false;
  }

  if (env.FORCE_COLOR && env.FORCE_COLOR !== '0') {
    return true;
  }

  return stdoutIsTTY;
}

function paint(text: string, color: string, enabled: boolean): string {
  return enabled ? `${color}${text}${ANSI.reset}` : text;
}

function renderLegend(colorEnabled: boolean): string {
  const commentPrefix = paint('#', ANSI.dim, colorEnabled);

  return [
    `${commentPrefix} ${paint('Output guide', `${ANSI.bold}${ANSI.cyan}`, colorEnabled)}`,
    `${commentPrefix} ${paint('public/shareable', ANSI.green, colorEnabled)}: addresses.unshieldedBech32`,
    `${commentPrefix} ${paint('secret/do not share', ANSI.red, colorEnabled)}: seed, keys.zswap, keys.nightExternal, keys.dust`,
    `${commentPrefix} No private addresses are printed here. The unshielded bech32 address is public; the seed and all listed keys are sensitive.`,
  ].join('\n');
}

function colorizeJson(json: string): string {
  return json.replace(
    /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (token) => {
      if (token.startsWith('"')) {
        return token.endsWith(':')
          ? `${ANSI.blue}${token}${ANSI.reset}`
          : `${ANSI.green}${token}${ANSI.reset}`;
      }

      if (token === 'true' || token === 'false') {
        return `${ANSI.yellow}${token}${ANSI.reset}`;
      }

      if (token === 'null') {
        return `${ANSI.dim}${token}${ANSI.reset}`;
      }

      return `${ANSI.cyan}${token}${ANSI.reset}`;
    },
  );
}

export function runCli(args: string[], runtime?: Partial<CliRuntime>): number {
  const stdout = runtime?.stdout ?? console.log;
  const stderr = runtime?.stderr ?? console.error;
  const stdoutIsTTY = runtime?.stdoutIsTTY ?? (runtime?.stdout ? false : Boolean(process.stdout.isTTY));
  const env = runtime?.env ?? process.env;
  const generateWallet = runtime?.generateWallet ?? generateMidnightWallet;

  try {
    const options = parseArgs(args);

    if (options.help) {
      stdout(usage());
      return 0;
    }

    const wallet = generateWallet(options.network);
    const output = createOutput(wallet);
    const colorEnabled = shouldUseColor(stdoutIsTTY, env);
    const jsonOutput = JSON.stringify(output, null, 2);

    if (stdoutIsTTY) {
      stderr(renderLegend(colorEnabled));
    }

    stdout(colorEnabled ? colorizeJson(jsonOutput) : jsonOutput);

    return 0;
  } catch (error) {
    if (error instanceof CliUsageError) {
      stderr(`${error.message}\n\n${usage()}`);
      return 1;
    }

    const message = error instanceof Error ? error.message : String(error);
    stderr(`Failed to generate wallet: ${message}`);
    return 1;
  }
}
