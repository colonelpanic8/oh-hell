self: {
  config,
  lib,
  pkgs,
  ...
}: let
  cfg = config.services.oh-hell;
in {
  options.services.oh-hell = {
    enable = lib.mkEnableOption "the Oh Hell scoring server";

    package = lib.mkOption {
      type = lib.types.package;
      default = self.packages.${pkgs.stdenv.hostPlatform.system}.oh-hell-server;
      description = "Server package to run.";
    };

    bind = lib.mkOption {
      type = lib.types.str;
      default = "127.0.0.1:8080";
      description = "Address the HTTP server listens on; front it with a reverse proxy.";
    };

    webDir = lib.mkOption {
      type = lib.types.nullOr lib.types.path;
      default = null;
      description = "Built Dioxus web client to serve at `/`.";
    };
  };

  config = lib.mkIf cfg.enable {
    systemd.services.oh-hell = {
      description = "Oh Hell scoring server";
      wantedBy = ["multi-user.target"];
      after = ["network.target"];
      environment =
        {
          OH_HELL_BIND = cfg.bind;
        }
        // lib.optionalAttrs (cfg.webDir != null) {
          OH_HELL_WEB_DIR = toString cfg.webDir;
        };
      serviceConfig = {
        ExecStart = lib.getExe' cfg.package "oh-hell-server";
        DynamicUser = true;
        StateDirectory = "oh-hell";
        Restart = "on-failure";
        NoNewPrivileges = true;
        ProtectSystem = "strict";
        ProtectHome = true;
        PrivateTmp = true;
      };
    };
  };
}
