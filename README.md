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

## Nix

Run the CLI directly from the repository with:

```sh
nix run github:hlolli/create-midnight-wallet -- --network mainnet
```

From a local checkout:

```sh
nix run . -- --network preprod
```

When dependencies change, regenerate the Nix dependency expression with:

```sh
bunx bun2nix -o bun.nix
```
