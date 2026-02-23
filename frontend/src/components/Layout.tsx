import { NavLink } from 'react-router-dom'
import { PropsWithChildren } from 'react'

type LayoutProps = PropsWithChildren<{
  steps: string[]
}>

const stepPaths = [
  '/wizard/step-1',
  '/wizard/step-2',
  '/wizard/step-3',
  '/wizard/step-4',
  '/wizard/step-5',
]

export function Layout({ children, steps }: LayoutProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>PoC AI Inference</h1>
        <nav>
          {steps.map((step, index) => (
            <NavLink
              key={step}
              className={({ isActive }) => (isActive ? 'step-link active' : 'step-link')}
              to={stepPaths[index]}
            >
              {step}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="content">{children}</main>
    </div>
  )
}
