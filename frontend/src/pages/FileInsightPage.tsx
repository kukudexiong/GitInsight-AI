import { useEffect, useState, useCallback } from 'react'
import { File, Clock, Users, Brain, GitCompareArrows, Code, TrendingUp, Network, Loader2, X } from 'lucide-react'
import {
  getFileHistory,
  getAuthorContributions,
  getBusFactor,
  getHotspots,
  summarizeCommit,
  getRepoPath,
  getDashboardOverview,
  type AISummary,
  type AuthorContribution,
  type BusFactorResult,
  type CommitInfo,
  type DashboardOverview,
  type HotspotInfo,
} from '../apis'
import Timeline from '../components/Timeline'
import ContributionChart from '../components/ContributionChart'
import BusFactorBadge from '../components/BusFactorBadge'
import AISummaryPanel from '../components/AISummaryPanel'
import AIChatPanel from '../components/AIChatPanel'
import DiffView from '../components/DiffView'
import BlameView from '../components/BlameView'
import FunctionEvolution from '../components/FunctionEvolution'
import KnowledgeDistribution from '../components/KnowledgeDistribution'
import DashboardInline from '../components/DashboardInline'
import TabButton from '../components/TabButton'
import FileSearch from '../components/FileSearch'
import FileTreeView from '../components/FileTreeView'
import { SkeletonTimeline } from '../components/Skeleton'
import { useGitWatcher } from '../hooks/useGitWatcher'

