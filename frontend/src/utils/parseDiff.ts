export interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header'
  content: string
  oldLineNum?: number
  newLineNum?: number
}

/**
 * Parse a unified diff text into structured DiffLine objects.
 */
export function parseDiff(text: string): DiffLine[] {
  if (!text) return []
  const lines = text.split('\n')
  const result: DiffLine[] = []
  let oldLine = 0
  let newLine = 0

  for (const line of lines) {
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
      if (match) {
        oldLine = parseInt(match[1]) - 1
        newLine = parseInt(match[2]) - 1
      }
      result.push({ type: 'header', content: line })
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      newLine++
      result.push({ type: 'add', content: line.substring(1), newLineNum: newLine })
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      oldLine++
      result.push({ type: 'remove', content: line.substring(1), oldLineNum: oldLine })
    } else if (!line.startsWith('+++') && !line.startsWith('---')) {
      oldLine++
      newLine++
      result.push({ type: 'context', content: line.startsWith(' ') ? line.substring(1) : line, oldLineNum: oldLine, newLineNum: newLine })
    }
  }
  return result
}
