/** biome-ignore-all lint/correctness/noUnusedVariables: <> */
import { resolve, basename } from 'node:path'
import { writeFile, cp } from 'node:fs/promises'

import trustedDependencies from '../../../../../trusted-dependencies-scripts.json'
import packageJSON from '../../../../../package.json'
import { getDevFolder } from '../utils/path'

async function createPackageJSONDistVersion() {
  const { main, scripts, resources, devDependencies, ...rest } = packageJSON

  const packageJSONDistVersion = {
    main: `./main/${basename(main || 'index.mjs')}`,
    ...rest,
  }

  const devFolder = getDevFolder(main)

  try {
    await Promise.all([
      writeFile(
        resolve(devFolder, 'package.json'),
        JSON.stringify(packageJSONDistVersion, null, 2)
      ),

      writeFile(
        resolve(devFolder, 'trusted-dependencies-scripts.json'),
        JSON.stringify(trustedDependencies, null, 2)
      ),

      cp(
        resolve('../../apps/preload/dist'),
        resolve(devFolder, 'preload'),
        { recursive: true }
      ),
    ])
  } catch ({ message }: any) {
    console.log(`
    🛑 Something went wrong!\n
      🧐 There was a problem creating the package.json dist version...\n
      👀 Error: ${message}
    `)
  }
}

createPackageJSONDistVersion()