export default function FileInsightPage() {
  const [selectedFile, setSelectedFile] = useState<string>('')
  const [currentDirectory, setCurrentDirectory] = useState<string>('')
  const [expandToPath, setExpandToPath] = useState<string>('')
  const [commits, setCommits] = useState<CommitInfo[]>([])
  const [contributions, setContributions] = useState<AuthorContribution[]>([])
  const [busFactor, setBusFactor] = useState<BusFactorResult | null>(null)
  const [hotspots, setHotspots] = useState<HotspotInfo[]>([])
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'timeline' | 'blame' | 'diff' | 'contributors' | 'ai' | 'evolution' | 'knowledge' | 'chat'>('timeline')
  const [sidebarWidth, setSidebarWidth] = useState(260)
  const [isResizing, setIsResizing] = useState(false)
  const [dashboardData, setDashboardData] = useState<DashboardOverview | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(true)

  // Check repo on mount
  useEffect(() => {
    checkRepo()
  }, [])

  // Real-time git change detection
  const handleGitChanged = useCallback(() => {
    if (selectedFile) {
      loadFileData(selectedFile)
    }
    loadDashboard()
  }, [selectedFile])

  useGitWatcher(handleGitChanged)

  // Load file data when a file is selected
  useEffect(() => {
    if (selectedFile) {
      loadFileData(selectedFile)
    }
  }, [selectedFile])

  async function checkRepo() {
    try {
      const data = await getRepoPath()
      if (!data.repo_path) {
        window.location.href = '/'
        return
      }
      // Load dashboard asynchronously - doesn't block file tree
      loadDashboard()
    } catch {
      window.location.href = '/'
    }
  }

  async function loadDashboard() {
    setDashboardLoading(true)
    try {
      const data = await getDashboardOverview()
      setDashboardData(data)
    } catch (err) {
      console.error('Dashboard load failed:', err)
    } finally {
      setDashboardLoading(false)
    }
  }

  // Sidebar resize handling
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isResizing) return
      const newWidth = Math.max(180, Math.min(500, e.clientX))
      setSidebarWidth(newWidth)
    }
    function handleMouseUp() {
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    if (isResizing) {
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  async function loadFileData(filePath: string) {
    setDataLoading(true)
    try {
      const [historyData, contribData, busData, hotspotData] = await Promise.all([
        getFileHistory(filePath),
        getAuthorContributions(filePath),
        getBusFactor(filePath),
        getHotspots(filePath),
      ])
      setCommits(historyData.commits || [])
      setContributions(contribData.contributions || [])
      setBusFactor(busData)
      setHotspots(hotspotData.hotspots || [])
      setAiSummary(null)
    } catch (err) {
      console.error('Failed to load file data:', err)
    } finally {
      setDataLoading(false)
    }
  }

  async function handleAISummarize(sha: string) {
    setAiLoading(true)
    try {
      const summary = await summarizeCommit(sha, selectedFile)
      setAiSummary(summary)
      setActiveTab('ai')
    } catch (err) {
      console.error('AI summarize failed:', err)
    } finally {
      setAiLoading(false)
    }
  }

  function handleSearchSelect(path: string) {
    setSelectedFile(path)
    setExpandToPath(path) // Trigger tree expansion
    // Derive directory from file path
    const dir = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : ''
    setCurrentDirectory(dir)
  }

  return (
    <div className="flex h-[calc(100vh-45px)]">
      {/* Left: Sidebar */}
      <aside
        className="border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col overflow-hidden flex-shrink-0"
        style={{ width: `${sidebarWidth}px` }}
      >
        {/* Search */}
        <div className="px-2 pt-2 pb-1.5">
          <FileSearch onSelectFile={handleSearchSelect} />
        </div>

        {/* File Tree */}
        <div className="flex-1 overflow-y-auto">
          <FileTreeView
            selectedFile={selectedFile}
            onSelectFile={(path) => {
              setSelectedFile(path)
              const dir = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : ''
              setCurrentDirectory(dir)
            }}
            onDirectoryChange={(dir) => setCurrentDirectory(dir)}
            expandToPath={expandToPath}
          />
        </div>

        {/* Bottom: Knowledge Distribution */}
        <div className="border-t border-[var(--color-border)] p-1.5">
          <button
            onClick={() => { setSelectedFile(''); setActiveTab('knowledge') }}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-[13px] transition-colors ${
              activeTab === 'knowledge' && !selectedFile
                ? 'bg-[var(--color-active)] text-[var(--color-brand)] font-medium'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-hover)]'
            }`}
          >
            <Network className="h-4 w-4 flex-shrink-0" />
            <span>知识分布图{currentDirectory ? ` · ${currentDirectory.split('/').pop()}` : ''}</span>
          </button>
        </div>
      </aside>

      {/* Resize Handle */}
      <div
        className="w-1 cursor-col-resize hover:bg-[var(--color-brand)] active:bg-[var(--color-brand)] transition-colors flex-shrink-0"
        onMouseDown={() => setIsResizing(true)}
        style={{ backgroundColor: isResizing ? 'var(--color-brand)' : 'transparent' }}
      />

      {/* Right: Main Content */}
      <div className="flex-1 overflow-y-auto bg-white">
        {/* Knowledge Distribution View */}
        {activeTab === 'knowledge' && !selectedFile ? (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">知识分布图</h2>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                查看仓库中各成员的代码归属情况
              </p>
            </div>
            <KnowledgeDistribution directory={currentDirectory} />
          </div>
        ) : !selectedFile ? (
          <div className="p-5 overflow-y-auto h-full">
            {/* Inline Dashboard */}
            {dashboardLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Loader2 className="h-6 w-6 text-[var(--color-brand)] animate-spin mx-auto mb-2" />
                  <p className="text-xs text-[var(--color-text-muted)]">正在分析仓库...</p>
                </div>
              </div>
            ) : dashboardData ? (
              <DashboardInline data={dashboardData} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-[var(--color-text-muted)]">
                  <File className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">选择一个文件查看其修改历史和分析</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-5">
            {/* File Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{selectedFile.split('/').pop()}</h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5 font-mono">{selectedFile}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {busFactor && <BusFactorBadge data={busFactor} />}
                <button
                  onClick={() => setSelectedFile('')}
                  className="p-1.5 rounded-md hover:bg-[var(--color-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
                  title="关闭文件"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-0.5 mb-5 border-b border-[var(--color-border)] overflow-x-auto">
              <TabButton active={activeTab === 'timeline'} onClick={() => setActiveTab('timeline')} icon={<Clock className="h-3.5 w-3.5" />} label="时间线" count={commits.length} />
              <TabButton active={activeTab === 'blame'} onClick={() => setActiveTab('blame')} icon={<Code className="h-3.5 w-3.5" />} label="逐行归属" />
              <TabButton active={activeTab === 'diff'} onClick={() => setActiveTab('diff')} icon={<GitCompareArrows className="h-3.5 w-3.5" />} label="版本对比" />
              <TabButton active={activeTab === 'contributors'} onClick={() => setActiveTab('contributors')} icon={<Users className="h-3.5 w-3.5" />} label="贡献者" count={contributions.length} />
              <TabButton active={activeTab === 'evolution'} onClick={() => setActiveTab('evolution')} icon={<TrendingUp className="h-3.5 w-3.5" />} label="符号追踪" />
              <TabButton active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} icon={<Brain className="h-3.5 w-3.5" />} label="AI 分析" />
              <TabButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<Brain className="h-3.5 w-3.5" />} label="AI 对话" />
            </div>

            {/* Tab Content */}
            {dataLoading ? (
              <SkeletonTimeline />
            ) : (
              <>
                {activeTab === 'timeline' && (
                  <Timeline commits={commits} hotspots={hotspots} filePath={selectedFile} onSummarize={handleAISummarize} aiLoading={aiLoading} />
                )}
                {activeTab === 'blame' && (
                  <BlameView filePath={selectedFile} onSummarize={handleAISummarize} />
                )}
                {activeTab === 'diff' && (
                  <DiffView filePath={selectedFile} commits={commits} />
                )}
                {activeTab === 'contributors' && (
                  <ContributionChart contributions={contributions} />
                )}
                {activeTab === 'evolution' && (
                  <FunctionEvolution filePath={selectedFile} />
                )}
                {activeTab === 'ai' && (
                  <AISummaryPanel summary={aiSummary} loading={aiLoading} />
                )}
                {activeTab === 'chat' && (
                  <AIChatPanel filePath={selectedFile} />
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
