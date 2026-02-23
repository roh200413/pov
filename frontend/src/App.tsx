import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { WizardStepPage } from './pages/WizardStepPage'

const steps = [
  '1) 프로젝트 생성',
  '2) 데이터셋 업데이트',
  '3) 모델 선택',
  '4) 모델 추론',
  '5) 결과 검증',
]

export default function App() {
  return (
    <Layout steps={steps}>
      <Routes>
        <Route path="/" element={<Navigate to="/wizard/step-1" replace />} />
        <Route path="/wizard/:stepId" element={<WizardStepPage />} />
      </Routes>
    </Layout>
  )
}
