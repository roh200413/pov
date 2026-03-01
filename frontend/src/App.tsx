import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Layout } from './components/Layout'
import { ProjectManagementPage } from './pages/ProjectManagementPage'
import { WizardStepPage } from './pages/WizardStepPage'

const steps = ['1) 프로젝트 생성', '2) 데이터셋 업데이트', '3) 모델 선택', '4) 모델 추론', '5) 결과 검증']
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

type ProjectItem = { id: string; name: string }

export default function App() {
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState(localStorage.getItem('projectId') ?? '')

  const loadProjects = () => {
    return fetch(`${API_BASE}/api/projects`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: ProjectItem[]) => {
        setProjects(rows)
        if (!selectedProjectId && rows[0]) {
          setSelectedProjectId(rows[0].id)
          localStorage.setItem('projectId', rows[0].id)
        }
      })
      .catch(() => setProjects([]))
  }

  useEffect(() => {
    loadProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId)
    localStorage.setItem('projectId', projectId)
  }

  const handleCreateProject = async (name?: string) => {
    const resolvedName = name?.trim() || window.prompt('새 프로젝트 이름을 입력하세요')?.trim()
    if (!resolvedName) {
      return
    }

    await fetch(`${API_BASE}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: resolvedName }),
    })
      .then((r) => r.json())
      .then((project: ProjectItem) => {
        setSelectedProjectId(project.id)
        localStorage.setItem('projectId', project.id)
      })

    await loadProjects()
  }

  return (
    <Layout
      steps={steps}
      projects={projects}
      selectedProjectId={selectedProjectId}
      onCreateProject={() => {
        void handleCreateProject()
      }}
    >
      <Routes>
        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route
          path="/projects"
          element={
            <ProjectManagementPage
              projects={projects}
              selectedProjectId={selectedProjectId}
              onSelectProject={handleSelectProject}
              onCreateProject={(name) => handleCreateProject(name)}
            />
          }
        />
        <Route
          path="/wizard/:stepId"
          element={<WizardStepPage selectedProjectId={selectedProjectId} onProjectUpdated={loadProjects} />}
        />
      </Routes>
    </Layout>
  )
}
