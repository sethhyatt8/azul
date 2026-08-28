import { useCallback, useEffect, useRef, useState } from 'react'
import { isFirebaseConfigured, rtdbListen, rtdbSet, rtdbTransaction } from './rtdb'
import {
  addPlayer,
  applyMessage,
  emptyRoom,
  normalizeStoredRoom,
  playerCount,
  toFirebaseRoom,
  toRoomState,
  type RoomState,
  type StoredRoom,
} from './roomLogic'
import { sanitizeName, type ClientMessage } from './protocol'

export type RoomSession = {
  roomCode: string
  name: string
  intent: 'create' | 'join'
}

const RTDB_ROOT = 'azul'

function playerIdForRoom(roomCode: string) {
  const key = `azul-player-${roomCode}`
  const existing = localStorage.getItem(key)
  if (existing) return existing
  const id = crypto.randomUUID()
  localStorage.setItem(key, id)
  return id
}

export function useAzulRoom(session: RoomSession) {
  const [state, setState] = useState<RoomState | null>(null)
  const [error, setError] = useState<string | null>(() =>
    isFirebaseConfigured() ? null : 'Firebase is not configured yet.',
  )
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>(() =>
    isFirebaseConfigured() ? 'connecting' : 'closed',
  )
  const selfId = useRef(playerIdForRoom(session.roomCode))
  const latestState = useRef<RoomState | null>(null)
  const phaseRef = useRef<StoredRoom['phase']>('lobby')

  useEffect(() => {
    if (!isFirebaseConfigured()) return

    const code = session.roomCode
    const id = selfId.current
    const name = sanitizeName(session.name)
    const path = `${RTDB_ROOT}/${code}`
    let stopped = false

    const stopListen = rtdbListen(path, (data) => {
      const room = normalizeStoredRoom(data)
      if (!room) return
      phaseRef.current = room.phase
      if (!room.players[id]) return
      setError(room.errorMessage)
      latestState.current = toRoomState(room, id, code)
      setState(latestState.current)
    })

    void rtdbTransaction(path, (current) => {
      const room = normalizeStoredRoom(current)
      if (session.intent === 'join') {
        if (!room || playerCount(room) === 0) return undefined
        const next = addPlayer(room, id, name)
        return typeof next === 'string' ? undefined : toFirebaseRoom(next)
      }
      if (room && playerCount(room) > 0) {
        const next = addPlayer(room, id, name)
        return typeof next === 'string' ? undefined : toFirebaseRoom(next)
      }
      return toFirebaseRoom(emptyRoom(id, name))
    })
      .then((result) => {
        if (stopped) return
        if (!result.committed) {
          const room = normalizeStoredRoom(result.snapshot)
          setError(
            session.intent === 'join'
              ? room && room.phase !== 'lobby'
                ? 'This game has already started.'
                : 'Room not found. Check the code, or create a room.'
              : 'This room is full.',
          )
          setStatus('closed')
          return
        }
        setStatus('open')
      })
      .catch(() => {
        if (stopped) return
        setError('Could not reach Firebase. Confirm Realtime Database is created.')
        setStatus('closed')
      })

    const heartbeat = window.setInterval(() => {
      void rtdbSet(`${path}/players/${id}/seenAt`, Date.now())
    }, 4000)

    return () => {
      stopped = true
      stopListen()
      window.clearInterval(heartbeat)
      if (phaseRef.current === 'lobby') {
        void rtdbSet(`${path}/players/${id}`, null)
      }
    }
  }, [session.intent, session.name, session.roomCode])

  const send = useCallback(
    (message: ClientMessage) => {
      if (!isFirebaseConfigured()) return
      const code = session.roomCode
      const id = selfId.current
      const path = `${RTDB_ROOT}/${code}`

      void rtdbTransaction(path, (current) => {
        const room = normalizeStoredRoom(current)
        if (!room) return undefined
        const next = applyMessage(room, id, message)
        if ('error' in next) return undefined
        return toFirebaseRoom(next)
      }).then((result) => {
        if (result.committed) {
          const room = normalizeStoredRoom(result.snapshot)
          if (room) {
            latestState.current = toRoomState(room, id, code)
            setState(latestState.current)
            setError(room.errorMessage)
          }
          return
        }
        const room = normalizeStoredRoom(result.snapshot)
        if (!room) return
        const next = applyMessage(room, id, message)
        if ('error' in next) setError(next.error)
      })
    },
    [session.roomCode],
  )

  const disconnect = useCallback(() => {
    const id = selfId.current
    void rtdbSet(`${RTDB_ROOT}/${session.roomCode}/players/${id}`, null)
  }, [session.roomCode])

  return { state, error, status, send, disconnect }
}
