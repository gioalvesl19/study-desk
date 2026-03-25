'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Notebook } from '@/lib/types'
import { ArrowLeft, HelpCircle, CreditCard, Upload, BarChart2 } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface Stats {
  total_questions: number
  total_flashcards: number
  attempts: number
  correct: number
}

export default function NotebookPage() {
  const { id } = useParams<{ id: string }>()
  const [notebook, setNotebook] = useState<Notebook | null>(null)
  const [stats, setStats] = useState<Stats>({ total_questions: 0, total_flashcards: 0, attempts: 0, correct: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [id])

  async function fetchData() {
    const [nbRes, qRes, fcRes, attRes] = await Promise.all([
      supabase.from('notebooks').select('*').eq('id', id).single(),
      supabase.from('questions').select('id', { count: 'exact', head: true }).eq('notebook_id', id),
      supabase.from('flashcards').select('id', { count: 'exact', head: true }).eq('notebook_id', id),
      supabase.from('question_attempts').select('is_correct').eq('question_id', id),
    ])

    // Get question ids to join attempts
    const { data: qIds } = await supabase.from('questions').select('id').eq('notebook_id', id)
    let attempts = 0
    let correct = 0
    if (qIds && qIds.length > 0) {
      const ids = qIds.map((q: { id: string }) => q.id)
      const { data: atts } = await supabase.from('question_attempts').select('is_correct').in('question_id', ids)
      if (atts) {
        attempts = atts.length
        correct = atts.filter((a: { is_correct: boolean }) => a.is_correct).length
      }
    }

    setNotebook(nbRes.data)
    setStats({
      total_questions: qRes.count ?? 0,
      total_flashcards: fcRes.count ?? 0,
      attempts,
      correct,
    })
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!notebook) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Caderno não encontrado</p>
          <Link href="/" className="text-indigo-400 hover:text-indigo-300">Voltar</Link>
        </div>
      </div>
    )
  }

  const accuracy = stats.attempts > 0 ? Math.round((stats.correct / stats.attempts) * 100) : null

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ backgroundColor: notebook.color + '25' }}
          >
            {notebook.icon}
          </div>
          <div>
            <h1 className="text-base font-semibold text-white leading-tight">{notebook.name}</h1>
            {notebook.description && <p className="text-xs text-slate-400">{notebook.description}</p>}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Questões', value: stats.total_questions, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
            { label: 'Flashcards', value: stats.total_flashcards, color: 'text-purple-400', bg: 'bg-purple-500/10' },
            { label: 'Respostas', value: stats.attempts, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Acertos', value: accuracy !== null ? `${accuracy}%` : '—', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border border-slate-800 rounded-2xl p-4`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">Estudar</h2>

          <Link
            href={`/notebooks/${id}/questions`}
            className="flex items-center gap-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-500/15 flex items-center justify-center">
              <HelpCircle size={22} className="text-indigo-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">Responder Questões</h3>
              <p className="text-sm text-slate-400">{stats.total_questions} questões disponíveis</p>
            </div>
            <ArrowLeft size={16} className="text-slate-500 rotate-180 group-hover:text-indigo-400 transition-colors" />
          </Link>

          <Link
            href={`/notebooks/${id}/flashcards`}
            className="flex items-center gap-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-500/15 flex items-center justify-center">
              <CreditCard size={22} className="text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">Revisar Flashcards</h3>
              <p className="text-sm text-slate-400">{stats.total_flashcards} flashcards disponíveis</p>
            </div>
            <ArrowLeft size={16} className="text-slate-500 rotate-180 group-hover:text-purple-400 transition-colors" />
          </Link>

          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider !mt-8 mb-4">Importar Conteúdo</h2>

          <Link
            href={`/notebooks/${id}/questions/import`}
            className="flex items-center gap-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <Upload size={22} className="text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">Importar Questões</h3>
              <p className="text-sm text-slate-400">Cole questões no formato tabela</p>
            </div>
            <ArrowLeft size={16} className="text-slate-500 rotate-180 group-hover:text-blue-400 transition-colors" />
          </Link>

          <Link
            href={`/notebooks/${id}/flashcards/import`}
            className="flex items-center gap-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-pink-500/15 flex items-center justify-center">
              <Upload size={22} className="text-pink-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">Importar Flashcards</h3>
              <p className="text-sm text-slate-400">Cole flashcards no formato tabela</p>
            </div>
            <ArrowLeft size={16} className="text-slate-500 rotate-180 group-hover:text-pink-400 transition-colors" />
          </Link>
        </div>
      </main>
    </div>
  )
}
