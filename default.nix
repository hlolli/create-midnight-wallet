{ bun2nix, ... }:

bun2nix.writeBunApplication {
  packageJson = ./package.json;
  src = ./.;

  bunDeps = bun2nix.fetchBunDeps {
    bunNix = ./bun.nix;
  };

  dontUseBunCheck = true;

  buildPhase = ''
    runHook preBuild
    bun run build
    runHook postBuild
  '';

  startScript = ''
    exec bun ./dist/bin.js "$@"
  '';
}
