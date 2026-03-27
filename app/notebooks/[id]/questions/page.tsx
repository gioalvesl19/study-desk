'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { Question } from '@/lib/types'
import { ArrowLeft, CheckCircle2, XCircle, ChevronRight, RotateCcw, Trophy } from 'lucide-react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E']

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
  const [loading, setLoading] = useState(true)
  const [finished, setFinished] = useState(false)
  const [scopeLabel, setScopeLabel] = useState('')
  const [backHref, setBackHref] = useState(`/notebooks/${id}`)

  useEffect(() => { fetchData() }, [id, subtopicId, topicId])

  async function fetchData() {
    let query = supabase.from('questions').select('*')
    let label = ''
    let back = `/notebooks/${id}`

    if (subtopicId) {
      query = query.eq('subtopic_id', subtopicId)
      const { data: sub } = await supabase.from('subtopics').select('name, topic_id').eq('id', subtopicId).single()
      if (sub) {
        label = sub.name
        back = `/notebooks/${id}/topics/${sub.topic_id}/subtopics/${subtopicId}`
      }
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

  function shuffle<T>(arr: T[]): T[] {
    return [...arr].sort(() => Math.random() - 0.5)
  }

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
    setScore((prev) => ({ correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1 }))
    await supabase.from('question_attempts').insert({ question_id: q.id, selected_answer: label, is_correct: isCorrect })
  }

  function next() {
    if (current + 1 >= questions.length) { setFinished(true) }
    else { setCurrent((c) => c + 1); setSelected(null); setAnswered(false) }
  }

  function restart() {
    setQuestions(shuffle(questions))
    setCurrent(0); setSelected(null); setAnswered(false)
    setScore({ correct: 0, total: 0 }); setFinished(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (questions.length === 0) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">📭</div>
        <h2 className="text-xl font-semibold text-white mb-2">Nenhuma questão</h2>
        <p className="text-slate-400 mb-6">Importe questões para este subtópico primeiro.</p>
        <Link href={backHref} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
          Voltar
        </Link>
      </div>
    </div>
  )

  if (finished) {
    const pct = Math.round((score.correct / score.total) * 100)
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <Trophy size={32} className="text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Finalizado!</h2>
          <p className="text-slate-400 mb-6">{scopeLabel}</p>
          <div className="text-5xl font-bold text-white mb-1">{pct}%</div>
          <p className="text-slate-400 mb-6">{score.correct} de {score.total} acertos</p>
          <div className="w-full bg-slate-800 rounded-full h-2 mb-6">
            <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex gap-3">
            <Link href={backHref} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-xl text-sm font-medium transition-colors text-center">
              Voltar
            </Link>
            <button onClick={restart} className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
              <RotateCcw size={15} /> Refazer
            </button>
          </div>
        </div>
      </div>
    )
  }

  const q = questions[current]
  const options = getOptions(q)
  const progress = (current / questions.length) * 100

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={backHref} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span className="truncate max-w-[180px]">{scopeLabel}</span>
              <span>{current + 1} / {questions.length}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5">
              <div className="h-1.5 rounded-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-xs bg-emerald-500/15 text-emerald-400 px-3 py-1 rounded-full font-medium">✓ {score.correct} corretas</span>
          {score.total > score.correct && (
            <span className="text-xs bg-red-500/15 text-red-400 px-3 py-1 rounded-full font-medium">✗ {score.total - score.correct} erradas</span>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-4">
          <p className="text-white text-base leading-relaxed font-medium">{q.question}</p>
        </div>

        <div className="space-y-2.5 mb-6">
          {options.map((opt) => {
            const isCorrect = opt.label.toUpperCase() === q.correct_answer.toUpperCase()
            const isSelected = selected === opt.label
            let style = 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-600 hover:bg-slate-800'
            if (answered) {
              if (isCorrect) style = 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
              else if (isSelected && !isCorrect) style = 'bg-red-500/10 border-red-500 text-red-300'
              else style = 'bg-slate-900 border-slate-800 text-slate-500'
            }
            return (
              <button key={opt.label} onClick={() => handleSelect(opt.label)} disabled={answered}
                className={`w-full text-left border rounded-xl px-4 py-3.5 transition-all ${style}`}>
                <div className="flex items-start gap-3">
                  <span className={`flex-shrink-0 w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center mt-0.5 ${answered && isCorrect ? 'bg-emerald-500 text-white' : answered && isSelected && !isCorrect ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    {opt.label}
                  </span>
                  <div>
                    <p className="text-sm leading-relaxed">{opt.text}</p>
                    {answered && opt.explanation && (isCorrect || isSelected) && (
                      <div className={`mt-2 text-xs leading-relaxed ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>{opt.explanation}</div>
                    )}
                  </div>
                  {answered && (
                    <div className="ml-auto flex-shrink-0">
                      {isCorrect ? <CheckCircle2 size={18} className="text-emerald-400" /> : isSelected ? <XCircle size={18} className="text-red-400" /> : null}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {answered && (
          <button onClick={next} className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3.5 rounded-xl transition-colors">
            {current + 1 >= questions.length ? 'Ver Resultado' : 'Próxima'}
            <ChevronRight size={18} />
          </button>
        )}
      </main>
    </div>
  )
}

export default function QuestionsPage() {
  return <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}><QuestionsContent /></Suspense>
}
