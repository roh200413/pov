import { NavLink } from 'react-router-dom'
import { PropsWithChildren } from 'react'

type ProjectItem = { id: string; name: string }

type LayoutProps = PropsWithChildren<{
  steps: string[]
  projects: ProjectItem[]
  selectedProjectId: string
  onCreateProject: () => void
}>

const stepPaths = ['/wizard/step-1', '/wizard/step-2', '/wizard/step-3', '/wizard/step-4', '/wizard/step-5']

export function Layout({ children, steps, projects, selectedProjectId, onCreateProject }: LayoutProps) {
  const selectedProject = projects.find((project) => project.id === selectedProjectId)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Axion PoC</div>
        <button type="button" className="small-button" onClick={onCreateProject}>
          + New project
        </button>

        <p className="sidebar-group-title">Management</p>
        <NavLink className={({ isActive }) => (isActive ? 'step-link active' : 'step-link')} to="/projects">
          프로젝트 통합 관리
        </NavLink>

        <p className="sidebar-group-title">Wizard</p>
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

      <main className="content">
        <header className="topbar">
          <div>
            <p className="topbar-path">mlflow / model</p>
            <h1>{selectedProject?.name ?? 'Select a project'}</h1>
          </div>
          <button type="button" className="topbar-action">
            Add to model group
          </button>
        </header>
        <div className="workspace-card">{children}</div>
      </main>
    </div>
  )
}
