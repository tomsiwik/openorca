import { contextBridge, ipcRenderer } from 'electron'

declare global {
  interface Window {
    api: typeof api
  }
}

// Server info — resolved once, cached forever. Two paths race:
// 1. Eager IPC invoke (for when server is already running)
// 2. Push from main process (for when server starts after preload)
type ServerInfo = { url: string; token: string }
let _serverInfo: ServerInfo | null = null
const _serverReadyWaiters: Array<(info: ServerInfo) => void> = []

function _resolveServerInfo(info: ServerInfo) {
  if (_serverInfo) return // already resolved
  _serverInfo = info
  for (const resolve of _serverReadyWaiters) resolve(info)
  _serverReadyWaiters.length = 0
}

// Path 1: Push from main
ipcRenderer.on('server-ready', (_: any, info: ServerInfo) => _resolveServerInfo(info))

// Path 2: Eager request — if server is already up, resolves immediately
ipcRenderer.invoke('get-server-info').then((info: ServerInfo | null) => {
  if (info) _resolveServerInfo(info)
})

const api = {
  // Server connection — resolves instantly if info already pushed, else waits for push
  getServerInfo: (): Promise<{ url: string; token: string }> => {
    if (_serverInfo) return Promise.resolve(_serverInfo)
    return new Promise((resolve) => { _serverReadyWaiters.push(resolve) })
  },

  // Config
  getConfig: () => ipcRenderer.invoke('get-config'),
  getKeymaps: () => ipcRenderer.invoke('get-keymaps') as Promise<Record<string, string[]>>,
  getRawConfig: () => ipcRenderer.invoke('get-raw-config') as Promise<Record<string, any>>,
  saveRawConfig: (config: Record<string, any>) => ipcRenderer.invoke('save-raw-config', config) as Promise<{ ok: boolean; error?: string }>,
  openConfig: () => ipcRenderer.send('open-config'),
  onConfigChange: (cb: (config: any) => void) => {
    const handler = (_: any, config: any) => cb(config)
    ipcRenderer.on('config-change', handler)
    return () => { ipcRenderer.removeListener('config-change', handler) }
  },

  // Window
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized') as Promise<boolean>,
  toggleFullScreen: () => ipcRenderer.send('window-toggle-fullscreen'),
  toggleKeepOnTop: () => ipcRenderer.send('window-toggle-keep-on-top'),
  devtools: () => ipcRenderer.send('window-devtools'),
  reload: () => ipcRenderer.send('window-reload'),
  reloadFull: () => ipcRenderer.send('window-reload-full'),
  onMaximizeChange: (cb: (maximized: boolean) => void) => {
    const handler = (_: any, v: boolean) => cb(v)
    ipcRenderer.on('maximize-change', handler)
    return () => { ipcRenderer.removeListener('maximize-change', handler) }
  },

  // Window focus
  onWindowFocus: (cb: (focused: boolean) => void) => {
    const handler = (_: any, focused: boolean) => cb(focused)
    ipcRenderer.on('window-focus', handler)
    return () => { ipcRenderer.removeListener('window-focus', handler) }
  },

  // Commands (keybinding actions from main -> renderer)
  onCommand: (cb: (command: string) => void) => {
    const handler = (_: any, cmd: string) => cb(cmd)
    ipcRenderer.on('command', handler)
    return () => { ipcRenderer.removeListener('command', handler) }
  },

  // Notifications
  onNotification: (cb: (n: { text: string; url?: string }) => void) => {
    const handler = (_: any, n: { text: string; url?: string }) => cb(n)
    ipcRenderer.on('notification', handler)
    return () => { ipcRenderer.removeListener('notification', handler) }
  },

  // Update
  onUpdateAvailable: (cb: (info: any) => void) => {
    const handler = (_: any, info: any) => cb(info)
    ipcRenderer.on('update-available', handler)
    return () => { ipcRenderer.removeListener('update-available', handler) }
  },
  quitAndInstall: () => ipcRenderer.send('quit-and-install'),

  platform: process.platform,
}

contextBridge.exposeInMainWorld('api', api)
