{
  description = "Oh Hell scorekeeper: web, desktop, and Android from one Expo app";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  }:
    flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = import nixpkgs {
          inherit system;
          config = {
            allowUnfree = true;
            android_sdk.accept_license = true;
          };
        };
        lib = pkgs.lib;
        isLinux = pkgs.stdenv.hostPlatform.isLinux;
        nodejs = pkgs.nodejs_22;

        devTools = [
          nodejs
          pkgs.yarn
          pkgs.just
          pkgs.alejandra
        ];

        androidBuildToolsVersion = "36.0.0";
        androidCmdLineToolsVersion = "19.0";
        androidComposition = pkgs.androidenv.composeAndroidPackages {
          cmdLineToolsVersion = androidCmdLineToolsVersion;
          buildToolsVersions = ["35.0.0" androidBuildToolsVersion];
          includeEmulator = false;
          platformVersions = ["35" "36"];
          includeSources = false;
          includeSystemImages = false;
          includeNDK = true;
          ndkVersions = ["27.1.12297006"];
          cmakeVersions = ["3.22.1"];
        };
        androidHome = "${androidComposition.androidsdk}/libexec/android-sdk";
      in {
        formatter = pkgs.alejandra;

        packages =
          rec {
            web = pkgs.callPackage ./nix/web.nix {};
            default = web;
          }
          // lib.optionalAttrs isLinux {
            desktop = pkgs.callPackage ./nix/desktop.nix {oh-hell-web = self.packages.${system}.web;};
          };

        devShells =
          {
            default = pkgs.mkShell {
              packages = devTools;
              shellHook = ''
                export PATH="$PWD/node_modules/.bin:$PATH"
              '';
            };
          }
          // lib.optionalAttrs isLinux {
            android = pkgs.mkShell {
              packages = devTools ++ [pkgs.jdk17];
              ANDROID_HOME = androidHome;
              ANDROID_SDK_ROOT = androidHome;
              JAVA_HOME = pkgs.jdk17.home;
              GRADLE_OPTS = "-Dorg.gradle.project.android.aapt2FromMavenOverride=${androidHome}/build-tools/${androidBuildToolsVersion}/aapt2";
              shellHook = ''
                export PATH="$PWD/node_modules/.bin:${androidHome}/platform-tools:$PATH"
              '';
            };
          };
      }
    );
}
