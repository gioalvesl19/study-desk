'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Notebook, Topic, Subtopic } from '@/lib/types'
import { ArrowLeft, ChevronRight, HelpCircle, CreditCard, Upload } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function SubtopicPage() {
  const { id, topicId, subtopicId } = useParams<{ id: string; topicId: string; subtopicId: string }>()
  const [notebook, setNotebook] = useState<Notebook | null>(null)
  const [topic, setTopic] = useState<Topic | null>(null)
  const [subtopic, setSubtopic] = useState<Subtopic | null>(null)
  const [stats, setStats] = useState({ questions: 0, flashcards: 0, attempts: 0, correct: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [id, topicId, subtopicId])

  async function fetchData() {
    const [nbRes, topicRes, subRes, qRes, fcRes] = await Promise.all([
      supabase.from('notebooks').select('id, name, color, icon, description').eq('id', id).single(),
      supabase.from('topics').select('id, name').eq('id', topicId).single(),
      supabase.from('subtopics').select('*').eq('id', subtopicId).single(),
      supabase.from('questions').select('id', { count: 'exact', head: true }).eq('subtopic_id', subtopicId),
      supabase.from('flashcards').select('id', { count: 'exact', head: true }).eq('subtopic_id', subtopicId),
    ])
    setNotebook(nbRes.data as Notebook | null)
    setTopic(topicRes.data as Topic | null)
    setSubtopic(subRes.data as Subtopic | null)

    // Get accuracy
    const { data: qIds } = await supabase.from('questions').select('id').eq('subtopic_id', subtopicId)
    let attempts = 0, correct = 0
    if (qIds && qIds.length > 0) {
      const ids = qIds.map((q: { id: string }) => q.id)
      const { data: atts } = await supabase.from('question_attempts').select('is_correct').in('question_id', ids)
      if (atts) { attempts = atts.length; correct = atts.filter((a: { is_correct: boolean }) => a.is_correct).length }
    }
    setStats({ questions: qRes.count ?? 0, flashcards: fcRes.count ?? 0, attempts, correct })
    setLoading(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const accuracy = stats.attempts > 0 ? Math.round((stats.correct / stats.attempts) * 100) : null
  const color = notebook?.color ?? '#6366f1'

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2 flex-wrap">
            <Link href="/" className="hover:text-slate-300 transition-colors">Cadernos</Link>
            <ChevronRight size={12} />
            <Link href={`/notebooks/${id}`} className="hover:text-slate-300 transition-colors truncate max-w-[100px]">{notebook?.name}</Link>
            <ChevronRight size={12} />
            <Link href={`/notebooks/${id}/topics/${topicId}`} className="hover:text-slate-300 transition-colors truncate max-w-[100px]">{topic?.name}</Link>
            <ChevronRight size={12} />
            <span className="text-slate-300 truncate max-w-[100px]">{subtopic?.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/notebooks/${id}/topics/${topicId}`} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: color + '25' }}>
              {notebook?.icon}
            </div>
            <h1 className="text-base font-semibold text-white truncate">{subtopic?.name}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Questões', value: stats.questions, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
            { label: 'Flashcards', value: stats.flashcards, color: 'text-purple-400', bg: 'bg-purple-500/10' },
            { label: 'Respostas', value: stats.attempts, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Acertos', value: accuracy !== null ? `${accuracy}%` : '—', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border border-slate-800 rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Study */}
        <div className="space-y-3 mb-8">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">Estudar</h2>

          <Link
            href={`/notebooks/${id}/questions?subtopicId=${subtopicId}`}
            className="flex items-center gap-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-500/15 flex items-center justify-center">
              <HelpCircle size={22} className="text-indigo-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">Responder Questões</h3>
              <p className="text-sm text-slate-400">{stats.questions} questões disponíveis</p>
            </div>
            <ArrowLeft size={16} className="text-slate-500 rotate-180 group-hover:text-indigo-400 transition-colors" />
          </Link>

          <Link
            href={`/notebooks/${id}/flashcards?subtopicId=${subtopicId}`}
            className="flex items-center gap-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-500/15 flex items-center justify-center">
              <CreditCard size={22} className="text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">Revisar Flashcards</h3>
              <p className="text-sm text-slate-400">{stats.flashcards} flashcards disponíveis</p>
            </div>
            <ArrowLeft size={16} className="text-slate-500 rotate-180 group-hover:text-purple-400 transition-colors" />
          </Link>
        </div>

        {/* Import */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">Importar Conteúdo</h2>

          <Link
            href={`/notebooks/${id}/questions/import?subtopicId=${subtopicId}`}
            className="flex items-center gap-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <Upload size={22} className="text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">Importar Questões</h3>
              <p className="text-sm text-slate-400">Excel, CSV ou tabela</p>
            </div>
            <ArrowLeft size={16} className="text-slate-500 rotate-180 group-hover:text-blue-400 transition-colors" />
          </Link>

          <Link
            href={`/notebooks/${id}/flashcards/import?subtopicId=${subtopicId}`}
            className="flex items-center gap-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-pink-500/15 flex items-center justify-center">
              <Upload size={22} className="text-pink-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">Importar Flashcards</h3>
              <p className="text-sm text-slate-400">Excel, CSV ou tabela</p>
            </div>
            <ArrowLeft size={16} className="text-slate-500 rotate-180 group-hover:text-pink-400 transition-colors" />
          </Link>
        </div>
      </main>
    </div>
  )
}
