/**
 * In-app settings editor — renders ~/.openorca/settings.json using visual-json.
 * Config section disallows adding new properties; plugins section is open for future use.
 */
import { useEffect, useState, useCallback, useMemo } from 'react'
import { JsonEditor } from '@visual-json/react'

/** visual-json theme — passed via style prop to override DEFAULT_CSS_VARS inline */
const VJ_THEME: Record<string, string> = {
  '--vj-bg': '#000',
  '--vj-bg-panel': '#000',
  '--vj-bg-hover': 'rgba(255, 255, 255, 0.05)',
  '--vj-bg-selected': 'rgba(255, 255, 255, 0.1)',
  '--vj-bg-selected-muted': 'rgba(255, 255, 255, 0.1)',
  '--vj-bg-match': 'rgba(255, 255, 255, 0.08)',
  '--vj-bg-match-active': 'rgba(255, 255, 255, 0.15)',
  '--vj-border': '#333',
  '--vj-border-subtle': '#222',
  '--vj-text': '#fff',
  '--vj-text-muted': 'rgba(255, 255, 255, 0.6)',
  '--vj-text-dim': 'rgba(255, 255, 255, 0.4)',
  '--vj-text-dimmer': 'rgba(255, 255, 255, 0.25)',
  '--vj-text-selected': '#fff',
  '--vj-string': '#ce9178',
  '--vj-number': '#b5cea8',
  '--vj-boolean': '#569cd6',
  '--vj-accent': 'rgba(255, 255, 255, 0.8)',
  '--vj-accent-muted': 'rgba(255, 255, 255, 0.15)',
  '--vj-input-bg': 'rgba(255, 255, 255, 0.05)',
  '--vj-input-border': '#444',
  '--vj-error': '#f48771',
  '--vj-font': 'inherit',
}

/**
 * Build a schema from the config value, recursively locking down
 * all objects with additionalProperties: false.
 */
function inferSchema(val: any): any {
  if (Array.isArray(val)) {
    return { type: 'array', items: val.length > 0 ? inferSchema(val[0]) : {} }
  }
  if (val && typeof val === 'object') {
    const properties: Record<string, any> = {}
    for (const [k, v] of Object.entries(val)) {
      properties[k] = inferSchema(v)
    }
    return { type: 'object', properties, additionalProperties: false }
  }
  if (typeof val === 'string') return { type: 'string' }
  if (typeof val === 'number') return { type: 'number' }
  if (typeof val === 'boolean') return { type: 'boolean' }
  return {}
}

function buildSchema(config: Record<string, any>) {
  const schema = inferSchema(config)
  // Plugins array allows adding items
  if (schema.properties?.plugins) {
    schema.properties.plugins = {
      type: 'array',
      description: 'Plugins to load',
      items: { type: 'string' },
    }
  }
  return schema
}

export function SettingsView() {
  const [rawConfig, setRawConfig] = useState<Record<string, any> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.api.getRawConfig().then((config) => {
      if (!config.plugins) config.plugins = []
      setRawConfig(config)
    }).catch((err) => {
      setError(String(err))
    })
  }, [])

  const schema = useMemo(() => {
    if (!rawConfig) return null
    return buildSchema(rawConfig)
  }, [rawConfig])

  const handleChange = useCallback((value: any) => {
    setRawConfig(value)
    window.api.saveRawConfig(value).then((result) => {
      if (!result.ok) {
        console.error('[settings] Save failed:', result.error)
      }
    })
  }, [])

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full text-red-400 text-sm p-4">
        Failed to load settings: {error}
      </div>
    )
  }

  if (rawConfig === null) {
    return (
      <div className="flex items-center justify-center w-full h-full text-white/30 text-sm">
        Loading settings...
      </div>
    )
  }

  return (
    <div className="w-full h-full overflow-hidden settings-editor">
      <JsonEditor
        value={rawConfig}
        onChange={handleChange}
        schema={schema}
        style={VJ_THEME as any}
      />
    </div>
  )
}
