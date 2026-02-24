import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'

type Props = {
  selectedProjectId: string
  onProjectUpdated: () => void
}

type Dataset = { id: string; name: string; dataset_type: string }
type ModelItem = { id: string; name: string; task_type: 'vision' | 'timeseries' | 'mixed'; backend: string; version: string }
type RunItem = { id: string; status: string; summary_json?: { total?: number } }
type ResultItem = {
  id: string
  sample_key: string
  score: number
  verdict: string
  detail_json?: { bbox?: unknown; preview?: string[]; source_type?: string; row_index?: number }
  static_url?: string
}
type ValidationItem = { id: string; sample_key: string; human_verdict: string; comment?: string }

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

const stepOrder = ['step-1', 'step-2', 'step-3', 'step-4', 'step-5']

export function WizardStepPage({ selectedProjectId, onProjectUpdated }: Props) {
  const { stepId = 'step-1' } = useParams()
  const [datasetName, setDatasetName] = useState('default-dataset')
  const [datasetType, setDatasetType] = useState<'vision' | 'timeseries' | 'mixed'>('vision')
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [selectedDatasetId, setSelectedDatasetId] = useState(localStorage.getItem('datasetId') ?? '')
  const [selectedModelId, setSelectedModelId] = useState(localStorage.getItem('selectedModelId') ?? '')
  const [modality, setModality] = useState<'vision' | 'timeseries' | 'mixed'>('vision')
  const [models, setModels] = useState<ModelItem[]>([])
  const [runId, setRunId] = useState(localStorage.getItem('runId') ?? '')
  const [run, setRun] = useState<RunItem | null>(null)
  const [results, setResults] = useState<ResultItem[]>([])
  const [validations, setValidations] = useState<ValidationItem[]>([])
  const [selectedResult, setSelectedResult] = useState<ResultItem | null>(null)
  const [comment, setComment] = useState('')
  const [humanVerdict, setHumanVerdict] = useState<'ok' | 'ng'>('ok')

  const selectedDataset = datasets.find((d) => d.id === selectedDatasetId)

  useEffect(() => {
    if (!selectedProjectId) {
      return
    }
    fetch(`${API_BASE}/api/projects/${selectedProjectId}/datasets`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Dataset[]) => {
        setDatasets(rows)
        if (!selectedDatasetId && rows[0]) {
          setSelectedDatasetId(rows[0].id)
          localStorage.setItem('datasetId', rows[0].id)
          setModality(rows[0].dataset_type as 'vision' | 'timeseries' | 'mixed')
        }
      })
      .catch(() => setDatasets([]))
  }, [selectedProjectId, selectedDatasetId])

  useEffect(() => {
    fetch(`${API_BASE}/api/models?modality=${modality}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: ModelItem[]) => setModels(rows))
      .catch(() => setModels([]))
  }, [modality])

  useEffect(() => {
    if (!runId) return
    fetch(`${API_BASE}/api/inference-runs/${runId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((row: RunItem | null) => setRun(row))
      .catch(() => setRun(null))

    fetch(`${API_BASE}/api/inference-runs/${runId}/results?limit=200&offset=0`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: ResultItem[]) => setResults(rows))
      .catch(() => setResults([]))

    fetch(`${API_BASE}/api/inference-runs/${runId}/validations`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: ValidationItem[]) => setValidations(rows))
      .catch(() => setValidations([]))
  }, [runId])

  const completed = {
    'step-1': Boolean(selectedProjectId),
    'step-2': Boolean(selectedDatasetId),
    'step-3': Boolean(selectedModelId),
    'step-4': Boolean(runId && run?.status === 'done'),
    'step-5': validations.length > 0,
  }

  const currentStepIndex = stepOrder.indexOf(stepId)
  const nextStep = stepOrder[currentStepIndex + 1]
  const canGoNext = nextStep ? completed[stepId as keyof typeof completed] : false
  const progressCount = Object.values(completed).filter(Boolean).length

  const handleCreateProject = () => {
    const name = window.prompt('프로젝트 이름')
    if (!name) return
    fetch(`${API_BASE}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).then(() => onProjectUpdated())
  }

  const handleCreateDataset = () => {
    if (!selectedProjectId) return
    fetch(`${API_BASE}/api/projects/${selectedProjectId}/datasets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: datasetName, dataset_type: datasetType }),
    })
      .then((r) => r.json())
      .then((dataset: Dataset) => {
        setSelectedDatasetId(dataset.id)
        localStorage.setItem('datasetId', dataset.id)
        setModality(dataset.dataset_type as 'vision' | 'timeseries' | 'mixed')
      })
  }

  const handleUploadFiles = (e: ChangeEvent<HTMLInputElement>) => {
    if (!selectedDatasetId || !e.target.files?.length) return
    const formData = new FormData()
    Array.from(e.target.files).forEach((file) => formData.append('files', file))
    fetch(`${API_BASE}/api/datasets/${selectedDatasetId}/files`, { method: 'POST', body: formData })
  }

  const handleSelectModel = (modelId: string) => {
    setSelectedModelId(modelId)
    localStorage.setItem('selectedModelId', modelId)
  }

  const handleRunInference = () => {
    if (!selectedProjectId || !selectedDatasetId || !selectedModelId) return
    fetch(`${API_BASE}/api/inference-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: selectedProjectId,
        dataset_id: selectedDatasetId,
        model_id: selectedModelId,
        params: { threshold: 0.5 },
      }),
    })
      .then((r) => r.json())
      .then((created: RunItem) => {
        setRunId(created.id)
        localStorage.setItem('runId', created.id)
      })
  }

  const validationProgress = useMemo(() => {
    if (!results.length) return '0/0'
    const uniq = new Set(validations.map((v) => v.sample_key))
    return `${uniq.size}/${results.length}`
  }, [results, validations])

  const handleSaveValidation = () => {
    if (!selectedResult || !runId) return
    fetch(`${API_BASE}/api/validations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ run_id: runId, sample_key: selectedResult.sample_key, human_verdict: humanVerdict, comment }),
    }).then(() => {
      fetch(`${API_BASE}/api/inference-runs/${runId}/validations`)
        .then((r) => r.json())
        .then((rows: ValidationItem[]) => setValidations(rows))
    })
  }

  return (
    <section>
      <h2>Step {currentStepIndex + 1}</h2>
      <p className="progress-text">진행률: {progressCount}/5</p>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${(progressCount / 5) * 100}%` }} />
      </div>

      {stepId === 'step-1' && (
        <div className="step3-wrap">
          <p>프로젝트를 선택하거나 새로 생성하세요.</p>
          <button type="button" onClick={handleCreateProject}>프로젝트 생성</button>
          <p>현재 프로젝트: {selectedProjectId || '-'}</p>
        </div>
      )}

      {stepId === 'step-2' && (
        <div className="step3-wrap">
          <input value={datasetName} onChange={(e) => setDatasetName(e.target.value)} placeholder="dataset name" />
          <select value={datasetType} onChange={(e) => setDatasetType(e.target.value as 'vision' | 'timeseries' | 'mixed')}>
            <option value="vision">vision</option>
            <option value="timeseries">timeseries</option>
            <option value="mixed">mixed</option>
          </select>
          <button type="button" onClick={handleCreateDataset} disabled={!selectedProjectId}>
            데이터셋 생성
          </button>
          <select
            value={selectedDatasetId}
            onChange={(e) => {
              setSelectedDatasetId(e.target.value)
              localStorage.setItem('datasetId', e.target.value)
            }}
          >
            <option value="">데이터셋 선택</option>
            {datasets.map((d) => (
              <option value={d.id} key={d.id}>
                {d.name} ({d.dataset_type})
              </option>
            ))}
          </select>
          <input type="file" multiple onChange={handleUploadFiles} disabled={!selectedDatasetId} />
        </div>
      )}

      {stepId === 'step-3' && (
        <div className="step3-wrap">
          <div className="modality-tabs">
            {(['vision', 'timeseries', 'mixed'] as const).map((item) => (
              <button key={item} className={item === modality ? 'modality-tab active' : 'modality-tab'} onClick={() => setModality(item)}>
                {item}
              </button>
            ))}
          </div>
          <div className="model-grid">
            {models.map((model) => (
              <button
                key={model.id}
                className={selectedModelId === model.id ? 'model-card selected' : 'model-card'}
                onClick={() => handleSelectModel(model.id)}
              >
                <h3>{model.name}</h3>
                <p>{model.backend}</p>
                <p>{model.version}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {stepId === 'step-4' && (
        <div className="step3-wrap">
          <p>dataset: {selectedDataset?.name || '-'}</p>
          <button type="button" onClick={handleRunInference} disabled={!selectedModelId || !selectedDatasetId || !selectedProjectId}>
            추론 실행
          </button>
          <p>run id: {runId || '-'}</p>
          <p>status: {run?.status || '-'}</p>
          {run?.summary_json && <pre>{JSON.stringify(run.summary_json, null, 2)}</pre>}
        </div>
      )}

      {stepId === 'step-5' && (
        <div className="step3-wrap">
          <p>검증률: {validationProgress}</p>
          <div className="results-layout">
            <table className="results-table">
              <thead>
                <tr>
                  <th>sample_key</th>
                  <th>score</th>
                  <th>verdict</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.id} onClick={() => setSelectedResult(result)}>
                    <td>{result.sample_key}</td>
                    <td>{result.score}</td>
                    <td>{result.verdict}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="detail-panel">
              {selectedResult ? (
                <>
                  <h3>{selectedResult.sample_key}</h3>
                  {selectedResult.static_url && (
                    <img src={`${API_BASE}${selectedResult.static_url}`} alt={selectedResult.sample_key} className="preview-image" />
                  )}
                  <pre>{JSON.stringify(selectedResult.detail_json, null, 2)}</pre>
                  <div className="modality-tabs">
                    <button className={humanVerdict === 'ok' ? 'modality-tab active' : 'modality-tab'} onClick={() => setHumanVerdict('ok')}>
                      OK
                    </button>
                    <button className={humanVerdict === 'ng' ? 'modality-tab active' : 'modality-tab'} onClick={() => setHumanVerdict('ng')}>
                      NG
                    </button>
                  </div>
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="comment" />
                  <button type="button" onClick={handleSaveValidation}>
                    검증 저장
                  </button>
                </>
              ) : (
                <p>왼쪽 테이블에서 결과를 선택하세요.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {nextStep ? (
        canGoNext ? (
          <Link to={`/wizard/${nextStep}`}>다음 단계로 이동</Link>
        ) : (
          <button type="button" disabled>
            다음 단계로 이동
          </button>
        )
      ) : (
        <p>모든 단계를 완료했습니다.</p>
      )}
    </section>
  )
}
