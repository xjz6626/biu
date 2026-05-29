import { BrowserWindow } from "electron";
import isDev from "electron-is-dev";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let miniPlayer: BrowserWindow | null = null;

/** 记住迷你播放器的窗口位置，切换回来时恢复 */
let savedBounds: { x: number; y: number } | null = null;

const MINI_WIDTH = 320;
const MINI_HEIGHT_DEFAULT = 100;
const MINI_HEIGHT_EXPANDED = 140;

const createMiniPlayer = () => {
  miniPlayer = new BrowserWindow({
    title: "Biu Mini Player",
    show: true,
    hasShadow: true,
    width: MINI_WIDTH,
    height: MINI_HEIGHT_DEFAULT,
    resizable: true,
    roundedCorners: false,
    center: !savedBounds,
    // 隐藏窗口标题栏和窗口按钮
    frame: false,
    transparent: true,
    titleBarOverlay: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      webSecurity: true,
      contextIsolation: true,
      nodeIntegration: false,
      devTools: isDev,
    },
  });

  miniPlayer.webContents.setWindowOpenHandler(() => {
    return { action: "deny" };
  });

  miniPlayer.webContents.on("before-input-event", (event, input) => {
    if ((input.control || input.meta) && input.key.toLowerCase() === "r") {
      event.preventDefault();
    }
  });

  miniPlayer.webContents.on("context-menu", e => {
    e.preventDefault();
  });

  if (process.platform === "win32") {
    // 拦截 WM_INITMENU (0x0116) 消息，阻止系统菜单
    miniPlayer.hookWindowMessage(0x0116, () => {
      miniPlayer?.setEnabled(false);
      setTimeout(() => {
        miniPlayer?.setEnabled(true);
      }, 100);
      return true;
    });
  }

  // 恢复上一次保存的位置
  if (savedBounds) {
    miniPlayer.setPosition(savedBounds.x, savedBounds.y);
  }

  // 移动时记住位置
  miniPlayer.on("move", () => {
    if (!miniPlayer || miniPlayer.isDestroyed()) return;
    const [x, y] = miniPlayer.getPosition();
    savedBounds = { x, y };
  });

  const indexPath = path.resolve(__dirname, "../dist/web/index.html");
  miniPlayer.loadFile(indexPath, { hash: "mini-player" });
};

const setMiniSize = (expanded: boolean) => {
  if (!miniPlayer || miniPlayer.isDestroyed()) return;
  const bounds = miniPlayer.getBounds();
  const newHeight = expanded ? MINI_HEIGHT_EXPANDED : MINI_HEIGHT_DEFAULT;
  miniPlayer.setBounds({ x: bounds.x, y: bounds.y, width: MINI_WIDTH, height: newHeight });
};

const destroyMiniPlayer = () => {
  if (miniPlayer) {
    if (!miniPlayer.isDestroyed()) {
      miniPlayer.destroy();
    }
    miniPlayer = null;
  }
};

export { miniPlayer, createMiniPlayer, destroyMiniPlayer, setMiniSize };
