import { Link, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'

type ModelItem = {
  id: string
  name: string
  task_type: 'vision' | 'timeseries' | 'mixed'
  backend: string
  version: string
}

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

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
const SELECTED_MODEL_KEY = 'selectedModelId'

function Step3ModelSelector() {
  const [modality, setModality] = useState<'vision' | 'timeseries' | 'mixed'>('vision')
  const [models, setModels] = useState<ModelItem[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string>(() => localStorage.getItem(SELECTED_MODEL_KEY) ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setError('')

    fetch(`${API_BASE}/api/models?modality=${modality}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`모델 목록 조회 실패 (${res.status})`)
        }
        return (await res.json()) as ModelItem[]
      })
      .then((data) => {
        if (ignore) {
          return
        }
        setModels(data)
      })
      .catch((e: Error) => {
        if (ignore) {
          return
        }
        setError(e.message)
        setModels([])
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [modality])

  const selectedModel = useMemo(() => models.find((model) => model.id === selectedModelId), [models, selectedModelId])

  const handleSelectModel = (modelId: string) => {
    setSelectedModelId(modelId)
    localStorage.setItem(SELECTED_MODEL_KEY, modelId)
  }

  return (
    <div className="step3-wrap">
      <div className="modality-tabs">
        {(['vision', 'timeseries', 'mixed'] as const).map((item) => (
          <button
            key={item}
            className={item === modality ? 'modality-tab active' : 'modality-tab'}
            onClick={() => setModality(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>

      {loading && <p>모델 목록 로딩 중...</p>}
      {error && <p className="error-text">{error}</p>}

      <div className="model-grid">
        {models.map((model) => {
          const isSelected = model.id === selectedModelId
          return (
            <button
              key={model.id}
              type="button"
              className={isSelected ? 'model-card selected' : 'model-card'}
              onClick={() => handleSelectModel(model.id)}
            >
              <h3>{model.name}</h3>
              <p>Task: {model.task_type}</p>
              <p>Backend: {model.backend}</p>
              <p>Version: {model.version}</p>
            </button>
          )
        })}
      </div>

      {selectedModel ? (
        <p className="selected-model">선택된 모델: {selectedModel.name}</p>
      ) : (
        <p className="selected-model">모델을 선택해야 다음 단계로 이동할 수 있습니다.</p>
      )}

      {selectedModel ? (
        <Link to="/wizard/step-4">다음 단계로 이동</Link>
      ) : (
        <button type="button" disabled>
          다음 단계로 이동
        </button>
      )}
    </div>
  )
}

export function WizardStepPage() {
  const { stepId = 'step-1' } = useParams()
  const currentStep = stepContent[stepId] ?? stepContent['step-1']

  return (
    <section>
      <h2>{currentStep.title}</h2>
      <p>{currentStep.description}</p>
      <p>API Base URL: {API_BASE}</p>
      {stepId === 'step-3' ? (
        <Step3ModelSelector />
      ) : currentStep.next ? (
        <Link to={currentStep.next}>다음 단계로 이동</Link>
      ) : (
        <p>모든 단계를 완료했습니다.</p>
      )}
    </section>
  )
}
