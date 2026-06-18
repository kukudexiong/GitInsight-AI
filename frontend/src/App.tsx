import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import FileInsightPage from './pages/FileInsightPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="file/*" element={<FileInsightPage />} />
      </Route>
    </Routes>
  )
}

export default App
