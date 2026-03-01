import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Layout } from './components/Layout'
import { WizardStepPage } from './pages/WizardStepPage'

const steps = ['1) 프로젝트 생성', '2) 데이터셋 업데이트', '3) 모델 선택', '4) 모델 추론', '5) 결과 검증']
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

type ProjectItem = { id: string; name: string }

export default function App() {
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState(localStorage.getItem('projectId') ?? '')

  const loadProjects = () => {
    fetch(`${API_BASE}/api/projects`)
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

  const handleCreateProject = () => {
    const name = window.prompt('새 프로젝트 이름을 입력하세요')
    if (!name) {
      return
    }
    fetch(`${API_BASE}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
      .then((r) => r.json())
      .then((project: ProjectItem) => {
        setSelectedProjectId(project.id)
        localStorage.setItem('projectId', project.id)
        loadProjects()
      })
      .catch(() => undefined)
  }

  return (
    <Layout
      steps={steps}
      projects={projects}
      selectedProjectId={selectedProjectId}
      onSelectProject={handleSelectProject}
      onCreateProject={handleCreateProject}
    >
      <Routes>
        <Route path="/" element={<Navigate to="/wizard/step-1" replace />} />
        <Route
          path="/wizard/:stepId"
          element={<WizardStepPage selectedProjectId={selectedProjectId} onProjectUpdated={loadProjects} />}
        />
      </Routes>
    </Layout>
  )
}
