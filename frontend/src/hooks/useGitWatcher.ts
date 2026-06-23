import { useEffect, useRef } from 'react'
import { getStoredRepoPath } from '../apis'

/**
 * Hook that connects to the backend WebSocket and fires a callback
 * whenever git state changes (new commit, branch switch, etc.)
 */
export function useGitWatcher(onGitChanged: () => void) {
  const wsRef = useRef<WebSocket | null>(null)
  const callbackRef = useRef(onGitChanged)
  const reconnectTimerRef = useRef<number | null>(null)
  const shouldReconnectRef = useRef(true)
  const repoPathRef = useRef(getStoredRepoPath())
  callbackRef.current = onGitChanged

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const repoPath = getStoredRepoPath()
    repoPathRef.current = repoPath
    const query = repoPath ? `?repo_path=${encodeURIComponent(repoPath)}` : ''
    const wsUrl = `${protocol}//${window.location.hostname}:8000/ws/git-watch${query}`
    shouldReconnectRef.current = true

    function connect() {
      if (!shouldReconnectRef.current) return
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
        if (!shouldReconnectRef.current) return
        console.log('[GitWatcher] Disconnected, reconnecting in 3s...')
        reconnectTimerRef.current = window.setTimeout(connect, 3000)
      }

      ws.onerror = () => {
        ws.close()
      }

      wsRef.current = ws
    }

    connect()

    // Periodically check if repo path changed (e.g. user switched repo)
    const checkInterval = window.setInterval(() => {
      const currentPath = getStoredRepoPath()
      if (currentPath !== repoPathRef.current) {
        // Repo changed, reconnect
        shouldReconnectRef.current = false
        if (reconnectTimerRef.current) {
          window.clearTimeout(reconnectTimerRef.current)
          reconnectTimerRef.current = null
        }
        if (wsRef.current) {
          wsRef.current.close()
          wsRef.current = null
        }
        // Restart with new path
        repoPathRef.current = currentPath
        shouldReconnectRef.current = true
        const newQuery = currentPath ? `?repo_path=${encodeURIComponent(currentPath)}` : ''
        const newWsUrl = `${protocol}//${window.location.hostname}:8000/ws/git-watch${newQuery}`
        const newWs = new WebSocket(newWsUrl)
        newWs.onopen = () => console.log('[GitWatcher] Reconnected to new repo')
        newWs.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'git_changed') {
              callbackRef.current()
            }
          } catch (e) { /* ignore */ }
        }
        newWs.onclose = () => {
          if (shouldReconnectRef.current) {
            reconnectTimerRef.current = window.setTimeout(connect, 3000)
          }
        }
        newWs.onerror = () => newWs.close()
        wsRef.current = newWs
      }
    }, 5000)

    return () => {
      shouldReconnectRef.current = false
      window.clearInterval(checkInterval)
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [])
}
