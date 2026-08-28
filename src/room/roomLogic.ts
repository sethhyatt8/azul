import { applyDraft, startGame } from '../game/engine'
import { normalizeGameState } from '../game/normalize'
import { TILE_COLORS, type GameState, type TileColor } from '../game/types'
import {
  GAME_ID,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PHASE,
  sanitizeName,
  type ClientMessage,
  type Phase,
  type Player,
} from './protocol'

export type StoredRoom = {
  gameId: typeof GAME_ID
  phase: Phase
  hostId: string | null
  createdBy: string | null
  players: Record<string, Player>
  game: GameState | null
  errorMessage: string | null
}

export type RoomState = {
  roomCode: string
  selfId: string
  hostId: string | null
  createdBy: string | null
  players: Player[]
  phase: Phase
  game: GameState | null
  errorMessage: string | null
  isHost: boolean
  isMyTurn: boolean
  currentPlayerId: string | null
}

export function emptyRoom(hostId: string, name: string): StoredRoom {
  return {
    gameId: GAME_ID,
    phase: PHASE.lobby,
    hostId,
    createdBy: hostId,
    players: { [hostId]: playerRecord(hostId, name) },
    game: null,
    errorMessage: null,
  }
}

export function playerRecord(id: string, name: string): Player {
  return { id, name: sanitizeName(name), seenAt: Date.now() }
}

export function playerCount(room: StoredRoom) {
  return Object.keys(room.players).length
}

export function toFirebaseRoom(room: StoredRoom) {
  return {
    ...room,
    game: room.game,
  }
}

export function normalizeStoredRoom(raw: unknown): StoredRoom | null {
  if (!isRecord(raw)) return null
  if (raw.gameId && raw.gameId !== GAME_ID) return null
  const phase = isPhase(raw.phase) ? raw.phase : PHASE.lobby
  return {
    gameId: GAME_ID,
    phase,
    hostId: typeof raw.hostId === 'string' ? raw.hostId : null,
    createdBy:
      typeof raw.createdBy === 'string'
        ? raw.createdBy
        : typeof raw.hostId === 'string'
          ? raw.hostId
          : null,
    players: normalizePlayers(raw.players),
    game: normalizeGameState(raw.game),
    errorMessage: typeof raw.errorMessage === 'string' ? raw.errorMessage : null,
  }
}

export function toRoomState(room: StoredRoom, selfId: string, roomCode: string): RoomState {
  const hostId = room.createdBy ?? room.hostId
  const game = room.game
  const activeIds =
    game && room.phase !== PHASE.lobby ? new Set(game.playerOrder) : null
  const players = Object.values(room.players)
    .filter((player) => !activeIds || activeIds.has(player.id))
    .sort((a, b) => {
      if (a.id === hostId) return -1
      if (b.id === hostId) return 1
      return a.name.localeCompare(b.name)
    })
  const currentPlayerId =
    game && game.phase === 'drafting'
      ? game.playerOrder[game.currentPlayerIndex] ?? null
      : null
  return {
    roomCode,
    selfId,
    hostId,
    createdBy: room.createdBy,
    players,
    phase: room.phase,
    game,
    errorMessage: room.errorMessage,
    isHost: selfId === hostId,
    isMyTurn: currentPlayerId === selfId,
    currentPlayerId,
  }
}

export function addPlayer(room: StoredRoom, id: string, name: string): StoredRoom | string {
  if (room.players[id]) {
    return pinHost({
      ...room,
      players: {
        ...room.players,
        [id]: { ...room.players[id], name: sanitizeName(name), seenAt: Date.now() },
      },
    })
  }
  if (playerCount(room) >= MAX_PLAYERS) return `This room is full (${MAX_PLAYERS} players).`
  if (room.phase !== PHASE.lobby) return 'This game has already started.'
  return pinHost({
    ...room,
    players: {
      ...room.players,
      [id]: playerRecord(id, name),
    },
  })
}

export function applyMessage(
  room: StoredRoom,
  senderId: string,
  message: ClientMessage,
): StoredRoom | { error: string } {
  if (!room.players[senderId]) return room

  if (message.type === 'start' && isHost(room, senderId) && room.phase === PHASE.lobby) {
    const ids = Object.keys(room.players)
    if (ids.length < MIN_PLAYERS) {
      return { error: `Need at least ${MIN_PLAYERS} players to start.` }
    }
    const game = startGame(ids)
    return {
      ...room,
      phase: PHASE.drafting,
      game,
      errorMessage: null,
    }
  }

  if (message.type === 'draft' && room.game && room.phase === PHASE.drafting) {
    const color = sanitizeColor(message.color)
    if (!color) return { error: 'Invalid tile color.' }
    const result = applyDraft(room.game, senderId, {
      source: message.source,
      factoryIndex: message.factoryIndex,
      color,
      lineIndex: message.lineIndex,
    })
    if ('error' in result) return result
    return {
      ...room,
      phase: result.phase,
      game: result,
      errorMessage: null,
    }
  }

  if (message.type === 'backToLobby' && isHost(room, senderId)) {
    return {
      ...room,
      phase: PHASE.lobby,
      game: null,
      errorMessage: null,
    }
  }

  return room
}

function isHost(room: StoredRoom, id: string) {
  return id === room.createdBy || id === room.hostId
}

function pinHost(room: StoredRoom): StoredRoom {
  const createdBy = room.createdBy ?? room.hostId
  return { ...room, createdBy, hostId: createdBy ?? room.hostId }
}

function isPhase(value: unknown): value is Phase {
  return (
    value === PHASE.lobby ||
    value === PHASE.drafting ||
    value === PHASE.roundEnd ||
    value === PHASE.gameOver
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizePlayers(raw: unknown): Record<string, Player> {
  if (!isRecord(raw)) return {}
  const players: Record<string, Player> = {}
  for (const [id, value] of Object.entries(raw)) {
    if (!isRecord(value)) continue
    players[id] = {
      id: typeof value.id === 'string' ? value.id : id,
      name: typeof value.name === 'string' && value.name.trim() ? value.name : 'Player',
      seenAt: typeof value.seenAt === 'number' ? value.seenAt : undefined,
    }
  }
  return players
}

function sanitizeColor(raw: string): TileColor | null {
  return TILE_COLORS.includes(raw as TileColor) ? (raw as TileColor) : null
}
