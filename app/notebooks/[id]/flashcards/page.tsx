'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { Flashcard } from '@/lib/types'
import { loadStats, saveStats, getLevelInfo, touchStreak } from '@/lib/game'
import { ArrowLeft, RotateCcw, ChevronLeft, ChevronRight, CheckCheck, Zap } from 'lucide-react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'

function FlashcardsContent() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const subtopicId = searchParams.get('subtopicId')
  const topicId = searchParams.get('topicId')

  const [cards, setCards] = useState<Flashcard[]>([])
  const [current, setCurrent] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [scopeLabel, setScopeLabel] = useState('')
  const [backHref, setBackHref] = useState(`/notebooks/${id}`)
  const [finished, setFinished] = useState(false)
  const [knownCount, setKnownCount] = useState(0)
  const [sessionXP, setSessionXP] = useState(0)

  useEffect(() => { fetchData() }, [id, subtopicId, topicId])

  async function fetchData() {
    let query = supabase.from('flashcards').select('*')
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
      else { setCards([]); setLoading(false); return }
      const { data: top } = await supabase.from('topics').select('name').eq('id', topicId).single()
      if (top) { label = top.name; back = `/notebooks/${id}/topics/${topicId}` }
    } else {
      query = query.eq('notebook_id', id)
      const { data: nb } = await supabase.from('notebooks').select('name').eq('id', id).single()
      if (nb) label = nb.name
    }

    const { data } = await query.order('created_at')
    setCards(shuffle(data ?? []))
    setScopeLabel(label)
    setBackHref(back)
    setLoading(false)
  }

  function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5) }

  function answerCard(known: boolean) {
    if (known) {
      const xp = 5
      setKnownCount((k) => k + 1)
      setSessionXP((s) => s + xp)
      const stats = touchStreak(loadStats())
      stats.xp += xp
      stats.flashcardsDone += 1
      saveStats(stats)
    }
    setFlipped(false)
    setTimeout(() => {
      if (current + 1 >= cards.length) setFinished(true)
      else setCurrent((c) => c + 1)
    }, 200)
  }

  function prev() {
    setFlipped(false)
    setTimeout(() => setCurrent((c) => Math.max(0, c - 1)), 150)
  }

  function restart() {
    setCards(shuffle(cards)); setCurrent(0); setFlipped(false); setFinished(false); setKnownCount(0); setSessionXP(0)
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  )

  if (cards.length === 0) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="text-5xl mb-4">🃏</div>
      <h2 className="text-xl font-bold text-white mb-2">Nenhum flashcard</h2>
      <p className="text-white/40 mb-6 text-sm">Importe flashcards para este subtópico primeiro.</p>
      <Link href={backHref} className="bg-white hover:bg-white/90 text-black px-5 py-2.5 rounded-xl text-sm font-bold transition-all">Voltar</Link>
    </div>
  )

  if (finished) {
    const pct = knownCount > 0 ? Math.round((knownCount / cards.length) * 100) : 0
    const stats = loadStats()
    const levelInfo = getLevelInfo(stats.xp)
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 max-w-sm w-full text-center glow-white-sm animate-fade-up">
          <div className="text-4xl mb-4">🃏</div>
          <h2 className="text-2xl font-black text-white mb-1">Revisão concluída!</h2>
          <p className="text-white/40 text-sm mb-5">{scopeLabel}</p>

          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { label: 'Sabia', value: knownCount, icon: '✓' },
              { label: 'XP ganho', value: `+${sessionXP}`, icon: '⚡' },
              { label: 'Nível', value: levelInfo.level, icon: '🎖️' },
            ].map((s) => (
              <div key={s.label} className="bg-white/5 border border-white/8 rounded-xl p-3">
                <p className="text-base mb-0.5">{s.icon}</p>
                <p className="text-base font-bold text-white">{s.value}</p>
                <p className="text-xs text-white/30">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden mb-5">
            <div className="h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
          </div>

          <div className="flex gap-3">
            <Link href={backHref} className="flex-1 text-center bg-white/6 hover:bg-white/10 border border-white/10 text-white py-3 rounded-xl text-sm font-medium transition-all">
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

  const card = cards[current]
  const progress = ((current + 1) / cards.length) * 100

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <header className="border-b border-white/8 bg-black/90 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-2.5">
            <Link href={backHref} className="p-1.5 text-white/30 hover:text-white hover:bg-white/8 rounded-lg transition-all">
              <ArrowLeft size={17} />
            </Link>
            <div className="flex-1 flex items-center justify-between">
              <span className="text-xs text-white/40 truncate max-w-[150px]">{scopeLabel}</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-xs text-white/40">
                  <Zap size={11} /> +{sessionXP} XP
                </span>
                <span className="text-xs text-white/40 font-mono">{current + 1}/{cards.length}</span>
              </div>
            </div>
          </div>
          <div className="w-full h-1 bg-white/8 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-400" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full px-4 py-6">
        <p className="text-xs text-white/30 mb-5 text-center uppercase tracking-widest">Toque para revelar</p>

        {/* Flip card */}
        <div className="flip-card w-full cursor-pointer select-none mb-6" style={{ height: '280px' }} onClick={() => setFlipped((f) => !f)}>
          <div className={`flip-card-inner ${flipped ? 'flipped' : ''}`}>
            {/* Front */}
            <div className="flip-card-front bg-white/[0.04] border border-white/10 flex flex-col items-center justify-center p-8 hover:border-white/20 transition-all glow-white-sm">
              <span className="text-xs font-medium text-white/30 uppercase tracking-widest mb-4">Pergunta</span>
              <p className="text-white text-lg font-bold text-center leading-relaxed">{card.question}</p>
              <span className="absolute bottom-4 text-white/20 text-xs">toque →</span>
            </div>
            {/* Back */}
            <div className="flip-card-back bg-white flex flex-col items-center justify-center p-8 glow-white-lg">
              <span className="text-xs font-medium text-black/40 uppercase tracking-widest mb-4">Resposta</span>
              <p className="text-black text-lg font-bold text-center leading-relaxed">{card.answer}</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {flipped ? (
          <div className="flex gap-3 w-full">
            <button onClick={() => answerCard(false)}
              className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/60 py-3.5 rounded-xl text-sm font-semibold transition-all">
              ✗ Não sabia
            </button>
            <button onClick={() => answerCard(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-white/90 text-black py-3.5 rounded-xl text-sm font-bold transition-all glow-white-sm">
              ✓ Sabia! +5 XP
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button onClick={prev} disabled={current === 0}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/8 disabled:opacity-20 border border-white/8 text-white/50 px-5 py-2.5 rounded-xl text-sm font-medium transition-all">
              <ChevronLeft size={15} /> Anterior
            </button>
            <button onClick={() => setFlipped(true)}
              className="bg-white/8 hover:bg-white/12 border border-white/10 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all">
              Revelar
            </button>
            <button onClick={() => { setFlipped(false); setTimeout(() => { if (current + 1 >= cards.length) setFinished(true); else setCurrent(c => c + 1) }, 150) }}
              className="flex items-center gap-2 bg-white/8 hover:bg-white/12 border border-white/10 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all">
              Pular <ChevronRight size={15} />
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

export default function FlashcardsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="w-7 h-7 border-2 border-white/20 border-t-white rounded-full animate-spin" /></div>}>
      <FlashcardsContent />
    </Suspense>
  )
}
