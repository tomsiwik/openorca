/**
 * Config store — synced from main process via IPC.
 */
import { create } from 'zustand'

interface ConfigStore {
  config: any | null
  loaded: boolean
  loadConfig: () => Promise<void>
  setConfig: (config: any) => void
}

export const useConfigStore = create<ConfigStore>((set) => ({
  config: null,
  loaded: false,

  loadConfig: async () => {
    try {
      const config = await window.api.getConfig()
      set({ config, loaded: true })
    } catch (err) {
      console.error('[config store] Failed to load config:', err)
    }
  },

  setConfig: (config) => {
    set({ config, loaded: true })
  },
}))
