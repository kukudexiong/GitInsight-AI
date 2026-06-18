import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// ==================== Git Data APIs ====================

export async function setRepoPath(repoPath: string) {
  const res = await api.post('/git/repo', { repo_path: repoPath })
  return res.data
}

export async function getRepoPath() {
  const res = await api.get('/git/repo')
  return res.data
}

export async function getFileTree(path = '', ref = 'HEAD') {
  const res = await api.get('/git/tree', { params: { path, ref } })
  return res.data
}

export async function getFileHistory(filePath: string, maxCount = 50) {
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

export async function summarizeCommit(sha: string, filePath?: string) {
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

export async function getAuthorContributions(filePath: string) {
  const res = await api.get('/stats/contributions', { params: { file_path: filePath } })
  return res.data
}

export async function getHotspots(filePath: string) {
  const res = await api.get('/stats/hotspots', { params: { file_path: filePath } })
  return res.data
}

export async function getBusFactor(filePath: string) {
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

export async function getDashboardOverview() {
  const res = await api.get('/dashboard/overview')
  return res.data
}
