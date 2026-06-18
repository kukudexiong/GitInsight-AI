import { useState, useEffect } from 'react'
import { X, Key, Check, Loader2 } from 'lucide-react'
import { getAIConfig, setAIConfig } from '../apis'

interface Props {
  open: boolean
  onClose: () => void
}

export default function SettingsModal({ open, onClose }: Props) {
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('https://api.deepseek.com/v1')
  const [model, setModel] = useState('deepseek-chat')
  const [configured, setConfigured] = useState(false)
  const [maskedKey, setMaskedKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (open) {
      loadConfig()
    }
  }, [open])

  async function loadConfig() {
    try {
      const data = await getAIConfig()
      setConfigured(data.configured)
      setMaskedKey(data.api_key_masked)
      setBaseUrl(data.base_url)
      setModel(data.model)
    } catch (err) {
      console.error('Failed to load AI config:', err)
    }
  }

  async function handleSave() {
    if (!apiKey.trim()) return
    setSaving(true)
    setSaved(false)
    try {
      await setAIConfig({ api_key: apiKey.trim(), base_url: baseUrl, model })
      setConfigured(true)
      setMaskedKey(`${apiKey.substring(0, 8)}...${apiKey.slice(-4)}`)
      setApiKey('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save AI config:', err)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white border border-[var(--color-border)] rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">设置</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--color-hover)] text-[var(--color-text-secondary)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* AI Configuration */}
          <div>
            <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
              <Key className="h-4 w-4" />
              OpenAI API 配置
            </h3>

            {/* Status */}
            <div className={`mb-3 px-3 py-2 rounded-lg text-xs ${
              configured
                ? 'bg-[#3fb95015] border border-[#3fb95040] text-[#3fb950]'
                : 'bg-[#d2992215] border border-[#d2992240] text-[#d29922]'
            }`}>
              {configured ? `✓ 已配置 (${maskedKey})` : '⚠ 未配置，AI 分析功能不可用'}
            </div>

            {/* API Key Input */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--color-text-secondary)] mb-1">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={configured ? '输入新 Key 覆盖当前配置...' : 'sk-...'}
                  className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[#58a6ff]"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Base URL</label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[#58a6ff]"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--color-text-secondary)] mb-1">模型</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[#58a6ff]"
                >
                  <optgroup label="DeepSeek">
                    <option value="deepseek-chat">DeepSeek Chat (推荐)</option>
                    <option value="deepseek-reasoner">DeepSeek Reasoner</option>
                  </optgroup>
                  <optgroup label="OpenAI">
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o-mini</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </optgroup>
                </select>
              </div>

              <button
                onClick={handleSave}
                disabled={!apiKey.trim() || saving}
                className="w-full py-2 bg-[#238636] hover:bg-[#2ea043] disabled:bg-[var(--color-hover)] disabled:text-[var(--color-text-muted)] text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> :
                 saved ? <Check className="h-4 w-4" /> : null}
                {saving ? '保存中...' : saved ? '已保存' : '保存配置'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
