'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { Flashcard } from '@/lib/types'
import { ArrowLeft, RotateCcw, ChevronLeft, ChevronRight, CheckCheck } from 'lucide-react'
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

  function shuffle<T>(arr: T[]): T[] {
    return [...arr].sort(() => Math.random() - 0.5)
  }

  function prev() {
    setFlipped(false)
    setTimeout(() => setCurrent((c) => Math.max(0, c - 1)), 150)
  }

  function next() {
    setFlipped(false)
    setTimeout(() => {
      if (current + 1 >= cards.length) setFinished(true)
      else setCurrent((c) => c + 1)
    }, 150)
  }

  function restart() {
    setCards(shuffle(cards))
    setCurrent(0); setFlipped(false); setFinished(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (cards.length === 0) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">🃏</div>
        <h2 className="text-xl font-semibold text-white mb-2">Nenhum flashcard</h2>
        <p className="text-slate-400 mb-6">Importe flashcards para este subtópico primeiro.</p>
        <Link href={backHref} className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
          Voltar
        </Link>
      </div>
    </div>
  )

  if (finished) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
          <CheckCheck size={32} className="text-purple-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">Revisão concluída!</h2>
        <p className="text-slate-400 mb-2">{scopeLabel}</p>
        <p className="text-slate-500 text-sm mb-6">{cards.length} flashcard{cards.length !== 1 ? 's' : ''} revisado{cards.length !== 1 ? 's' : ''}</p>
        <div className="flex gap-3">
          <Link href={backHref} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-xl text-sm font-medium transition-colors text-center">
            Voltar
          </Link>
          <button onClick={restart} className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
            <RotateCcw size={15} /> Refazer
          </button>
        </div>
      </div>
    </div>
  )

  const card = cards[current]
  const progress = ((current + 1) / cards.length) * 100

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={backHref} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span className="truncate max-w-[180px]">{scopeLabel}</span>
              <span>{current + 1} / {cards.length}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5">
              <div className="h-1.5 rounded-full bg-purple-500 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full px-4 py-8">
        <p className="text-sm text-slate-400 mb-6 text-center">Toque no card para ver a resposta</p>
        <div className="flip-card w-full cursor-pointer select-none" style={{ height: '300px' }} onClick={() => setFlipped((f) => !f)}>
          <div className={`flip-card-inner ${flipped ? 'flipped' : ''}`}>
            <div className="flip-card-front bg-slate-900 border border-slate-700 flex flex-col items-center justify-center p-8">
              <span className="text-xs font-medium text-purple-400 uppercase tracking-wider mb-4">Pergunta</span>
              <p className="text-white text-lg font-medium text-center leading-relaxed">{card.question}</p>
              <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                <span className="text-purple-400 text-xs">→</span>
              </div>
            </div>
            <div className="flip-card-back bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border border-purple-700/50 flex flex-col items-center justify-center p-8">
              <span className="text-xs font-medium text-purple-300 uppercase tracking-wider mb-4">Resposta</span>
              <p className="text-white text-base text-center leading-relaxed">{card.answer}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-8">
          <button onClick={prev} disabled={current === 0} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <ChevronLeft size={16} /> Anterior
          </button>
          <button onClick={() => setFlipped((f) => !f)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
            Virar
          </button>
          <button onClick={next} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
            {current + 1 >= cards.length ? 'Concluir' : 'Próximo'} <ChevronRight size={16} />
          </button>
        </div>
      </main>
    </div>
  )
}

export default function FlashcardsPage() {
  return <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>}><FlashcardsContent /></Suspense>
}
