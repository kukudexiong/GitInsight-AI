import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { GitBranch, Settings } from 'lucide-react'
import SettingsModal from './SettingsModal'
import { clearStoredRepoPath } from '../apis'

export default function Layout() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const navigate = useNavigate()

  function handleLogoClick() {
    clearStoredRepoPath()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-white px-5 py-2.5 flex items-center justify-between">
        <div
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={handleLogoClick}
          title="返回首页"
        >
          <GitBranch className="h-5 w-5 text-[var(--color-brand)]" />
          <h1 className="text-base font-semibold text-[var(--color-text-primary)]">
            GitInsight AI
          </h1>
          <span className="text-xs text-[var(--color-text-muted)] ml-1">
            让代码历史开口说话
          </span>
        </div>

        <button
          onClick={() => setSettingsOpen(true)}
          className="p-1.5 rounded-md hover:bg-[var(--color-hover)] text-[var(--color-text-muted)] transition-colors"
          title="设置"
        >
          <Settings className="h-4.5 w-4.5" />
        </button>
      </header>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>

      {/* Settings Modal */}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
