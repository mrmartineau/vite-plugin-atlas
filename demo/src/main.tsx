import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

function App() {
  return (
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        padding: '48px',
        maxWidth: '600px',
        margin: '0 auto',
      }}
    >
      <h1>Atlas Demo</h1>
      <p>
        Visit <a href="/_atlas">/_atlas</a> to see the component documentation.
      </p>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
