'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { Question } from '@/lib/types'
import { loadStats, saveStats, getComboBonus, getComboLabel, getLevelInfo, touchStreak } from '@/lib/game'
import { ArrowLeft, CheckCircle2, XCircle, ChevronRight, RotateCcw, Zap, Trophy, Flame } from 'lucide-react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'

function QuestionsContent() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const subtopicId = searchParams.get('subtopicId')
  const topicId = searchParams.get('topicId')

  const [questions, setQuestions] = useState<Question[]>([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [sessionXP, setSessionXP] = useState(0)
  const [showXP, setShowXP] = useState<{ key: number; amount: number; label: string } | null>(null)
  const [shaking, setShaking] = useState(false)
  const [glowing, setGlowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [finished, setFinished] = useState(false)
  const [scopeLabel, setScopeLabel] = useState('')
  const [backHref, setBackHref] = useState(`/notebooks/${id}`)
  const [leveledUp, setLeveledUp] = useState<{ old: number; new: number } | null>(null)
  const xpKeyRef = useRef(0)

  useEffect(() => { fetchData() }, [id, subtopicId, topicId])

  async function fetchData() {
    let query = supabase.from('questions').select('*')
    let label = ''
    let back = `/notebooks/${id}`

    if (subtopicId) {
      query = query.eq('subtopic_id', subtopicId)
      const { data: sub } = await supabase.from('subtopics').select('name, topic_id').eq('id', subtopicId).single()
      if (sub) { label = sub.name; back = `/notebooks/${id}/topics/${sub.topic_id}/subtopics/${subtopicId}` }
    } else if (topicId) {
      const { data: subs } = await supabase.from('subtopics').select('id').eq('topic_id', topicId)
      const ids = (subs ?? []).map((s: { id: string }) => s.id)
      if (ids.length > 0) query = query.in('subtopic_id', ids)
      else { setQuestions([]); setLoading(false); return }
      const { data: top } = await supabase.from('topics').select('name').eq('id', topicId).single()
      if (top) { label = top.name; back = `/notebooks/${id}/topics/${topicId}` }
    } else {
      query = query.eq('notebook_id', id)
      const { data: nb } = await supabase.from('notebooks').select('name').eq('id', id).single()
      if (nb) label = nb.name
    }

    const { data } = await query.order('created_at')
    setQuestions(shuffle(data ?? []))
    setScopeLabel(label)
    setBackHref(back)
    setLoading(false)
  }

  function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5) }

  function getOptions(q: Question) {
    return [
      { label: 'A', text: q.option_a, explanation: q.explanation_a },
      { label: 'B', text: q.option_b, explanation: q.explanation_b },
      { label: 'C', text: q.option_c, explanation: q.explanation_c },
      { label: 'D', text: q.option_d, explanation: q.explanation_d },
      { label: 'E', text: q.option_e, explanation: q.explanation_e },
    ].filter((o) => o.text)
  }

  async function handleSelect(label: string) {
    if (answered) return
    setSelected(label)
    setAnswered(true)
    const q = questions[current]
    const isCorrect = label.toUpperCase() === q.correct_answer.toUpperCase()

    if (isCorrect) {
      const newCombo = combo + 1
      const bonus = getComboBonus(newCombo)
      const xpEarned = 10 + bonus
      setCombo(newCombo)
      setMaxCombo((m) => Math.max(m, newCombo))
      setSessionXP((prev) => prev + xpEarned)
      setGlowing(true)
      setTimeout(() => setGlowing(false), 800)
      xpKeyRef.current++
      setShowXP({ key: xpKeyRef.current, amount: xpEarned, label: newCombo >= 2 ? getComboLabel(newCombo) : '' })
      setTimeout(() => setShowXP(null), 1200)

      // Update global stats
      const stats = touchStreak(loadStats())
      const oldLevel = getLevelInfo(stats.xp).level
      stats.xp += xpEarned
      stats.totalCorrect += 1
      stats.totalAnswered += 1
      const newLevel = getLevelInfo(stats.xp).level
      if (newLevel > oldLevel) setLeveledUp({ old: oldLevel, new: newLevel })
      saveStats(stats)
    } else {
      setCombo(0)
      setShaking(true)
      setTimeout(() => setShaking(false), 500)
      const stats = touchStreak(loadStats())
      stats.totalAnswered += 1
      saveStats(stats)
    }

    setScore((prev) => ({ correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1 }))
    await supabase.from('question_attempts').insert({ question_id: q.id, selected_answer: label, is_correct: isCorrect })
  }

  function next() {
    if (current + 1 >= questions.length) setFinished(true)
    else { setCurrent((c) => c + 1); setSelected(null); setAnswered(false) }
  }

  function restart() {
    setQuestions(shuffle(questions)); setCurrent(0); setSelected(null); setAnswered(false)
    setScore({ correct: 0, total: 0 }); setCombo(0); setMaxCombo(0); setSessionXP(0); setFinished(false); setLeveledUp(null)
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  )

  if (questions.length === 0) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="text-5xl mb-4">📭</div>
      <h2 className="text-xl font-bold text-white mb-2">Nenhuma questão</h2>
      <p className="text-white/40 mb-6 text-sm">Importe questões para este subtópico primeiro.</p>
      <Link href={backHref} className="bg-white hover:bg-white/90 text-black px-5 py-2.5 rounded-xl text-sm font-bold transition-all">Voltar</Link>
    </div>
  )

  if (finished) {
    const pct = Math.round((score.correct / score.total) * 100)
    const medal = pct >= 90 ? '🏆' : pct >= 70 ? '🥈' : pct >= 50 ? '🥉' : '📚'
    const stats = loadStats()
    const levelInfo = getLevelInfo(stats.xp)
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        {leveledUp && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="text-center animate-level-up">
              <p className="text-6xl mb-2">⬆️</p>
              <p className="text-2xl font-black text-white">LEVEL UP!</p>
              <p className="text-white/60 text-sm">Nível {leveledUp.old} → {leveledUp.new}</p>
            </div>
          </div>
        )}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 max-w-sm w-full text-center glow-white-sm animate-fade-up">
          <div className="text-5xl mb-4">{medal}</div>
          <h2 className="text-3xl font-black text-white mb-1">{pct}%</h2>
          <p className="text-white/40 text-sm mb-6">{score.correct} de {score.total} corretas · {scopeLabel}</p>

          <div className="w-full h-2 bg-white/8 rounded-full overflow-hidden mb-6">
            <div className="h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[
              { label: 'XP ganho', value: `+${sessionXP}`, icon: '⚡' },
              { label: 'Combo max', value: `×${maxCombo}`, icon: '🔥' },
              { label: 'Nível', value: levelInfo.level, icon: '🎖️' },
            ].map((s) => (
              <div key={s.label} className="bg-white/5 border border-white/8 rounded-xl p-3">
                <p className="text-lg mb-0.5">{s.icon}</p>
                <p className="text-base font-bold text-white">{s.value}</p>
                <p className="text-xs text-white/30">{s.label}</p>
              </div>
            ))}
          </div>

          {/* XP Progress */}
          <div className="bg-white/5 border border-white/8 rounded-xl p-3 mb-5">
            <div className="flex items-center justify-between text-xs text-white/40 mb-1.5">
              <span>Nível {levelInfo.level} — {levelInfo.title}</span>
              <span>{levelInfo.currentXP}/{levelInfo.neededXP} XP</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full" style={{ width: `${levelInfo.pct}%` }} />
            </div>
          </div>

          <div className="flex gap-3">
            <Link href={backHref} className="flex-1 bg-white/6 hover:bg-white/10 border border-white/10 text-white py-3 rounded-xl text-sm font-medium transition-all text-center">
              Voltar
            </Link>
            <button onClick={restart} className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-white/90 text-black py-3 rounded-xl text-sm font-bold transition-all">
              <RotateCcw size={14} /> Refazer
            </button>
          </div>
        </div>
      </div>
    )
  }

  const q = questions[current]
  const options = getOptions(q)
  const progress = (current / questions.length) * 100
  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 100

  return (
    <div className="min-h-screen bg-black">
      {/* Header / HUD */}
      <header className="border-b border-white/8 bg-black/90 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-2.5">
            <Link href={backHref} className="p-1.5 text-white/30 hover:text-white hover:bg-white/8 rounded-lg transition-all">
              <ArrowLeft size={17} />
            </Link>
            <div className="flex-1 flex items-center justify-between">
              <span className="text-xs text-white/40 truncate max-w-[150px]">{scopeLabel}</span>
              <div className="flex items-center gap-3">
                {combo >= 2 && (
                  <span className="text-xs font-bold text-white bg-white/10 border border-white/20 px-2.5 py-1 rounded-full animate-combo-pop">
                    🔥 {combo}× COMBO
                  </span>
                )}
                <span className="text-xs text-white/40 font-mono">{current + 1}/{questions.length}</span>
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1 bg-white/8 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 relative">
        {/* Score bar */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/8 rounded-full px-3 py-1">
            <CheckCircle2 size={12} className="text-white/60" />
            <span className="text-xs font-semibold text-white">{score.correct}</span>
          </div>
          {score.total > score.correct && (
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/8 rounded-full px-3 py-1">
              <XCircle size={12} className="text-white/40" />
              <span className="text-xs font-semibold text-white/40">{score.total - score.correct}</span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <Zap size={12} className="text-white/40" />
            <span className="text-xs text-white/40 font-mono">+{sessionXP} XP</span>
          </div>
        </div>

        {/* Question card */}
        <div className={`bg-white/[0.04] border border-white/10 rounded-2xl p-6 mb-4 relative transition-all ${glowing ? 'animate-correct-glow border-white/40' : ''} ${shaking ? 'animate-shake' : ''}`}>
          <p className="text-white text-base leading-relaxed font-medium">{q.question}</p>

          {/* XP floating */}
          {showXP && (
            <div key={showXP.key} className="absolute top-2 right-4 pointer-events-none animate-xp-float z-10">
              <div className="flex flex-col items-end">
                {showXP.label && <span className="text-xs font-bold text-white/80">{showXP.label}</span>}
                <span className="text-lg font-black text-white">+{showXP.amount} XP</span>
              </div>
            </div>
          )}
        </div>

        {/* Options */}
        <div className="space-y-2.5 mb-5">
          {options.map((opt) => {
            const isCorrect = opt.label.toUpperCase() === q.correct_answer.toUpperCase()
            const isSelected = selected === opt.label
            let cls = 'bg-white/[0.03] border-white/8 text-white/80 hover:bg-white/[0.07] hover:border-white/20 cursor-pointer'
            if (answered) {
              if (isCorrect) cls = 'bg-white border-white text-black'
              else if (isSelected && !isCorrect) cls = 'bg-white/[0.03] border-white/10 text-white/30'
              else cls = 'bg-white/[0.02] border-white/5 text-white/20'
            }
            return (
              <button key={opt.label} onClick={() => handleSelect(opt.label)} disabled={answered}
                className={`w-full text-left border rounded-xl px-4 py-3.5 transition-all duration-200 ${cls}`}>
                <div className="flex items-start gap-3">
                  <span className={`flex-shrink-0 w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center mt-0.5 ${answered && isCorrect ? 'bg-black text-white' : answered && isSelected && !isCorrect ? 'bg-white/10 text-white/30' : 'bg-white/8 text-white/50'}`}>
                    {opt.label}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed">{opt.text}</p>
                    {answered && opt.explanation && (isCorrect || isSelected) && (
                      <p className={`mt-2 text-xs leading-relaxed ${isCorrect ? 'text-black/60' : 'text-white/30'}`}>{opt.explanation}</p>
                    )}
                  </div>
                  {answered && (
                    <div className="flex-shrink-0 mt-0.5">
                      {isCorrect ? <CheckCircle2 size={17} className="text-black" /> : isSelected ? <XCircle size={17} className="text-white/30" /> : null}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {answered && (
          <button onClick={next} className="w-full flex items-center justify-center gap-2 bg-white hover:bg-white/90 text-black font-bold py-3.5 rounded-xl transition-all glow-white-sm">
            {current + 1 >= questions.length ? '🏆 Ver Resultado' : 'Próxima'}
            <ChevronRight size={17} />
          </button>
        )}
      </main>
    </div>
  )
}

export default function QuestionsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="w-7 h-7 border-2 border-white/20 border-t-white rounded-full animate-spin" /></div>}>
      <QuestionsContent />
    </Suspense>
  )
}
