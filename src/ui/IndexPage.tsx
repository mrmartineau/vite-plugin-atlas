import { useMemo, useState } from 'react'
import type { AtlasComponentEntry } from '../types/index.js'
import { LazyPreview } from './LazyPreview.js'
import { SearchBar } from './SearchBar.js'
import { ToggleGroup } from './ToggleGroup.js'

interface IndexPageProps {
  manifest: AtlasComponentEntry[]
  title: string
}

export function IndexPage({ manifest, title }: IndexPageProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search) return manifest
    const q = search.toLowerCase()
    return manifest.filter((e) => e.name.toLowerCase().includes(q))
  }, [manifest, search])

  const grouped = useMemo(() => {
    const groups: Record<string, AtlasComponentEntry[]> = {}
    for (const entry of filtered) {
      const group = entry.group || 'Ungrouped'
      if (!groups[group]) groups[group] = []
      groups[group].push(entry)
    }
    return groups
  }, [filtered])

  return (
    <div className="atlas-index">
      <div className="atlas-index__header">
        <h1 className="atlas-index__title">Atlas — {title}</h1>
        <SearchBar value={search} onChange={setSearch} />
      </div>
      <div className="atlas-index__content">
        {Object.keys(grouped).length === 0 && (
          <div className="atlas-index__empty">
            {search ? 'No components match your search.' : 'No components discovered yet.'}
          </div>
        )}
        <div className="atlas-group-wrapper">
          {Object.entries(grouped).map(([group, entries]) => (
            <ToggleGroup key={group} label={group} count={entries.length}>
              <div className="atlas-group__grid">
                {entries.map((entry) => (
                  <a key={entry.slug} className="atlas-card" href={`#/${entry.slug}`}>
                    <LazyPreview entry={entry} />
                    <div className="atlas-card__info">
                      <div className="atlas-card__name">{entry.name}</div>
                      <div className="atlas-card__meta">
                        {entry.exports.length} example
                        {entry.exports.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </ToggleGroup>
          ))}
        </div>
      </div>
    </div>
  )
}
