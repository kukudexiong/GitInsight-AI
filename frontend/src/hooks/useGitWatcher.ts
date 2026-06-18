import { useEffect, useRef, useCallback } from 'react'

/**
 * Hook that connects to the backend WebSocket and fires a callback
 * whenever git state changes (new commit, branch switch, etc.)
 */
export function useGitWatcher(onGitChanged: () => void) {
  const wsRef = useRef<WebSocket | null>(null)
  const callbackRef = useRef(onGitChanged)
  callbackRef.current = onGitChanged

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.hostname}:8000/ws/git-watch`

    function connect() {
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('[GitWatcher] Connected')
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'git_changed') {
            console.log('[GitWatcher] Git changed, refreshing...')
            callbackRef.current()
          }
        } catch (e) {
          // ignore parse errors
        }
      }

      ws.onclose = () => {
        console.log('[GitWatcher] Disconnected, reconnecting in 3s...')
        setTimeout(connect, 3000)
      }

      ws.onerror = () => {
        ws.close()
      }

      wsRef.current = ws
    }

    connect()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [])
}
