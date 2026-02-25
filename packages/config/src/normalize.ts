const FONT_WEIGHT_SUFFIXES = [
  'Thin', 'ExtraLight', 'UltraLight', 'Light', 'Regular', 'Normal',
  'Medium', 'SemiBold', 'DemiBold', 'Bold', 'ExtraBold', 'UltraBold',
  'Black', 'Heavy',
]

const WEIGHT_MAP: Record<string, string> = {
  'thin': '100',
  'extralight': '200',
  'ultralight': '200',
  'light': '300',
  'regular': 'normal',
  'normal': 'normal',
  'medium': '500',
  'semibold': '600',
  'demibold': '600',
  'bold': 'bold',
  'extrabold': '800',
  'ultrabold': '800',
  'black': '900',
  'heavy': '900',
}

/**
 * Strip CSS weight/style suffixes from PostScript-style font names.
 *
 * "Iosevka Nerd Font Mono Regular"   → { family: "Iosevka Nerd Font Mono", weight: "normal" }
 * "Iosevka Nerd Font Mono SemiBold"  → { family: "Iosevka Nerd Font Mono", weight: "600" }
 * "CozetteVector"                     → { family: "CozetteVector", weight: "normal" }
 * "Fira Code SemiBold Italic"        → { family: "Fira Code", weight: "600" }
 */
export function normalizeFont(raw: string): { family: string; weight: string } {
  let name = raw.trim()
  let weight = 'normal'

  // Strip trailing "Italic" first
  if (name.endsWith(' Italic')) {
    name = name.slice(0, -' Italic'.length)
  }

  // Check for weight suffix (must be preceded by a space)
  for (const suffix of FONT_WEIGHT_SUFFIXES) {
    if (name.endsWith(` ${suffix}`)) {
      const mapped = WEIGHT_MAP[suffix.toLowerCase()]
      if (mapped) {
        weight = mapped
        name = name.slice(0, -(suffix.length + 1))
      }
      break
    }
  }

  return { family: name || raw.trim(), weight }
}

/**
 * Map a weight keyword to a CSS weight string.
 */
export function toCssWeight(keyword: string): string {
  return WEIGHT_MAP[keyword.toLowerCase()] ?? 'normal'
}
