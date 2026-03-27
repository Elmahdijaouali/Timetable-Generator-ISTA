import { app, BrowserWindow, Menu, screen } from "electron";
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import { spawn } from "child_process";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let win;
let backendProcess = null;
function stopBackend() {
    if (backendProcess) {
        backendProcess.kill('SIGKILL'); // Stronger signal
        backendProcess = null;
    }
}
function startBackend() {
    const isPackaged = app.isPackaged;
    const backendPath = isPackaged
        ? path.join(process.resourcesPath, "backend", "index.js")
        : path.join(__dirname, "..", "backend", "index.js");
    backendProcess = spawn(process.platform === "win32" ? "node.exe" : "node", [backendPath], {
        cwd: path.dirname(backendPath),
        stdio: "inherit",
        env: { ...process.env, PORT: "8002" },
        windowsHide: true // Hide CMD window on Windows
    });
    backendProcess.on("close", (code) => {
        console.log(`Backend process exited with code ${code}`);
    });
}
function createWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    win = new BrowserWindow({
        width,
        height,
        icon: path.join(__dirname, "..", "public", "logo.png"),
        show: false, // Hidden until maximized to avoid flash
        webPreferences: {
            preload: path.join(__dirname, "preload.mjs"),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    win.maximize(); // Ensure maximized state is set
    win.show(); // Show already at full size
    win.webContents.on("did-finish-load", () => {
        win?.webContents.send("main-process-message", new Date().toLocaleString());
        // win?.webContents.openDevTools(); // Disabled for production
    });
    // Load from Vite dev server in development, built files in production
    const isDev = !app.isPackaged;
    if (isDev) {
        win.loadURL("http://localhost:5173");
    }
    else {
        win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
    }
}
// Wait for backend to be ready before creating the window
async function waitForBackendReady(port = 8002, timeout = 10000) {
    const start = Date.now();
    const net = await import('net');
    return new Promise((resolve, reject) => {
        (function check() {
            const socket = net.createConnection(port, '127.0.0.1');
            socket.on('connect', () => {
                socket.end();
                resolve(true);
            });
            socket.on('error', () => {
                if (Date.now() - start > timeout) {
                    reject(new Error('Backend did not start in time'));
                }
                else {
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
    win = null; // Always clear window reference
});
app.on("activate", () => {
    // Only create window if no windows exist and app is ready
    if (BrowserWindow.getAllWindows().length === 0 && win === null) {
        createWindow();
    }
});
app.setAppUserModelId("TimetableGenerator");
app.whenReady().then(async () => {
    // Remove the default menu (Help, View, etc.)
    Menu.setApplicationMenu(null);
    startBackend();
    try {
        await waitForBackendReady(8002, 10000);
        createWindow();
    }
    catch (e) {
        console.error('Backend did not start in time', e);
        createWindow(); // Still show window, but backend may not work
    }
});
app.on("before-quit", stopBackend);
app.on("will-quit", stopBackend);
process.on("exit", stopBackend);
process.on("SIGINT", stopBackend);
process.on("SIGTERM", stopBackend);
//# sourceMappingURL=main.js.map