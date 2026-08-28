export const GAME_ID = 'azul'
export const GAME_TITLE = 'Azul'
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 4
export const MAX_NAME_LENGTH = 20
export const ROOM_CODE_LENGTH = 4
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const PHASE = {
  lobby: 'lobby',
  drafting: 'drafting',
  roundEnd: 'roundEnd',
  gameOver: 'gameOver',
} as const

export type Phase = (typeof PHASE)[keyof typeof PHASE]

export type Player = {
  id: string
  name: string
  seenAt?: number
}

export type ClientMessage =
  | { type: 'start' }
  | { type: 'draft'; source: 'factory' | 'center'; factoryIndex?: number; color: string }
  | { type: 'backToLobby' }

export function sanitizeName(raw: string | null | undefined): string {
  const trimmed = (raw ?? '').replace(/\s+/g, ' ').trim()
  if (!trimmed) return 'Player'
  return trimmed.slice(0, MAX_NAME_LENGTH)
}

export function normalizeRoomCode(raw: string | null | undefined): string {
  return (raw ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, ROOM_CODE_LENGTH)
}
