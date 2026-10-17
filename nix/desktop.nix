# Linux desktop app: an Electron window around the static web export.
{
  lib,
  stdenvNoCC,
  electron,
  makeWrapper,
  makeDesktopItem,
  copyDesktopItems,
  oh-hell-web,
}:
stdenvNoCC.mkDerivation {
  pname = "oh-hell-desktop";
  inherit (oh-hell-web) version;

  src = ./desktop;

  nativeBuildInputs = [makeWrapper copyDesktopItems];

  desktopItems = [
    (makeDesktopItem {
      name = "oh-hell";
      desktopName = "Oh Hell";
      genericName = "Scorekeeper";
      comment = "Keep score for the card game Oh Hell";
      exec = "oh-hell";
      startupWMClass = "oh-hell";
      categories = ["Game" "CardGame"];
    })
  ];

  installPhase = ''
    runHook preInstall
    mkdir -p $out/share/oh-hell
    cp main.js package.json $out/share/oh-hell/
    makeWrapper ${lib.getExe electron} $out/bin/oh-hell \
      --add-flags $out/share/oh-hell \
      --set OH_HELL_WEB_ROOT ${oh-hell-web}
    runHook postInstall
  '';

  meta = {
    description = "Oh Hell scorekeeper desktop app";
    homepage = "https://github.com/colonelpanic8/oh-hell";
    license = lib.licenses.mit;
    mainProgram = "oh-hell";
    platforms = lib.platforms.linux;
  };
}
