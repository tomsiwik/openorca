/**
 * Config file paths — ~/.openorca/settings.json
 */
import { homedir } from 'node:os'
import { join } from 'node:path'

const home = homedir()

export const cfgDir = join(home, '.openorca')
export const cfgPath = join(cfgDir, 'settings.json')
