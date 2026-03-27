export interface Notebook {
  id: string
  name: string
  description: string | null
  color: string
  icon: string
  created_at: string
  question_count?: number
  flashcard_count?: number
}

export interface Topic {
  id: string
  notebook_id: string
  name: string
  created_at: string
  subtopic_count?: number
  question_count?: number
  flashcard_count?: number
}

export interface Subtopic {
  id: string
  topic_id: string
  name: string
  created_at: string
  question_count?: number
  flashcard_count?: number
}

export interface Question {
  id: string
  notebook_id: string
  subtopic_id: string | null
  question: string
  option_a: string | null
  explanation_a: string | null
  option_b: string | null
  explanation_b: string | null
  option_c: string | null
  explanation_c: string | null
  option_d: string | null
  explanation_d: string | null
  option_e: string | null
  explanation_e: string | null
  correct_answer: string
  created_at: string
}

export interface Flashcard {
  id: string
  notebook_id: string
  subtopic_id: string | null
  question: string
  answer: string
  created_at: string
}

export interface QuestionAttempt {
  id: string
  question_id: string
  selected_answer: string
  is_correct: boolean
  created_at: string
}

export const NOTEBOOK_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#06b6d4',
]

export const NOTEBOOK_ICONS = [
  '📚', '🧠', '❤️', '🔬', '💊', '🩺', '⚡', '🎯',
  '📝', '🌟', '🧬', '💡', '🔭', '📐', '🎓', '🏆',
]
