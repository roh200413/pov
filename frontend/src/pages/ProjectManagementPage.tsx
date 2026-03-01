import { FormEvent, useMemo, useState } from 'react'

type ProjectItem = { id: string; name: string }

type Props = {
  projects: ProjectItem[]
  selectedProjectId: string
  onSelectProject: (projectId: string) => void
  onCreateProject: (name: string) => Promise<void>
}

export function ProjectManagementPage({ projects, selectedProjectId, onSelectProject, onCreateProject }: Props) {
  const [projectName, setProjectName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId],
  )

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmed = projectName.trim()
    if (!trimmed || isSubmitting) {
      return
    }
    setIsSubmitting(true)
    try {
      await onCreateProject(trimmed)
      setProjectName('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section>
      <div className="project-page-header">
        <div>
          <h2>프로젝트 통합 관리</h2>
          <p className="progress-text">생성된 프로젝트를 한 번에 확인하고 선택합니다.</p>
        </div>
        <div className="project-pill">총 {projects.length}개</div>
      </div>

      <form className="project-create-form" onSubmit={handleSubmit}>
        <input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="새 프로젝트 이름을 입력하세요"
        />
        <button type="submit" disabled={!projectName.trim() || isSubmitting}>
          {isSubmitting ? '생성 중...' : '프로젝트 생성'}
        </button>
      </form>

      <div className="project-cards-grid">
        {projects.map((project) => {
          const isActive = project.id === selectedProjectId
          return (
            <article key={project.id} className={isActive ? 'project-card active' : 'project-card'}>
              <p className="project-card-label">Project</p>
              <h3>{project.name}</h3>
              <p className="project-card-id">{project.id}</p>
              <div className="project-card-footer">
                <span className={isActive ? 'status-dot active' : 'status-dot'}>{isActive ? '선택됨' : '대기'}</span>
                <button type="button" onClick={() => onSelectProject(project.id)}>
                  {isActive ? '현재 프로젝트' : '선택'}
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {selectedProject && <p className="progress-text">현재 선택 프로젝트: {selectedProject.name}</p>}
    </section>
  )
}
