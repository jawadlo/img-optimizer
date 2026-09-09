import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { writeFile } from 'node:fs/promises'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import iconPng from '../../resources/icon.png?asset'
import iconIco from '../../resources/icon.ico?asset'
import { encode, type EncodeRequest } from './encode'
import { loadFromBytes, loadFromPath } from './working'

const OPEN_FILTERS = [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'] }]

function isAllowedExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return (
      parsed.protocol === 'https:' &&
      (parsed.hostname === 'jawadlo.com' || parsed.hostname === 'www.jawadlo.com')
    )
  } catch {
    return false
  }
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 880,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'Image Optimizer',
    ...(process.platform !== 'darwin'
      ? { icon: process.platform === 'win32' ? iconIco : iconPng }
      : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (isAllowedExternalUrl(details.url)) {
      void shell.openExternal(details.url)
    }
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.imgoptimizer.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('working:open', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: OPEN_FILTERS
    })
    if (result.canceled || !result.filePaths[0]) {
      return null
    }
    return loadFromPath(result.filePaths[0])
  })

  ipcMain.handle('working:fromPath', async (_event, filePath: string) => {
    return loadFromPath(filePath)
  })

  ipcMain.handle(
    'working:fromBytes',
    async (_event, payload: { name: string; bytes: Uint8Array }) => {
      return loadFromBytes(payload.name, payload.bytes)
    }
  )

  ipcMain.handle('encode:run', async (_event, request: EncodeRequest) => {
    const result = await encode(request)
    return {
      bytes: new Uint8Array(result.bytes),
      byteLength: result.byteLength,
      width: result.width,
      height: result.height
    }
  })

  ipcMain.handle(
    'export:save',
    async (
      _event,
      payload: { defaultName: string; bytes: Uint8Array; format: 'jpeg' | 'png' | 'webp' }
    ) => {
      const ext = payload.format === 'jpeg' ? 'jpg' : payload.format
      const result = await dialog.showSaveDialog({
        defaultPath: payload.defaultName,
        filters: [{ name: payload.format.toUpperCase(), extensions: [ext] }]
      })
      if (result.canceled || !result.filePath) {
        return 'cancelled'
      }
      await writeFile(result.filePath, Buffer.from(payload.bytes))
      return 'saved'
    }
  )

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
