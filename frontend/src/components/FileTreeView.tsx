import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react'
import { getFileTree } from '../apis'

interface TreeEntry {
  type: 'file' | 'dir'
  name: string
  path: string
  size?: number
}

interface TreeNode {
  entry: TreeEntry
  children?: TreeNode[]
  loaded: boolean
  expanded: boolean
}

interface Props {
  selectedFile: string
  onSelectFile: (path: string) => void
  onDirectoryChange?: (path: string) => void
  expandToPath?: string // 当搜索结果选择时，展开到这个路径
}

export default function FileTreeView({ selectedFile, onSelectFile, onDirectoryChange, expandToPath }: Props) {
  const [rootNodes, setRootNodes] = useState<TreeNode[]>([])
  const [loading, setLoading] = useState(true)

  // Initial load
  useEffect(() => {
    loadRootTree()
  }, [])

  // Expand to path when search result is selected
  useEffect(() => {
    if (expandToPath) {
      expandPath(expandToPath)
    }
  }, [expandToPath])

  async function loadRootTree() {
    setLoading(true)
    try {
      const data = await getFileTree('')
      const nodes = (data.entries || []).map((entry: TreeEntry) => ({
        entry,
        children: undefined,
        loaded: false,
        expanded: false,
      }))
      setRootNodes(nodes)
    } catch (err) {
      console.error('Failed to load tree:', err)
    } finally {
      setLoading(false)
    }
  }

  async function expandPath(filePath: string) {
    // Split path into parts and expand each directory level
    const parts = filePath.split('/')
    if (parts.length <= 1) return // File at root, no dirs to expand

    // Deep clone to trigger re-render
    const newRootNodes = JSON.parse(JSON.stringify(rootNodes)) as TreeNode[]

    let currentNodes = newRootNodes

    for (let i = 0; i < parts.length - 1; i++) {
      const currentPath = parts.slice(0, i + 1).join('/')
      const nodeIndex = currentNodes.findIndex(n => n.entry.path === currentPath)
      if (nodeIndex === -1) break

      const node = currentNodes[nodeIndex]

      if (!node.loaded) {
        try {
          const data = await getFileTree(currentPath)
          node.children = (data.entries || []).map((entry: TreeEntry) => ({
            entry,
            children: undefined,
            loaded: false,
            expanded: false,
          }))
          node.loaded = true
        } catch { break }
      }
      node.expanded = true
      currentNodes = node.children || []
    }

    setRootNodes(newRootNodes)
  }

  async function toggleDir(node: TreeNode) {
    if (node.expanded) {
      node.expanded = false
      setRootNodes([...rootNodes])
      return
    }

    if (!node.loaded) {
      try {
        const data = await getFileTree(node.entry.path)
        node.children = (data.entries || []).map((entry: TreeEntry) => ({
          entry,
          children: undefined,
          loaded: false,
          expanded: false,
        }))
        node.loaded = true
      } catch (err) {
        console.error('Failed to load dir:', err)
        return
      }
    }
    node.expanded = true
    setRootNodes([...rootNodes])
    onDirectoryChange?.(node.entry.path)
  }

  if (loading) {
    return (
      <div className="p-3 space-y-1.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 py-1">
            <div className="w-4 h-4 rounded bg-[var(--color-skeleton)] animate-pulse" />
            <div className="h-3.5 rounded bg-[var(--color-skeleton)] animate-pulse" style={{ width: `${50 + Math.random() * 40}%` }} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="py-1">
      {rootNodes.map((node) => (
        <TreeNodeItem
          key={node.entry.path}
          node={node}
          depth={0}
          selectedFile={selectedFile}
          onSelectFile={onSelectFile}
          onToggleDir={toggleDir}
        />
      ))}
    </div>
  )
}

function TreeNodeItem({ node, depth, selectedFile, onSelectFile, onToggleDir }: {
  node: TreeNode
  depth: number
  selectedFile: string
  onSelectFile: (path: string) => void
  onToggleDir: (node: TreeNode) => void
}) {
  const isSelected = selectedFile === node.entry.path
  const isDir = node.entry.type === 'dir'
  const paddingLeft = 12 + depth * 16
  const itemRef = isSelected ? (el: HTMLButtonElement | null) => {
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  } : undefined

  return (
    <>
      <button
        ref={itemRef}
        onClick={() => {
          if (isDir) {
            onToggleDir(node)
          } else {
            onSelectFile(node.entry.path)
          }
        }}
        className={`w-full flex items-center gap-1.5 py-[5px] pr-2 text-[13px] text-left transition-colors ${
          isSelected
            ? 'bg-[var(--color-active)] text-[var(--color-brand)] font-medium'
            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)]'
        }`}
        style={{ paddingLeft: `${paddingLeft}px` }}
      >
        {/* Expand/collapse chevron for directories */}
        {isDir ? (
          node.expanded
            ? <ChevronDown className="h-3.5 w-3.5 text-[var(--color-text-muted)] flex-shrink-0" />
            : <ChevronRight className="h-3.5 w-3.5 text-[var(--color-text-muted)] flex-shrink-0" />
        ) : (
          <span className="w-3.5 flex-shrink-0" /> // spacer for alignment
        )}

        {/* Icon */}
        {isDir ? (
          <Folder className="h-4 w-4 flex-shrink-0" style={{ color: node.expanded ? '#ff9a2e' : '#ffb65d' }} />
        ) : (
          <File className="h-4 w-4 text-[var(--color-text-muted)] flex-shrink-0" />
        )}

        {/* Name */}
        <span className="truncate">{node.entry.name}</span>
      </button>

      {/* Children */}
      {isDir && node.expanded && node.children && (
        node.children.map((child) => (
          <TreeNodeItem
            key={child.entry.path}
            node={child}
            depth={depth + 1}
            selectedFile={selectedFile}
            onSelectFile={onSelectFile}
            onToggleDir={onToggleDir}
          />
        ))
      )}
    </>
  )
}
