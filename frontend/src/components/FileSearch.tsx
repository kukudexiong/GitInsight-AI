import { useState, useEffect, useRef } from 'react'
import { Search, File, X, Loader2 } from 'lucide-react'
import { searchFiles } from '../apis'

interface SearchResult {
  name: string
  path: string
  size: number
}

interface Props {
  onSelectFile: (path: string) => void
}

export default function FileSearch({ onSelectFile }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const debounceRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setShowResults(false)
      return
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = window.setTimeout(async () => {
      setLoading(true)
      try {
        const data = await searchFiles(query.trim())
        setResults(data.results || [])
        setShowResults(true)
      } catch (err) {
        console.error('Search failed:', err)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(path: string) {
    onSelectFile(path)
    setQuery('')
    setShowResults(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-muted)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setShowResults(true) }}
          placeholder="搜索文件..."
          className="w-full pl-8 pr-8 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-all"
        />
        {loading && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-muted)] animate-spin" />
        )}
        {query && !loading && (
          <button
            onClick={() => { setQuery(''); setResults([]); setShowResults(false) }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[var(--color-border)] rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto">
          <div className="py-1">
            {results.map((file) => (
              <button
                key={file.path}
                onClick={() => handleSelect(file.path)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--color-hover)] transition-colors"
              >
                <File className="h-3.5 w-3.5 text-[var(--color-text-muted)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-[var(--color-text-primary)] truncate">{file.name}</div>
                  <div className="text-[11px] text-[var(--color-text-muted)] truncate">{file.path}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {showResults && query && results.length === 0 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[var(--color-border)] rounded-lg shadow-lg z-50 px-3 py-4 text-xs text-[var(--color-text-muted)] text-center">
          未找到匹配文件
        </div>
      )}
    </div>
  )
}
