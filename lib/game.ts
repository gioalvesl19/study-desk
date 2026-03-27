export interface GameStats {
  xp: number
  streak: number
  lastPlayed: string | null
  totalCorrect: number
  totalAnswered: number
  flashcardsDone: number
}

const STORAGE_KEY = 'studydesk_game_v2'

export const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000]
export const LEVEL_TITLES = ['Iniciante', 'Estudante', 'Aplicado', 'Dedicado', 'Avançado', 'Expert', 'Mestre', 'Lendário', 'Imortal']

export function getLevelInfo(xp: number) {
  let level = 0
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i
  }
  const minXP = LEVEL_THRESHOLDS[level]
  const maxXP = LEVEL_THRESHOLDS[level + 1] ?? LEVEL_THRESHOLDS[level] * 2
  const pct = Math.min(100, Math.round(((xp - minXP) / (maxXP - minXP)) * 100))
  return {
    level: level + 1,
    title: LEVEL_TITLES[level],
    nextTitle: LEVEL_TITLES[level + 1] ?? '∞',
    currentXP: xp - minXP,
    neededXP: maxXP - minXP,
    pct,
  }
}

export function getComboBonus(combo: number): number {
  if (combo < 2) return 0
  if (combo < 4) return 5
  if (combo < 6) return 10
  if (combo < 10) return 20
  return 30
}

export function getComboLabel(combo: number): string {
  if (combo < 2) return ''
  if (combo < 4) return 'Bom!'
  if (combo < 6) return 'Incrível!'
  if (combo < 10) return 'Fantástico!'
  return 'IMPARÁVEL!'
}

export function loadStats(): GameStats {
  if (typeof window === 'undefined') return defaultStats()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultStats()
    return { ...defaultStats(), ...JSON.parse(raw) }
  } catch {
    return defaultStats()
  }
}

export function saveStats(stats: GameStats): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stats)) } catch {}
}

export function touchStreak(stats: GameStats): GameStats {
  const today = new Date().toISOString().split('T')[0]
  if (stats.lastPlayed === today) return stats
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const streak = stats.lastPlayed === yesterday ? stats.streak + 1 : 1
  return { ...stats, streak, lastPlayed: today }
}

function defaultStats(): GameStats {
  return { xp: 0, streak: 0, lastPlayed: null, totalCorrect: 0, totalAnswered: 0, flashcardsDone: 0 }
}
