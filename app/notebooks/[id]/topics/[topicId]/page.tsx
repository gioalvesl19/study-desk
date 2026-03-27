'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Notebook, Topic, Subtopic } from '@/lib/types'
import { ArrowLeft, Plus, ChevronRight, HelpCircle, CreditCard, Trash2 } from 'lucide-react'
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
    setNewName(''); setShowNew(false); setCreating(false); fetchData()
  }

  async function deleteSubtopic(subId: string, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    if (!confirm('Excluir este subtópico e todo seu conteúdo?')) return
    await supabase.from('subtopics').delete().eq('id', subId)
    fetchData()
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-white/8 bg-black/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs text-white/25 mb-2 flex-wrap">
            <Link href="/" className="hover:text-white/50 transition-colors">Cadernos</Link>
            <ChevronRight size={11} />
            <Link href={`/notebooks/${id}`} className="hover:text-white/50 transition-colors truncate max-w-[100px]">{notebook?.name}</Link>
            <ChevronRight size={11} />
            <span className="text-white/50 truncate max-w-[100px]">{topic?.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/notebooks/${id}`} className="p-1.5 text-white/30 hover:text-white hover:bg-white/8 rounded-lg transition-all">
              <ArrowLeft size={17} />
            </Link>
            <h1 className="text-base font-bold text-white truncate">{topic?.name}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Subtópicos', value: subtopics.length },
            { label: 'Questões', value: topicStats.questions },
            { label: 'Flashcards', value: topicStats.flashcards },
          ].map((s) => (
            <div key={s.label} className="bg-white/[0.04] border border-white/8 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-xs text-white/30 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Study topic */}
        {(topicStats.questions > 0 || topicStats.flashcards > 0) && (
          <div className="mb-6 p-4 bg-white/[0.03] border border-white/8 rounded-2xl">
            <p className="text-xs font-medium text-white/30 uppercase tracking-widest mb-3">Estudar Tópico</p>
            <div className="flex gap-2 flex-wrap">
              {topicStats.questions > 0 && (
                <Link href={`/notebooks/${id}/questions?topicId=${topicId}`} className="flex items-center gap-2 bg-white hover:bg-white/90 text-black px-4 py-2 rounded-xl text-sm font-bold transition-all glow-white-sm">
                  <HelpCircle size={14} /> {topicStats.questions} Questões
                </Link>
              )}
              {topicStats.flashcards > 0 && (
                <Link href={`/notebooks/${id}/flashcards?topicId=${topicId}`} className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/15 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all">
                  <CreditCard size={14} /> {topicStats.flashcards} Flashcards
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Subtopics */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-medium text-white/30 uppercase tracking-widest">Subtópicos</h2>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors">
            <Plus size={14} /> Novo
          </button>
        </div>

        {showNew && (
          <div className="mb-3 flex gap-2">
            <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') createSubtopic(); if (e.key === 'Escape') setShowNew(false) }}
              placeholder="Nome do subtópico..."
              className="flex-1 bg-white/5 border border-white/20 text-white placeholder-white/20 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/40" />
            <button onClick={createSubtopic} disabled={creating || !newName.trim()} className="bg-white hover:bg-white/90 disabled:opacity-40 text-black px-4 py-2.5 rounded-xl text-sm font-bold transition-all">
              {creating ? '...' : 'Criar'}
            </button>
            <button onClick={() => { setShowNew(false); setNewName('') }} className="bg-white/5 hover:bg-white/8 text-white/40 px-4 py-2.5 rounded-xl text-sm transition-all">✕</button>
          </div>
        )}

        {subtopics.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-white/8 rounded-2xl">
            <p className="text-white/20 text-3xl mb-3">○</p>
            <p className="text-white/40 font-medium mb-1">Nenhum subtópico</p>
            <p className="text-white/20 text-sm mb-4">Crie subtópicos para organizar o conteúdo</p>
            <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 bg-white hover:bg-white/90 text-black px-5 py-2.5 rounded-xl text-sm font-bold transition-all">
              <Plus size={14} /> Criar subtópico
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {subtopics.map((sub, i) => (
              <Link key={sub.id} href={`/notebooks/${id}/topics/${topicId}/subtopics/${sub.id}`}
                className="flex items-center gap-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/8 hover:border-white/15 rounded-2xl p-4 transition-all group">
                <div className="w-9 h-9 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-white/30">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-sm truncate">{sub.name}</h3>
                  <p className="text-xs text-white/30 mt-0.5">
                    {(sub.question_count ?? 0) > 0 ? `${sub.question_count} questões` : 'Sem questões'}
                    {(sub.flashcard_count ?? 0) > 0 && ` · ${sub.flashcard_count} flashcards`}
                  </p>
                </div>
                <button onClick={(e) => deleteSubtopic(sub.id, e)} className="p-1.5 text-white/15 hover:text-white/50 hover:bg-white/8 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 size={13} />
                </button>
                <ChevronRight size={15} className="text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
