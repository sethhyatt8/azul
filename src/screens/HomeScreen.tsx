import { useMemo, useState } from 'react'
import {
  MAX_NAME_LENGTH,
  MAX_PLAYERS,
  MIN_PLAYERS,
  ROOM_CODE_LENGTH,
  normalizeRoomCode,
  sanitizeName,
} from '../room/protocol'
import { generateRoomCode } from '../room/roomCode'
import type { RoomSession } from '../room/useAzulRoom'

type HomeScreenProps = {
  initialCode?: string
  onEnter: (session: RoomSession) => void
}

export function HomeScreen({ initialCode = '', onEnter }: HomeScreenProps) {
  const [name, setName] = useState(() => localStorage.getItem('azul-name') ?? '')
  const [code, setCode] = useState(initialCode)
  const [mode, setMode] = useState<'choose' | 'join'>(initialCode ? 'join' : 'choose')

  const cleanedName = useMemo(() => sanitizeName(name), [name])
  const cleanedCode = useMemo(() => normalizeRoomCode(code), [code])

  function persistName() {
    localStorage.setItem('azul-name', cleanedName)
  }

  function createRoom() {
    persistName()
    onEnter({
      intent: 'create',
      name: cleanedName,
      roomCode: generateRoomCode(),
    })
  }

  function joinRoom() {
    if (cleanedCode.length !== ROOM_CODE_LENGTH) return
    persistName()
    onEnter({
      intent: 'join',
      name: cleanedName,
      roomCode: cleanedCode,
    })
  }

  return (
    <section className="screen home">
      <p className="eyebrow">Tile drafting</p>
      <h1>Azul</h1>
      <p className="lede">Create a room, share a code, and play the board game online with friends.</p>

      <label className="field">
        Your name
        <input
          value={name}
          maxLength={MAX_NAME_LENGTH}
          onChange={(event) => setName(event.target.value)}
        />
      </label>

      {mode === 'choose' ? (
        <div className="actions">
          <button type="button" className="btn primary" onClick={createRoom}>
            Create room
          </button>
          <button type="button" className="btn ghost" onClick={() => setMode('join')}>
            Join with a code
          </button>
        </div>
      ) : (
        <form
          className="join-form"
          onSubmit={(event) => {
            event.preventDefault()
            joinRoom()
          }}
        >
          <label className="field">
            Room code
            <input
              value={code}
              maxLength={ROOM_CODE_LENGTH}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
          </label>
          <div className="actions">
            <button type="submit" className="btn primary" disabled={cleanedCode.length !== ROOM_CODE_LENGTH}>
              Join room
            </button>
            <button type="button" className="btn ghost" onClick={() => setMode('choose')}>
              Back
            </button>
          </div>
        </form>
      )}

      <p className="hint">
        {MIN_PLAYERS}–{MAX_PLAYERS} players. No accounts needed.
      </p>
    </section>
  )
}
