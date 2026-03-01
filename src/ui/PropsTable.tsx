import type { AtlasProp } from '../types/index.js'

interface PropsTableProps {
  props: AtlasProp[]
}

export function PropsTable({ props }: PropsTableProps) {
  if (props.length === 0) return null

  return (
    <div className="atlas-props-table-wrapper">
      <table className="atlas-props-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Required</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {props.map((prop) => (
            <tr key={prop.name}>
              <td>
                <code>{prop.name}</code>
              </td>
              <td>
                <code>{prop.type}</code>
              </td>
              <td>{prop.required ? 'Yes' : 'No'}</td>
              <td>
                {prop.default !== undefined ? <code>{prop.default}</code> : '—'}
              </td>
              <td>{prop.description || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
