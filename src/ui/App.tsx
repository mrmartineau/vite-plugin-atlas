import { ArrowLeftIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { config } from 'virtual:atlas-config'
import { manifest } from 'virtual:atlas-manifest'
import { ComponentPage } from './ComponentPage.js'
import { IndexPage } from './IndexPage.js'

function parseHash(): { slug: string | null } {
  const hash = window.location.hash.replace(/^#\/?/, '')
  if (!hash) return { slug: null }
  // Strip any sub-anchor (e.g., "button/primary" → "button")
  const slug = hash.split('/')[0]
  return { slug }
}

export function App() {
  const [route, setRoute] = useState(parseHash)

  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const entry = route.slug ? manifest.find((e) => e.slug === route.slug) : null

  if (route.slug && !entry) {
    return (
      <div className="atlas-layout">
        <header className="atlas-header">
          <a href="#/" className="atlas-header__title">
            {config.title}
          </a>
        </header>
        <main className="atlas-main">
          <div className="atlas-not-found">
            <h1>Component Not Found</h1>
            <p>No component with slug "{route.slug}" was found.</p>
            <a href="#/">
              <ArrowLeftIcon size={14} /> Back to Atlas
            </a>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="atlas-layout">
      <header className="atlas-header">
        <a href="#/" className="atlas-header__title">
          {config.title}
        </a>
        <span className="atlas-header__count">{manifest.length} components</span>
      </header>
      <main className="atlas-main">
        {entry ? (
          <ComponentPage entry={entry} />
        ) : (
          <IndexPage manifest={manifest} title={config.title} />
        )}
      </main>
    </div>
  )
}
