{
  description = "Oh Hell scoring app: web (self-hosted), desktop, and Android";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    fenix = {
      url = "github:nix-community/fenix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    fenix,
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
        fenixPkgs = fenix.packages.${system};
        isLinux = pkgs.stdenv.hostPlatform.isLinux;
        isDarwin = pkgs.stdenv.hostPlatform.isDarwin;

        appVersion = (builtins.fromTOML (builtins.readFile ./Cargo.toml)).workspace.package.version;
        appId = "org.colonelpanic.ohhell";

        src = lib.cleanSourceWith {
          src = ./.;
          filter = path: type: let
            base = baseNameOf path;
          in
            !(builtins.elem base [".git" ".github" ".direnv" ".worktrees" "target" "dist" "result" ".envrc"]);
        };

        toolchain = fenixPkgs.combine ([
            fenixPkgs.stable.cargo
            fenixPkgs.stable.clippy
            fenixPkgs.stable.rust-src
            fenixPkgs.stable.rustc
            fenixPkgs.stable.rustfmt
            fenixPkgs.stable.rust-analyzer
            fenixPkgs.targets.wasm32-unknown-unknown.stable.rust-std
          ]
          ++ lib.optionals isLinux [
            fenixPkgs.targets.aarch64-linux-android.stable.rust-std
          ]);
        rustPlatform = pkgs.makeRustPlatform {
          cargo = toolchain;
          rustc = toolchain;
        };

        dioxusLinuxBuildInputs = lib.optionals isLinux [
          pkgs.glib
          pkgs.gtk3
          pkgs.libsoup_3
          pkgs.openssl
          pkgs.webkitgtk_4_1
          pkgs.xdotool
        ];
        dioxusDarwinBuildInputs = lib.optionals isDarwin [pkgs.apple-sdk_15];

        mkPackage = {
          pname,
          cargoPackage,
          buildFeatures ? [],
          buildNoDefaultFeatures ? false,
          extraBuildInputs ? [],
          extraNativeBuildInputs ? [],
        }:
          rustPlatform.buildRustPackage {
            inherit pname src buildFeatures buildNoDefaultFeatures;
            version = appVersion;
            cargoLock.lockFile = ./Cargo.lock;
            cargoBuildFlags = ["-p" cargoPackage];
            cargoTestFlags = ["-p" cargoPackage];
            nativeBuildInputs = [pkgs.pkg-config] ++ extraNativeBuildInputs;
            buildInputs = extraBuildInputs;
          };

        server = mkPackage {
          pname = "oh-hell-server";
          cargoPackage = "oh-hell-server";
        };
        desktop = mkPackage {
          pname = "oh-hell-desktop";
          cargoPackage = "oh-hell-app";
          buildNoDefaultFeatures = true;
          buildFeatures = ["desktop"];
          extraNativeBuildInputs = lib.optionals isLinux [pkgs.wrapGAppsHook3];
          extraBuildInputs = dioxusLinuxBuildInputs ++ dioxusDarwinBuildInputs;
        };

        androidNdkVersion = "29.0.14206865";
        androidBuildToolsVersion = "36.1.0";
        androidCmdLineToolsVersion = "19.0";
        androidComposition = pkgs.androidenv.composeAndroidPackages {
          cmdLineToolsVersion = androidCmdLineToolsVersion;
          platformToolsVersion = "36.0.2";
          buildToolsVersions = ["34.0.0" androidBuildToolsVersion];
          includeEmulator = false;
          # dx generates its Gradle project against older SDKs first.
          platformVersions = ["33" "34" "36"];
          includeSources = false;
          includeSystemImages = false;
          abiVersions = ["arm64-v8a"];
          includeNDK = true;
          ndkVersions = [androidNdkVersion];
          cmakeVersions = ["3.22.1"];
        };
        androidHome = "${androidComposition.androidsdk}/libexec/android-sdk";
        androidNdkHome = "${androidHome}/ndk/${androidNdkVersion}";
        androidLlvmBin = "${androidNdkHome}/toolchains/llvm/prebuilt/linux-x86_64/bin";

        devTools = [
          toolchain
          pkgs.pkg-config
          pkgs.binaryen
          pkgs.dioxus-cli
          pkgs.wasm-bindgen-cli_0_2_118
          pkgs.just
          pkgs.jq
          pkgs.alejandra
        ];
      in {
        formatter = pkgs.alejandra;

        packages =
          {
            default = server;
            oh-hell-server = server;
          }
          // lib.optionalAttrs (isLinux || isDarwin) {
            oh-hell-desktop = desktop;
          };

        devShells =
          {
            default = pkgs.mkShell {
              packages = devTools ++ dioxusLinuxBuildInputs ++ dioxusDarwinBuildInputs;
              WEBKIT_DISABLE_DMABUF_RENDERER = "1";
            };
          }
          // lib.optionalAttrs isLinux {
            android = pkgs.mkShell {
              packages = devTools ++ dioxusLinuxBuildInputs ++ [pkgs.jdk17 pkgs.gradle_9];
              ANDROID_HOME = androidHome;
              ANDROID_SDK_ROOT = androidHome;
              ANDROID_NDK_HOME = androidNdkHome;
              NDK_HOME = androidNdkHome;
              CARGO_TARGET_AARCH64_LINUX_ANDROID_LINKER = "${androidLlvmBin}/aarch64-linux-android24-clang";
              CARGO_TARGET_AARCH64_LINUX_ANDROID_RUSTFLAGS = "-C link-arg=-Wl,-z,max-page-size=16384 -C link-arg=-Wl,-z,common-page-size=16384";
              CC_aarch64_linux_android = "${androidLlvmBin}/aarch64-linux-android24-clang";
              AR_aarch64_linux_android = "${androidLlvmBin}/llvm-ar";
              GRADLE_OPTS = "-Dorg.gradle.project.android.aapt2FromMavenOverride=${androidHome}/build-tools/${androidBuildToolsVersion}/aapt2";
              JAVA_HOME = pkgs.jdk17.home;
              shellHook = ''
                export PATH=${androidHome}/platform-tools:${androidHome}/cmdline-tools/${androidCmdLineToolsVersion}/bin:$PATH
              '';
            };
          };
      }
    )
    // {
      nixosModules.default = import ./nix/module.nix self;
    };
}
