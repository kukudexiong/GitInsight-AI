import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react'
import { chatAboutFile } from '../apis'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  filePath: string
}

const SUGGESTED_QUESTIONS = [
  '这个文件的核心功能是什么？',
  '最近几次修改有什么关联？',
  '这个文件有哪些潜在的代码质量问题？',
  '哪些函数逻辑比较复杂，需要关注？',
]

export default function AIChatPanel({ filePath }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Reset chat when file changes
    setMessages([])
  }, [filePath])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(question?: string) {
    const q = question || input.trim()
    if (!q || loading) return

    const userMsg: Message = { role: 'user', content: q }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const result = await chatAboutFile(filePath, q, newMessages.slice(-6))
      const assistantMsg: Message = { role: 'assistant', content: result.answer || result.error || '无回复' }
      setMessages([...newMessages, assistantMsg])
    } catch (err: any) {
      const errorMsg: Message = { role: 'assistant', content: '请求失败，请检查 AI 配置' }
      setMessages([...newMessages, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 220px)', minHeight: '300px' }}>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-1 py-2 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles className="h-8 w-8 text-[var(--color-brand)] opacity-60 mb-3" />
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              对 <code className="text-xs bg-[var(--color-surface-2)] px-1.5 py-0.5 rounded">{filePath.split('/').pop()}</code> 提问
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="px-3 py-1.5 text-xs border border-[var(--color-border)] rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)] hover:border-[var(--color-brand)] transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-[var(--color-brand-light)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-[var(--color-brand)]" />
                </div>
              )}
              <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-[var(--color-brand)] text-white rounded-br-sm'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-full bg-[var(--color-brand-light)] flex items-center justify-center flex-shrink-0">
              <Bot className="h-3.5 w-3.5 text-[var(--color-brand)]" />
            </div>
            <div className="px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg rounded-bl-sm">
              <Loader2 className="h-4 w-4 text-[var(--color-brand)] animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-[var(--color-border)] pt-3 mt-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的问题..."
            disabled={loading}
            className="flex-1 px-3 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] disabled:opacity-60"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="px-3 py-2 bg-[var(--color-brand)] hover:bg-[#4080ff] disabled:opacity-40 text-white rounded-lg transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[11px] text-[var(--color-text-faint)] mt-1.5">
          AI 将基于文件内容和修改历史回答问题，按 Enter 发送
        </p>
      </div>
    </div>
  )
}
