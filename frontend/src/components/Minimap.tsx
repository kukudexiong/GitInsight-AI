import { useRef, useState, useEffect, useCallback } from 'react'

interface MinimapLine {
  color?: string      // left color indicator (e.g. author color)
  textColor?: string  // text color hint
  indent: number      // indentation level (0-20)
  hasContent: boolean // whether line has meaningful content
}

interface Props {
  lines: MinimapLine[]
  containerRef: React.RefObject<HTMLElement | null>
  visibleHeight: number  // visible area height in px
  totalHeight: number    // total scrollable content height in px
}

const MINIMAP_WIDTH = 60
const LINE_HEIGHT = 2  // each line is 2px tall in minimap

export default function Minimap({ lines, containerRef, visibleHeight, totalHeight }: Props) {
  const minimapRef = useRef<HTMLCanvasElement>(null)
  const [viewportTop, setViewportTop] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const minimapHeight = Math.min(lines.length * LINE_HEIGHT, 600)
  const scale = minimapHeight / totalHeight
  const viewportHeight = Math.max(20, visibleHeight * scale)

  // Draw minimap
  useEffect(() => {
    const canvas = minimapRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = MINIMAP_WIDTH * window.devicePixelRatio
    canvas.height = minimapHeight * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // Background
    ctx.fillStyle = '#1e1e1e'
    ctx.fillRect(0, 0, MINIMAP_WIDTH, minimapHeight)

    // Draw lines
    lines.forEach((line, i) => {
      const y = i * LINE_HEIGHT

      // Author color bar on left
      if (line.color) {
        ctx.fillStyle = line.color
        ctx.globalAlpha = 0.8
        ctx.fillRect(0, y, 3, LINE_HEIGHT)
      }

      // Code representation
      if (line.hasContent) {
        ctx.fillStyle = line.textColor || '#d4d4d4'
        ctx.globalAlpha = 0.4
        const startX = 5 + line.indent * 1.5
        const width = Math.min(20 + Math.random() * 25, MINIMAP_WIDTH - startX - 2)
        ctx.fillRect(startX, y, width, LINE_HEIGHT - 0.5)
      }

      ctx.globalAlpha = 1
    })
  }, [lines, minimapHeight])

  // Sync scroll position
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function handleScroll() {
      if (!container || isDragging) return
      const scrollRatio = container.scrollTop / (container.scrollHeight - container.clientHeight)
      setViewportTop(scrollRatio * (minimapHeight - viewportHeight))
    }

    container.addEventListener('scroll', handleScroll)
    handleScroll()
    return () => container.removeEventListener('scroll', handleScroll)
  }, [containerRef, minimapHeight, viewportHeight, isDragging])

  // Handle click on minimap to jump
  const handleMinimapClick = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current
    if (!container) return

    const rect = e.currentTarget.getBoundingClientRect()
    const clickY = e.clientY - rect.top
    const scrollRatio = clickY / minimapHeight
    const targetScroll = scrollRatio * (container.scrollHeight - container.clientHeight)
    container.scrollTo({ top: targetScroll, behavior: 'smooth' })
  }, [containerRef, minimapHeight])

  // Handle drag on viewport slider
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)

    const startY = e.clientY
    const startTop = viewportTop

    function handleMouseMove(e: MouseEvent) {
      const container = containerRef.current
      if (!container) return

      const deltaY = e.clientY - startY
      const newTop = Math.max(0, Math.min(minimapHeight - viewportHeight, startTop + deltaY))
      setViewportTop(newTop)

      const scrollRatio = newTop / (minimapHeight - viewportHeight)
      container.scrollTop = scrollRatio * (container.scrollHeight - container.clientHeight)
    }

    function handleMouseUp() {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [containerRef, minimapHeight, viewportHeight, viewportTop])

  if (lines.length < 50) return null // Don't show for small files

  return (
    <div
      className="relative flex-shrink-0 cursor-pointer select-none"
      style={{ width: MINIMAP_WIDTH, height: minimapHeight }}
      onClick={handleMinimapClick}
    >
      <canvas
        ref={minimapRef}
        className="rounded-sm"
        style={{ width: MINIMAP_WIDTH, height: minimapHeight }}
      />
      {/* Viewport slider */}
      <div
        className="absolute left-0 right-0 border border-white/30 bg-white/10 rounded-sm cursor-grab active:cursor-grabbing transition-[top] duration-75"
        style={{ top: viewportTop, height: viewportHeight }}
        onMouseDown={handleMouseDown}
      />
    </div>
  )
}
