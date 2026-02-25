import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { resolve, normalize, dirname } from 'node:path'
import { createRequire } from 'node:module'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPathsPlugin from 'vite-tsconfig-paths'
import reactPlugin from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

import { main, resources } from './package.json'

const [nodeModules, devFolder] = normalize(dirname(main)).split(/\/|\\/g)
const devPath = [nodeModules, devFolder].join('/')

const _require = createRequire(import.meta.url)
const ghosttyWasmPath = resolve(dirname(_require.resolve('ghostty-web')), 'ghostty-vt.wasm')

const tsconfigPaths = tsconfigPathsPlugin({
  projects: [resolve('tsconfig.json')],
})

export default defineConfig({
  main: {
    mode: 'es2022',
    plugins: [tsconfigPaths, externalizeDepsPlugin({ exclude: ['@openorca/config'] })],

    build: {
      rollupOptions: {
        input: {
          index: resolve('src/main/index.ts'),
        },

        output: {
          dir: resolve(devPath, 'main'),
          format: 'es',
        },

        external: ['node-pty', '@hono/node-server', '@hono/node-ws', 'electron-devtools-installer'],
      },
    },
  },

  preload: {
    plugins: [tsconfigPaths, externalizeDepsPlugin()],

    build: {
      rollupOptions: {
        input: {
          index: resolve('../preload/src/index.ts'),
        },

        output: {
          dir: resolve(devPath, 'preload'),
          format: 'cjs',
        },
      },
    },
  },

  renderer: {
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      'process.platform': JSON.stringify(process.platform),
    },

    server: {
      port: 4927,
    },

    plugins: [
      tsconfigPaths,
      tailwindcss(),
      reactPlugin(),
      viteStaticCopy({
        targets: [
          {
            src: ghosttyWasmPath,
            dest: '.',
          },
        ],
      }),
    ],

    publicDir: resolve(resources, 'public'),

    build: {
      outDir: resolve(devPath, 'renderer'),

      rollupOptions: {
        input: {
          index: resolve('src/renderer/index.html'),
        },

        output: {
          dir: resolve(devPath, 'renderer'),
        },
      },
    },
  },
})
