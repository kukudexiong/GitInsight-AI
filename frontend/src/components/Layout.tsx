import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { GitBranch, Settings, FolderOpen } from 'lucide-react'
import SettingsModal from './SettingsModal'
import { clearStoredRepoPath, getStoredRepoPath } from '../apis'

export default function Layout() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const repoPath = getStoredRepoPath()
  const isOnFilePage = location.pathname.startsWith('/file')

  function handleLogoClick() {
    if (isOnFilePage) {
      // Always go back to dashboard (clear file selection)
      navigate('/file/')
    }
  }

  function handleSwitchRepo() {
    clearStoredRepoPath()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-white px-5 py-2.5 flex items-center justify-between">
        <div
          className={`flex items-center gap-2.5 ${isOnFilePage ? 'cursor-pointer hover:opacity-80' : ''} transition-opacity`}
          onClick={handleLogoClick}
          title={isOnFilePage ? '返回首页' : undefined}
        >
          <GitBranch className="h-5 w-5 text-[var(--color-brand)]" />
          <h1 className="text-base font-semibold text-[var(--color-text-primary)]">
            GitInsight AI
          </h1>
          <span className="text-xs text-[var(--color-text-muted)] ml-1">
            让代码历史开口说话
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Current repo path indicator */}
          {repoPath && isOnFilePage && (
            <button
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-[var(--color-text-muted)] hover:text-[var(--color-brand)] hover:bg-[var(--color-hover)] transition-colors"
              onClick={handleSwitchRepo}
              title={`当前仓库: ${repoPath}\n点击切换`}
            >
              <FolderOpen className="h-3.5 w-3.5" />
              <span className="max-w-[180px] truncate font-mono">
                {repoPath.replace(/\\/g, '/').split('/').filter(Boolean).slice(-2).join('/')}
              </span>
            </button>
          )}

          <button
            onClick={() => setSettingsOpen(true)}
            className="p-1.5 rounded-md hover:bg-[var(--color-hover)] text-[var(--color-text-muted)] transition-colors"
            title="设置"
          >
            <Settings className="h-4.5 w-4.5" />
          </button>
        </div>
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
