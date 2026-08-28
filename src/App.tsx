import { useEffect, useMemo, useState } from 'react'
import { normalizeRoomCode } from './room/protocol'
import { useAzulRoom, type RoomSession } from './room/useAzulRoom'
import { HomeScreen } from './screens/HomeScreen'
import { RoomScreen } from './screens/RoomScreen'
import './App.css'

function readRoomFromUrl() {
  const params = new URLSearchParams(window.location.search)
  return normalizeRoomCode(params.get('room'))
}

export default function App() {
  const initialCode = useMemo(() => readRoomFromUrl(), [])
  const [session, setSession] = useState<RoomSession | null>(null)

  useEffect(() => {
    const root = document.getElementById('root')
    root?.classList.toggle('wide', Boolean(session))
    return () => root?.classList.remove('wide')
  }, [session])

  function enter(next: RoomSession) {
    const url = new URL(window.location.href)
    url.searchParams.set('room', next.roomCode)
    window.history.replaceState(null, '', url)
    setSession(next)
  }

  function leave() {
    const url = new URL(window.location.href)
    url.searchParams.delete('room')
    window.history.replaceState(null, '', url)
    setSession(null)
  }

  if (!session) {
    return <HomeScreen initialCode={initialCode} onEnter={enter} />
  }

  return <RoomGate session={session} onLeave={leave} />
}

function RoomGate({ session, onLeave }: { session: RoomSession; onLeave: () => void }) {
  const { state, error, status, send, disconnect } = useAzulRoom(session)

  function handleLeave() {
    disconnect()
    onLeave()
  }

  if (status === 'connecting' || !state) {
    return (
      <section className="screen room">
        <p className="eyebrow">{session.roomCode}</p>
        <h1>Connecting…</h1>
        {error ? <p className="error-banner">{error}</p> : null}
        <button type="button" className="btn ghost" onClick={handleLeave}>
          Leave
        </button>
      </section>
    )
  }

  return <RoomScreen state={state} error={error} onSend={send} onLeave={handleLeave} />
}
