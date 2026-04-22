{
  description = "Generate Midnight wallet addresses from the command line";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";

    bun2nix.url = "github:nix-community/bun2nix?tag=2.0.8";
    bun2nix.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      bun2nix,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ bun2nix.overlays.default ];
        };

        package = pkgs.callPackage ./default.nix { };
      in
      {
        packages = {
          default = package;
          create-midnight-wallet = package;
        };

        apps = {
          default = {
            type = "app";
            program = "${package}/bin/create-midnight-wallet";
          };
          create-midnight-wallet = {
            type = "app";
            program = "${package}/bin/create-midnight-wallet";
          };
        };

        checks.default = package;

        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            bun
            bun2nix
          ];

          shellHook = ''
            bun install --frozen-lockfile
          '';
        };
      }
    );
}
