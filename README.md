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

The command prints JSON containing the selected network, seed, unshielded address, and derived role keys.

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
