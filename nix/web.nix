# Static web export of the app.
{
  lib,
  stdenvNoCC,
  fetchYarnDeps,
  yarnConfigHook,
  nodejs_22,
  # Path prefix the bundle is served under, e.g. "/oh-hell". Baked into the
  # export's asset URLs, so it has to match where it's hosted.
  baseUrl ? "",
}:
stdenvNoCC.mkDerivation (finalAttrs: {
  pname = "oh-hell-web";
  version = (lib.importJSON ../package.json).version;

  src = lib.cleanSourceWith {
    src = ../.;
    filter = path: type: let
      base = baseNameOf path;
    in
      !(builtins.elem base ["android" "ios" "node_modules" "dist" ".expo" ".direnv" ".worktrees" "result"]);
  };

  offlineCache = fetchYarnDeps {
    yarnLock = ../yarn.lock;
    hash = "sha256-ioi7amf8gZfWdBoZl7TZbFptgR64WJlGrQGpBbj+D80=";
  };

  nativeBuildInputs = [yarnConfigHook nodejs_22];

  env = {
    EXPO_NO_TELEMETRY = "1";
    OH_HELL_WEB_BASE_URL = baseUrl;
  };

  buildPhase = ''
    runHook preBuild
    node_modules/.bin/expo export --platform web --output-dir dist
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall
    cp -r dist $out
    runHook postInstall
  '';

  meta = {
    description = "Oh Hell scorekeeper, exported as static files";
    homepage = "https://github.com/colonelpanic8/oh-hell";
    license = lib.licenses.mit;
    platforms = lib.platforms.all;
  };
})
