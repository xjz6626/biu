import { BrowserWindow } from "electron";
import isDev from "electron-is-dev";
import Store from "electron-store";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { channel } from "../ipc/channel";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_WIDTH = 900;
const DEFAULT_HEIGHT = 220;
const MIN_WIDTH = 640;
const MIN_HEIGHT = 190;

const desktopLyricsStore = new Store({
  name: "desktop-lyrics-settings",
  defaults: {
    bounds: { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT },
  },
});

let desktopLyricsWindow: BrowserWindow | null = null;
let isDesktopLyricsLocked = false;
let keepOnTopTimer: NodeJS.Timeout | null = null;

const getSavedBounds = () => {
  const bounds = desktopLyricsStore.get("bounds") as Electron.Rectangle | undefined;
  return {
    height: Math.max(bounds?.height || DEFAULT_HEIGHT, MIN_HEIGHT),
    width: Math.max(bounds?.width || DEFAULT_WIDTH, MIN_WIDTH),
    x: bounds?.x,
    y: bounds?.y,
  };
};

const saveDesktopLyricsBounds = () => {
  if (desktopLyricsWindow && !desktopLyricsWindow.isDestroyed()) {
    desktopLyricsStore.set("bounds", desktopLyricsWindow.getBounds());
  }
};

const applyDesktopLyricsAlwaysOnTop = () => {
  if (!desktopLyricsWindow || desktopLyricsWindow.isDestroyed()) return;

  desktopLyricsWindow.setAlwaysOnTop(true, "screen-saver", 1);
  desktopLyricsWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  desktopLyricsWindow.moveTop();
};

const startKeepOnTopTimer = () => {
  if (keepOnTopTimer) return;

  keepOnTopTimer = setInterval(applyDesktopLyricsAlwaysOnTop, 1500);
};

const stopKeepOnTopTimer = () => {
  if (!keepOnTopTimer) return;

  clearInterval(keepOnTopTimer);
  keepOnTopTimer = null;
};

const createDesktopLyricsWindow = () => {
  const savedBounds = getSavedBounds();
  const hasSavedPosition = typeof savedBounds.x === "number" && typeof savedBounds.y === "number";

  desktopLyricsWindow = new BrowserWindow({
    title: "Biu Desktop Lyrics",
    show: false, // 阻止初次白屏闪烁
    backgroundColor: "#00000000", // 透明背景
    width: savedBounds.width,
    height: savedBounds.height,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    x: savedBounds.x,
    y: savedBounds.y,
    resizable: true, // Allow user to resize it horizontally/vertically if needed
    roundedCorners: false,
    center: !hasSavedPosition,
    frame: false,
    transparent: true,
    hasShadow: false, // Better for lock through without shadow box
    alwaysOnTop: true,
    type: process.platform === "linux" ? "notification" : "toolbar",
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      webSecurity: true,
      contextIsolation: true,
      nodeIntegration: false,
      devTools: isDev,
    },
  });

  applyDesktopLyricsAlwaysOnTop();

  desktopLyricsWindow.webContents.setWindowOpenHandler(() => {
    return { action: "deny" };
  });

  desktopLyricsWindow.webContents.on("before-input-event", (event, input) => {
    if ((input.control || input.meta) && input.key.toLowerCase() === "r") {
      event.preventDefault();
    }
  });

  desktopLyricsWindow.webContents.on("context-menu", e => {
    e.preventDefault(); // hide default context menu
  });

  // Load the React route explicitly for desktop-lyrics
  const indexPath = path.resolve(__dirname, "../dist/web/index.html");
  desktopLyricsWindow.loadFile(indexPath, { hash: "desktop-lyrics" });

  desktopLyricsWindow.once("ready-to-show", () => {
    desktopLyricsWindow?.show();
    applyDesktopLyricsAlwaysOnTop();
    startKeepOnTopTimer();
  });

  desktopLyricsWindow.on("move", saveDesktopLyricsBounds);
  desktopLyricsWindow.on("resize", saveDesktopLyricsBounds);
  desktopLyricsWindow.on("close", saveDesktopLyricsBounds);
  desktopLyricsWindow.on("show", applyDesktopLyricsAlwaysOnTop);
  desktopLyricsWindow.on("focus", applyDesktopLyricsAlwaysOnTop);
  desktopLyricsWindow.on("blur", applyDesktopLyricsAlwaysOnTop);

  // Set initial lock state
  updateDesktopLyricsLockStatus(false);
};

const destroyDesktopLyricsWindow = () => {
  if (desktopLyricsWindow) {
    if (!desktopLyricsWindow.isDestroyed()) {
      saveDesktopLyricsBounds();
      stopKeepOnTopTimer();
      desktopLyricsWindow.destroy();
    }
    desktopLyricsWindow = null;
  }
};

const updateDesktopLyricsLockStatus = (locked: boolean) => {
  isDesktopLyricsLocked = locked;
  if (desktopLyricsWindow && !desktopLyricsWindow.isDestroyed()) {
    desktopLyricsWindow.setIgnoreMouseEvents(locked, { forward: true });
    desktopLyricsWindow.webContents.send(channel.window.onDesktopLyricsLockChange, locked);
  }
};

const toggleDesktopLyricsWindow = () => {
  if (desktopLyricsWindow && !desktopLyricsWindow.isDestroyed()) {
    destroyDesktopLyricsWindow();
  } else {
    createDesktopLyricsWindow();
  }
};

const getDesktopLyricsWindow = () => desktopLyricsWindow;
const getDesktopLyricsLockStatus = () => isDesktopLyricsLocked;

export {
  desktopLyricsWindow,
  createDesktopLyricsWindow,
  destroyDesktopLyricsWindow,
  toggleDesktopLyricsWindow,
  updateDesktopLyricsLockStatus,
  getDesktopLyricsWindow,
  getDesktopLyricsLockStatus,
};
