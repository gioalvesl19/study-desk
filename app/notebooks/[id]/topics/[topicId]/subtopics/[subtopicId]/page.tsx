'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Notebook, Topic, Subtopic } from '@/lib/types'
import { ArrowLeft, ChevronRight, HelpCircle, CreditCard, Upload, Zap, Target } from 'lucide-react'
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
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  )

  const accuracy = stats.attempts > 0 ? Math.round((stats.correct / stats.attempts) * 100) : null

  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-white/8 bg-black/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs text-white/25 mb-2 flex-wrap">
            <Link href="/" className="hover:text-white/50 transition-colors">Cadernos</Link>
            <ChevronRight size={11} />
            <Link href={`/notebooks/${id}`} className="hover:text-white/50 transition-colors truncate max-w-[80px]">{notebook?.name}</Link>
            <ChevronRight size={11} />
            <Link href={`/notebooks/${id}/topics/${topicId}`} className="hover:text-white/50 transition-colors truncate max-w-[80px]">{topic?.name}</Link>
            <ChevronRight size={11} />
            <span className="text-white/50 truncate max-w-[80px]">{subtopic?.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/notebooks/${id}/topics/${topicId}`} className="p-1.5 text-white/30 hover:text-white hover:bg-white/8 rounded-lg transition-all">
              <ArrowLeft size={17} />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center text-lg flex-shrink-0">
              {notebook?.icon}
            </div>
            <h1 className="text-base font-bold text-white truncate">{subtopic?.name}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Questões', value: stats.questions, icon: '❓' },
            { label: 'Flashcards', value: stats.flashcards, icon: '🃏' },
            { label: 'Respostas', value: stats.attempts, icon: '📝' },
            { label: 'Acertos', value: accuracy !== null ? `${accuracy}%` : '—', icon: '🎯' },
          ].map((s) => (
            <div key={s.label} className="bg-white/[0.04] border border-white/8 rounded-2xl p-4 text-center">
              <p className="text-lg mb-1">{s.icon}</p>
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-xs text-white/30 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Study */}
        <div className="space-y-2.5 mb-8">
          <h2 className="text-xs font-medium text-white/30 uppercase tracking-widest mb-3">Estudar</h2>
          <Link href={`/notebooks/${id}/questions?subtopicId=${subtopicId}`}
            className="flex items-center gap-4 bg-white hover:bg-white/90 rounded-2xl p-5 transition-all group glow-white-sm">
            <div className="w-11 h-11 rounded-xl bg-black/10 flex items-center justify-center">
              <HelpCircle size={20} className="text-black" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-black">Responder Questões</h3>
              <p className="text-sm text-black/50">{stats.questions} questões · ganhe XP</p>
            </div>
            <ChevronRight size={16} className="text-black/40" />
          </Link>

          <Link href={`/notebooks/${id}/flashcards?subtopicId=${subtopicId}`}
            className="flex items-center gap-4 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 rounded-2xl p-5 transition-all group">
            <div className="w-11 h-11 rounded-xl bg-white/8 flex items-center justify-center">
              <CreditCard size={20} className="text-white/70" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">Revisar Flashcards</h3>
              <p className="text-sm text-white/40">{stats.flashcards} cards · +5 XP cada</p>
            </div>
            <ChevronRight size={16} className="text-white/20 group-hover:text-white/50 transition-colors" />
          </Link>
        </div>

        {/* Import */}
        <div className="space-y-2.5">
          <h2 className="text-xs font-medium text-white/30 uppercase tracking-widest mb-3">Importar Conteúdo</h2>
          <Link href={`/notebooks/${id}/questions/import?subtopicId=${subtopicId}`}
            className="flex items-center gap-4 bg-white/[0.03] hover:bg-white/[0.06] border border-dashed border-white/10 hover:border-white/20 rounded-2xl p-4 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <Upload size={17} className="text-white/40 group-hover:text-white/60 transition-colors" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white/60 group-hover:text-white/80 transition-colors">Importar Questões</p>
              <p className="text-xs text-white/25">Excel, CSV ou tabela</p>
            </div>
          </Link>
          <Link href={`/notebooks/${id}/flashcards/import?subtopicId=${subtopicId}`}
            className="flex items-center gap-4 bg-white/[0.03] hover:bg-white/[0.06] border border-dashed border-white/10 hover:border-white/20 rounded-2xl p-4 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <Upload size={17} className="text-white/40 group-hover:text-white/60 transition-colors" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white/60 group-hover:text-white/80 transition-colors">Importar Flashcards</p>
              <p className="text-xs text-white/25">Excel, CSV ou tabela</p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  )
}
