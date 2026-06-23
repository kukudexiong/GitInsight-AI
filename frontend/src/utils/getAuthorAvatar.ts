const PALETTES = [
  ['#2563eb', '#06b6d4'],
  ['#7c3aed', '#ec4899'],
  ['#059669', '#84cc16'],
  ['#ea580c', '#facc15'],
  ['#0f766e', '#38bdf8'],
  ['#be123c', '#fb7185'],
  ['#4338ca', '#a855f7'],
  ['#0f172a', '#64748b'],
]

export interface AuthorAvatar {
  initials: string
  background: string
}

/**
 * Generate a consistent gradient avatar for an author name.
 * Same name always produces the same color.
 */
export function getAuthorAvatar(authorName: string): AuthorAvatar {
  const hash = Array.from(authorName || 'U').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  const palette = PALETTES[hash % PALETTES.length]
  const initials = (authorName || 'U')
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('') || 'U'

  return {
    initials,
    background: `linear-gradient(135deg, ${palette[0]} 0%, ${palette[1]} 100%)`,
  }
}
