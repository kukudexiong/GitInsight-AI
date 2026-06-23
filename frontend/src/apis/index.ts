import axios from 'axios'

const REPO_PATH_KEY = 'git-insight-current-repo'

export interface CommitInfo {
  sha: string
  short_sha: string
  author_name: string
  author_email: string
  date: string
  timestamp: number
  message: string
  rename_from?: string
  rename_to?: string
}

export interface AuthorContribution {
  author_name: string
  author_email: string
  commit_count: number
  lines_owned: number
  percentage: number
}

export interface BusFactorResult {
  path: string
  bus_factor: number
  top_contributors: Array<{
    author_name: string
    percentage: number
    lines_owned: number
  }>
  risk_level: 'high' | 'medium' | 'low'
}

export interface HotspotInfo {
  start_line: number
  end_line: number
  modification_count: number
  last_modified_by: string
  last_modified_date: string
}

export interface DashboardCommit extends CommitInfo {
  time_ago: string
  is_merge: boolean
  merge_source: string
  changed_files: Array<{
    path: string
    change_type: 'A' | 'D' | 'M' | 'R' | string
  }>
  changed_files_count: number
}

export interface DashboardOverview {
  stats: {
    total_commits_30d: number
    active_authors: number
    hot_files_count: number
    risk_files_count: number
  }
  activity: Array<{
    date: string
    total: number
    authors: Record<string, number>
  }>
  top_contributors: Array<{
    author_name: string
    commit_count: number
  }>
  hot_files: Array<{
    path: string
    change_count: number
    author_count: number
    authors: string[]
  }>
  risk_files: Array<{
    path: string
    bus_factor: number
    change_count: number
    risk_level: string
    owner: string
  }>
  knowledge_silos: Array<{
    path: string
    sole_author: string
    change_count: number
  }>
  recent_commits: DashboardCommit[]
}

export interface AISummary {
  summary?: string
  intent?: string
  risks?: string[]
  risk_level?: 'none' | 'low' | 'medium' | 'high'
  error?: string
  raw_response?: string
  parse_error?: boolean
}

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

function shouldAttachRepoPath(url = '') {
  return !url.startsWith('/git/repo') && !url.startsWith('/settings/ai-config')
}

export function getStoredRepoPath() {
  return localStorage.getItem(REPO_PATH_KEY) || ''
}

export function clearStoredRepoPath() {
  localStorage.removeItem(REPO_PATH_KEY)
}

api.interceptors.request.use((config) => {
  const repoPath = getStoredRepoPath()
  if (repoPath && shouldAttachRepoPath(config.url)) {
    config.params = {
      ...(config.params || {}),
      repo_path: repoPath,
    }
  }
  return config
})

// ==================== Git Data APIs ====================

export async function setRepoPath(repoPath: string) {
  const res = await api.post('/git/repo', { repo_path: repoPath })
  localStorage.setItem(REPO_PATH_KEY, res.data.repo_path || repoPath)
  return res.data
}

export async function getRepoPath() {
  const res = await api.get('/git/repo')
  if (!res.data.repo_path && getStoredRepoPath()) {
    return { ...res.data, repo_path: getStoredRepoPath() }
  }
  return res.data
}

export async function getFileTree(path = '', ref = 'HEAD') {
  const res = await api.get('/git/tree', { params: { path, ref } })
  return res.data
}

export async function getFileHistory(filePath: string, maxCount = 50): Promise<{ file_path: string; total: number; commits: CommitInfo[] }> {
  const res = await api.get('/git/history', { params: { file_path: filePath, max_count: maxCount } })
  return res.data
}

export async function getFileBlame(filePath: string, ref = 'HEAD') {
  const res = await api.get('/git/blame', { params: { file_path: filePath, ref } })
  return res.data
}

export async function getDiff(filePath: string, oldRef: string, newRef = 'HEAD') {
  const res = await api.get('/git/diff', { params: { file_path: filePath, old_ref: oldRef, new_ref: newRef } })
  return res.data
}

export async function getCommitDetail(sha: string) {
  const res = await api.get(`/git/commit/${sha}`)
  return res.data
}

export async function getFileContent(filePath: string, ref = 'HEAD') {
  const res = await api.get('/git/file-content', { params: { file_path: filePath, ref } })
  return res.data
}

export async function getBranches() {
  const res = await api.get('/git/branches')
  return res.data
}

export async function getRecentCommits(maxCount = 20) {
  const res = await api.get('/git/recent', { params: { max_count: maxCount } })
  return res.data
}

// ==================== AI Analysis APIs ====================

export async function getAIStatus() {
  const res = await api.get('/ai/status')
  return res.data
}

export async function summarizeCommit(sha: string, filePath?: string): Promise<AISummary> {
  const res = await api.get(`/ai/summarize/${sha}`, { params: { file_path: filePath } })
  return res.data
}

export async function getFunctionEvolution(filePath: string, functionName: string) {
  const res = await api.post('/ai/function-evolution', { file_path: filePath, function_name: functionName })
  return res.data
}

export async function findRelatedChanges(sha: string, filePath = '') {
  const res = await api.get(`/ai/related/${sha}`, { params: { file_path: filePath } })
  return res.data
}

export async function analyzeImpact(sha: string, filePath: string) {
  const res = await api.get(`/ai/impact/${sha}`, { params: { file_path: filePath } })
  return res.data
}

export async function getReviewSuggestions(sha: string, filePath: string) {
  const res = await api.get(`/ai/review/${sha}`, { params: { file_path: filePath } })
  return res.data
}

// ==================== Stats APIs ====================

export async function getAuthorContributions(filePath: string): Promise<{ file_path: string; contributions: AuthorContribution[] }> {
  const res = await api.get('/stats/contributions', { params: { file_path: filePath } })
  return res.data
}

export async function getHotspots(filePath: string): Promise<{ file_path: string; hotspots: HotspotInfo[] }> {
  const res = await api.get('/stats/hotspots', { params: { file_path: filePath } })
  return res.data
}

export async function getBusFactor(filePath: string): Promise<BusFactorResult> {
  const res = await api.get('/stats/bus-factor', { params: { file_path: filePath } })
  return res.data
}

export async function getKnowledgeDistribution(directory = '') {
  const res = await api.get('/stats/knowledge-distribution', { params: { directory } })
  return res.data
}

export async function getCollaborationPatterns(filePath: string) {
  const res = await api.get('/stats/collaboration', { params: { file_path: filePath } })
  return res.data
}

// ==================== Settings APIs ====================

export async function getAIConfig() {
  const res = await api.get('/settings/ai-config')
  return res.data
}

export async function setAIConfig(config: { api_key: string; base_url: string; model: string }) {
  const res = await api.post('/settings/ai-config', config)
  return res.data
}

export async function searchFiles(query: string, maxResults = 20) {
  const res = await api.get('/settings/search-files', { params: { query, max_results: maxResults } })
  return res.data
}

// ==================== Chat API ====================

export async function chatAboutFile(filePath: string, question: string, history: { role: string; content: string }[] = []) {
  const res = await api.post('/ai/chat', { file_path: filePath, question, history })
  return res.data
}

// ==================== Dashboard API ====================

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const res = await api.get('/dashboard/overview')
  return res.data
}
