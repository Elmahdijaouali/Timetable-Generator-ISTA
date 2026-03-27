import { app, BrowserWindow, Menu, screen } from "electron";
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import { spawn } from "child_process";
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
let win;
let backendProcess = null;
function stopBackend() {
  if (backendProcess) {
    backendProcess.kill("SIGKILL");
    backendProcess = null;
  }
}
function startBackend() {
  const isPackaged = app.isPackaged;
  const backendPath = isPackaged ? path.join(process.resourcesPath, "backend", "index.js") : path.join(__dirname$1, "..", "backend", "index.js");
  backendProcess = spawn(
    process.platform === "win32" ? "node.exe" : "node",
    [backendPath],
    {
      cwd: path.dirname(backendPath),
      stdio: "inherit",
      env: { ...process.env, PORT: "8002" },
      windowsHide: true
      // Hide CMD window on Windows
    }
  );
  backendProcess.on("close", (code) => {
    console.log(`Backend process exited with code ${code}`);
  });
}
function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  win = new BrowserWindow({
    width,
    height,
    icon: path.join(__dirname$1, "..", "public", "logo.png"),
    show: false,
    // Hidden until maximized to avoid flash
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  win.maximize();
  win.show();
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  const isDev = !app.isPackaged;
  if (isDev) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname$1, "..", "dist", "index.html"));
  }
}
async function waitForBackendReady(port = 8002, timeout = 1e4) {
  const start = Date.now();
  const net = await import("net");
  return new Promise((resolve, reject) => {
    (function check() {
      const socket = net.createConnection(port, "127.0.0.1");
      socket.on("connect", () => {
        socket.end();
        resolve(true);
      });
      socket.on("error", () => {
        if (Date.now() - start > timeout) {
          reject(new Error("Backend did not start in time"));
        } else {
          setTimeout(check, 200);
        }
      });
    })();
  });
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
  win = null;
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0 && win === null) {
    createWindow();
  }
});
app.setAppUserModelId("TimetableGenerator");
app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  startBackend();
  try {
    await waitForBackendReady(8002, 1e4);
    createWindow();
  } catch (e) {
    console.error("Backend did not start in time", e);
    createWindow();
  }
});
app.on("before-quit", stopBackend);
app.on("will-quit", stopBackend);
process.on("exit", stopBackend);
process.on("SIGINT", stopBackend);
process.on("SIGTERM", stopBackend);
