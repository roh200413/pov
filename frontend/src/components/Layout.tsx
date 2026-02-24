import { NavLink } from 'react-router-dom'
import { PropsWithChildren } from 'react'

type ProjectItem = { id: string; name: string }

type LayoutProps = PropsWithChildren<{
  steps: string[]
  projects: ProjectItem[]
  selectedProjectId: string
  onSelectProject: (projectId: string) => void
  onCreateProject: () => void
}>

const stepPaths = ['/wizard/step-1', '/wizard/step-2', '/wizard/step-3', '/wizard/step-4', '/wizard/step-5']

export function Layout({
  children,
  steps,
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
}: LayoutProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>PoC AI Inference</h1>
        <button type="button" className="small-button" onClick={onCreateProject}>
          + 새 프로젝트
        </button>
        <div className="project-list">
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              className={project.id === selectedProjectId ? 'project-item active' : 'project-item'}
              onClick={() => onSelectProject(project.id)}
            >
              {project.name}
            </button>
          ))}
        </div>
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
