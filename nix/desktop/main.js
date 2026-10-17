// Electron shell around the static web export (nix/web.nix).
const { app, BrowserWindow, net, protocol, shell } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const webRoot = path.resolve(process.env.OH_HELL_WEB_ROOT);
const appOrigin = "app://oh-hell";

// A fixed, secure origin keeps localStorage (where games live) stable across runs.
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);

async function isFile(file) {
  try {
    return (await fs.stat(file)).isFile();
  } catch {
    return false;
  }
}

// Serve the file if it exists, otherwise index.html for the client router.
async function resolveFile(pathname) {
  const file = path.join(webRoot, decodeURIComponent(pathname));
  if (file.startsWith(`${webRoot}${path.sep}`) && (await isFile(file))) {
    return file;
  }
  return path.join(webRoot, "index.html");
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 850,
    title: "Oh Hell",
    autoHideMenuBar: true,
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.loadURL(`${appOrigin}/`);
  return win;
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let mainWindow;
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });
  app.whenReady().then(() => {
    protocol.handle("app", async (request) => {
      const file = await resolveFile(new URL(request.url).pathname);
      return net.fetch(pathToFileURL(file).toString());
    });
    mainWindow = createWindow();
  });
  app.on("window-all-closed", () => app.quit());
}
