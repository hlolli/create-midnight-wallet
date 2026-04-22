# create-midnight-wallet

Generate a Midnight wallet from the command line.

## Usage

```sh
npx create-midnight-wallet --network preprod
```

Supported network ids:

- `preview`
- `preprod`
- `mainnet`

The command prints JSON containing:

- public unshielded, shielded, and Dust addresses
- related public keys
- the seed and derived secret keys

Treat `seed` and `secretKeys` as wallet control material.

## Development

```sh
bun install
bun test
bun run build
node dist/bin.js --network preview
```

## Publish

```sh
bun publish --dry-run
bun publish
```
