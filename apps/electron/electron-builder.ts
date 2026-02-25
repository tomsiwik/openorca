import type { Configuration } from 'electron-builder'

import {
  main,
  name,
  version,
  resources,
  description,
  displayName,
  author as _author,
} from './package.json'

import { getDevFolder } from './src/lib/electron-app/release/utils/path'

const author = _author?.name ?? _author
const currentYear = new Date().getFullYear()
const appId = 'com.openorca.terminal'

/** biome-ignore-all lint/suspicious/noTemplateCurlyInString: electron-builder template syntax */
const artifactName = [`${name}-v${version}`, '-${os}.${ext}'].join('')

export default {
  appId,
  productName: displayName,
  copyright: `Copyright ${currentYear} ${author}`,

  directories: {
    app: getDevFolder(main),
    output: `dist/v${version}`,
  },

  extraResources: [
    {
      from: '../../packages/backend/dist',
      to: 'backend/dist',
      filter: ['**/*'],
    },
  ],

  mac: {
    artifactName,
    icon: `${resources}/build/icons/icon.icns`,
    category: 'public.app-category.developer-tools',
    darkModeSupport: true,
    target: ['zip', 'dmg', 'dir'],
    entitlements: 'entitlements.plist',
    entitlementsInherit: 'entitlements.plist',
  },

  linux: {
    artifactName,
    category: 'TerminalEmulator',
    synopsis: description,
    target: ['AppImage', 'deb', 'pacman', 'rpm'],
  },

  win: {
    artifactName,
    icon: `${resources}/build/icons/icon.ico`,
    target: ['nsis', 'zip', 'portable'],
  },

  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
  },

  publish: [
    {
      provider: 'github',
      owner: 'tomsiwik',
      repo: 'openorca',
    },
  ],

  protocols: [
    {
      name: 'ssh URL',
      schemes: ['ssh'],
    },
  ],
} satisfies Configuration
