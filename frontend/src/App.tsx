import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import HomePage from './pages/HomePage'

const FileInsightPage = lazy(() => import('./pages/FileInsightPage'))

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="file/*" element={
            <Suspense fallback={
              <div className="flex items-center justify-center h-[calc(100vh-45px)]">
                <div className="text-center">
                  <div className="w-6 h-6 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-[var(--color-text-muted)]">加载中...</p>
                </div>
              </div>
            }>
              <FileInsightPage />
            </Suspense>
          } />
        </Route>
      </Routes>
    </ErrorBoundary>
  )
}

export default App
