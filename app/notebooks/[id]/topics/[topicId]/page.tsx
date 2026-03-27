'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Notebook, Topic, Subtopic } from '@/lib/types'
import { ArrowLeft, Plus, ChevronRight, HelpCircle, CreditCard, BookOpen, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function TopicPage() {
  const { id, topicId } = useParams<{ id: string; topicId: string }>()
  const [notebook, setNotebook] = useState<Notebook | null>(null)
  const [topic, setTopic] = useState<Topic | null>(null)
  const [subtopics, setSubtopics] = useState<Subtopic[]>([])
  const [topicStats, setTopicStats] = useState({ questions: 0, flashcards: 0 })
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [showNew, setShowNew] = useState(false)

  useEffect(() => { fetchData() }, [id, topicId])

  async function fetchData() {
    const [nbRes, topicRes, subsRes] = await Promise.all([
      supabase.from('notebooks').select('id, name, color, icon, description').eq('id', id).single(),
      supabase.from('topics').select('*').eq('id', topicId).single(),
      supabase.from('subtopics').select('id, name, created_at').eq('topic_id', topicId).order('created_at'),
    ])
    setNotebook(nbRes.data as Notebook | null)
    setTopic(topicRes.data as Topic | null)

    const subList = (subsRes.data ?? []) as Subtopic[]
    if (subList.length > 0) {
      const ids = subList.map((s) => s.id)
      const [qRes, fcRes] = await Promise.all([
        supabase.from('questions').select('id', { count: 'exact', head: true }).in('subtopic_id', ids),
        supabase.from('flashcards').select('id', { count: 'exact', head: true }).in('subtopic_id', ids),
      ])
      setTopicStats({ questions: qRes.count ?? 0, flashcards: fcRes.count ?? 0 })

      const enriched = await Promise.all(subList.map(async (s) => {
        const [sqRes, sfRes] = await Promise.all([
          supabase.from('questions').select('id', { count: 'exact', head: true }).eq('subtopic_id', s.id),
          supabase.from('flashcards').select('id', { count: 'exact', head: true }).eq('subtopic_id', s.id),
        ])
        return { ...s, question_count: sqRes.count ?? 0, flashcard_count: sfRes.count ?? 0 }
      }))
      setSubtopics(enriched)
    } else {
      setSubtopics([])
      setTopicStats({ questions: 0, flashcards: 0 })
    }
    setLoading(false)
  }

  async function createSubtopic() {
    if (!newName.trim()) return
    setCreating(true)
    await supabase.from('subtopics').insert({ topic_id: topicId, name: newName.trim() })
    setNewName('')
    setShowNew(false)
    setCreating(false)
    fetchData()
  }

  async function deleteSubtopic(subId: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Excluir este subtópico e todo seu conteúdo?')) return
    await supabase.from('subtopics').delete().eq('id', subId)
    fetchData()
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
            <Link href="/" className="hover:text-slate-300 transition-colors">Cadernos</Link>
            <ChevronRight size={12} />
            <Link href={`/notebooks/${id}`} className="hover:text-slate-300 transition-colors truncate max-w-[120px]">{notebook?.name}</Link>
            <ChevronRight size={12} />
            <span className="text-slate-300 truncate max-w-[120px]">{topic?.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/notebooks/${id}`} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: (notebook?.color ?? '#6366f1') + '25' }}>
              <BookOpen size={16} style={{ color: notebook?.color ?? '#6366f1' }} />
            </div>
            <h1 className="text-base font-semibold text-white truncate">{topic?.name}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Subtópicos', value: subtopics.length, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
            { label: 'Questões', value: topicStats.questions, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Flashcards', value: topicStats.flashcards, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border border-slate-800 rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Study topic */}
        {(topicStats.questions > 0 || topicStats.flashcards > 0) && (
          <div className="mb-6 p-4 bg-slate-900 border border-slate-800 rounded-2xl">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Estudar Tópico Completo</p>
            <div className="flex gap-2">
              {topicStats.questions > 0 && (
                <Link href={`/notebooks/${id}/questions?topicId=${topicId}`} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                  <HelpCircle size={15} /> {topicStats.questions} Questões
                </Link>
              )}
              {topicStats.flashcards > 0 && (
                <Link href={`/notebooks/${id}/flashcards?topicId=${topicId}`} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                  <CreditCard size={15} /> {topicStats.flashcards} Flashcards
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Subtopics */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Subtópicos</h2>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
            <Plus size={15} /> Novo Subtópico
          </button>
        </div>

        {showNew && (
          <div className="mb-3 flex gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') createSubtopic(); if (e.key === 'Escape') setShowNew(false) }}
              placeholder="Nome do subtópico..."
              className="flex-1 bg-slate-900 border border-indigo-500 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
            />
            <button onClick={createSubtopic} disabled={creating || !newName.trim()} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
              {creating ? '...' : 'Criar'}
            </button>
            <button onClick={() => { setShowNew(false); setNewName('') }} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl text-sm transition-colors">
              Cancelar
            </button>
          </div>
        )}

        {subtopics.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl">
            <BookOpen size={36} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium mb-1">Nenhum subtópico criado</p>
            <p className="text-slate-500 text-sm mb-4">Crie subtópicos para organizar seu conteúdo</p>
            <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
              <Plus size={15} /> Criar primeiro subtópico
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {subtopics.map((sub) => (
              <Link
                key={sub.id}
                href={`/notebooks/${id}/topics/${topicId}/subtopics/${sub.id}`}
                className="flex items-center gap-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: (notebook?.color ?? '#6366f1') + '18' }}>
                  <BookOpen size={16} style={{ color: notebook?.color ?? '#6366f1' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-sm truncate">{sub.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {(sub.question_count ?? 0) > 0 ? `${sub.question_count} questões` : 'Sem questões'}
                    {(sub.flashcard_count ?? 0) > 0 && ` · ${sub.flashcard_count} flashcards`}
                  </p>
                </div>
                <button
                  onClick={(e) => deleteSubtopic(sub.id, e)}
                  className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={14} />
                </button>
                <ChevronRight size={16} className="text-slate-500 group-hover:text-slate-300 transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
