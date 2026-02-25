/**
 * Type declarations for window.api exposed by preload.
 */
declare global {
  interface Window {
    api: {
      getServerInfo: () => Promise<{ url: string; token: string } | null>
      getConfig: () => Promise<any>
      getKeymaps: () => Promise<Record<string, string[]>>
      getRawConfig: () => Promise<Record<string, any>>
      saveRawConfig: (config: Record<string, any>) => Promise<{ ok: boolean; error?: string }>
      openConfig: () => void
      onConfigChange: (cb: (config: any) => void) => () => void
      minimize: () => void
      maximize: () => void
      close: () => void
      isMaximized: () => Promise<boolean>
      toggleFullScreen: () => void
      toggleKeepOnTop: () => void
      devtools: () => void
      reload: () => void
      reloadFull: () => void
      onMaximizeChange: (cb: (maximized: boolean) => void) => () => void
      onWindowFocus: (cb: (focused: boolean) => void) => () => void
      onCommand: (cb: (command: string) => void) => () => void
      onNotification: (cb: (n: { text: string; url?: string }) => void) => () => void
      onUpdateAvailable: (cb: (info: any) => void) => () => void
      quitAndInstall: () => void
      platform: string
    }
  }
}

export {}
