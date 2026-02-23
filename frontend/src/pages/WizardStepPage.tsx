import { Link, useParams } from 'react-router-dom'

const stepContent: Record<string, { title: string; description: string; next?: string }> = {
  'step-1': {
    title: '프로젝트 생성',
    description: '새 프로젝트를 만들고 전체 워크플로우의 시작점을 설정합니다.',
    next: '/wizard/step-2',
  },
  'step-2': {
    title: '데이터셋 업데이트',
    description: 'Vision 이미지와 시계열 데이터를 업로드할 준비를 합니다.',
    next: '/wizard/step-3',
  },
  'step-3': {
    title: '모델 선택',
    description: 'Adapter/Plugin 기반 모델 백엔드를 선택합니다.',
    next: '/wizard/step-4',
  },
  'step-4': {
    title: '모델 추론',
    description: '추론 작업을 실행하고 queued/running/done 상태를 확인합니다.',
    next: '/wizard/step-5',
  },
  'step-5': {
    title: '결과 검증',
    description: '생성된 결과를 조회하고 검증 상태를 저장합니다.',
  },
}

export function WizardStepPage() {
  const { stepId = 'step-1' } = useParams()
  const currentStep = stepContent[stepId] ?? stepContent['step-1']

  return (
    <section>
      <h2>{currentStep.title}</h2>
      <p>{currentStep.description}</p>
      <p>API Base URL: {import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'}</p>
      {currentStep.next ? <Link to={currentStep.next}>다음 단계로 이동</Link> : <p>모든 단계를 완료했습니다.</p>}
    </section>
  )
}
