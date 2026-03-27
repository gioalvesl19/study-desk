'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Notebook, Topic } from '@/lib/types'
import { ArrowLeft, Plus, ChevronRight, HelpCircle, CreditCard, FolderOpen, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function NotebookPage() {
  const { id } = useParams<{ id: string }>()
  const [notebook, setNotebook] = useState<Notebook | null>(null)
  const [topics, setTopics] = useState<Topic[]>([])
  const [stats, setStats] = useState({ questions: 0, flashcards: 0 })
  const [loading, setLoading] = useState(true)
  const [newTopicName, setNewTopicName] = useState('')
  const [creating, setCreating] = useState(false)
  const [showNewTopic, setShowNewTopic] = useState(false)

  useEffect(() => { fetchData() }, [id])

  async function fetchData() {
    const [nbRes, topicsRes, qRes, fcRes] = await Promise.all([
      supabase.from('notebooks').select('*').eq('id', id).single(),
      supabase.from('topics').select('id, name, created_at').eq('notebook_id', id).order('created_at'),
      supabase.from('questions').select('id', { count: 'exact', head: true }).eq('notebook_id', id),
      supabase.from('flashcards').select('id', { count: 'exact', head: true }).eq('notebook_id', id),
    ])
    setNotebook(nbRes.data)
    setStats({ questions: qRes.count ?? 0, flashcards: fcRes.count ?? 0 })

    const topicList = (topicsRes.data ?? []) as Pick<Topic, 'id' | 'name' | 'created_at'>[]
    if (topicList.length > 0) {
      const enriched = await Promise.all(topicList.map(async (t) => {
        const [subRes] = await Promise.all([
          supabase.from('subtopics').select('id', { count: 'exact', head: true }).eq('topic_id', t.id),
        ])
        const subtopicIds = subRes.count ?? 0
        let qCount = 0, fcCount = 0
        const { data: subs } = await supabase.from('subtopics').select('id').eq('topic_id', t.id)
        if (subs && subs.length > 0) {
          const ids = subs.map((s: { id: string }) => s.id)
          const [qqRes, ffRes] = await Promise.all([
            supabase.from('questions').select('id', { count: 'exact', head: true }).in('subtopic_id', ids),
            supabase.from('flashcards').select('id', { count: 'exact', head: true }).in('subtopic_id', ids),
          ])
          qCount = qqRes.count ?? 0; fcCount = ffRes.count ?? 0
        }
        return { ...t, notebook_id: id, subtopic_count: subtopicIds, question_count: qCount, flashcard_count: fcCount } as Topic
      }))
      setTopics(enriched)
    } else {
      setTopics([])
    }
    setLoading(false)
  }

  async function createTopic() {
    if (!newTopicName.trim()) return
    setCreating(true)
    await supabase.from('topics').insert({ notebook_id: id, name: newTopicName.trim() })
    setNewTopicName(''); setShowNewTopic(false); setCreating(false); fetchData()
  }

  async function deleteTopic(topicId: string, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    if (!confirm('Excluir este tópico e todo seu conteúdo?')) return
    await supabase.from('topics').delete().eq('id', topicId)
    fetchData()
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  )

  if (!notebook) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center"><p className="text-white/40 mb-4">Caderno não encontrado</p>
        <Link href="/" className="text-white hover:text-white/70">Voltar</Link></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-white/8 bg-black/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="p-1.5 text-white/30 hover:text-white hover:bg-white/8 rounded-lg transition-all">
            <ArrowLeft size={17} />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center text-xl">
            {notebook.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white leading-tight truncate">{notebook.name}</h1>
            {notebook.description && <p className="text-xs text-white/30 truncate">{notebook.description}</p>}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Tópicos', value: topics.length },
            { label: 'Questões', value: stats.questions },
            { label: 'Flashcards', value: stats.flashcards },
          ].map((s) => (
            <div key={s.label} className="bg-white/[0.04] border border-white/8 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-xs text-white/30 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Study all */}
        {(stats.questions > 0 || stats.flashcards > 0) && (
          <div className="mb-6 p-4 bg-white/[0.03] border border-white/8 rounded-2xl">
            <p className="text-xs font-medium text-white/30 uppercase tracking-widest mb-3">Estudar Tudo</p>
            <div className="flex gap-2 flex-wrap">
              {stats.questions > 0 && (
                <Link href={`/notebooks/${id}/questions`} className="flex items-center gap-2 bg-white hover:bg-white/90 text-black px-4 py-2 rounded-xl text-sm font-bold transition-all glow-white-sm">
                  <HelpCircle size={14} /> {stats.questions} Questões
                </Link>
              )}
              {stats.flashcards > 0 && (
                <Link href={`/notebooks/${id}/flashcards`} className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/15 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all">
                  <CreditCard size={14} /> {stats.flashcards} Flashcards
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Topics */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-medium text-white/30 uppercase tracking-widest">Tópicos</h2>
          <button onClick={() => setShowNewTopic(true)} className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors">
            <Plus size={14} /> Novo
          </button>
        </div>

        {showNewTopic && (
          <div className="mb-3 flex gap-2">
            <input autoFocus value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') createTopic(); if (e.key === 'Escape') setShowNewTopic(false) }}
              placeholder="Nome do tópico..."
              className="flex-1 bg-white/5 border border-white/20 text-white placeholder-white/20 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/40" />
            <button onClick={createTopic} disabled={creating || !newTopicName.trim()} className="bg-white hover:bg-white/90 disabled:opacity-40 text-black px-4 py-2.5 rounded-xl text-sm font-bold transition-all">
              {creating ? '...' : 'Criar'}
            </button>
            <button onClick={() => { setShowNewTopic(false); setNewTopicName('') }} className="bg-white/5 hover:bg-white/8 text-white/40 px-4 py-2.5 rounded-xl text-sm transition-all">
              ✕
            </button>
          </div>
        )}

        {topics.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-white/8 rounded-2xl">
            <FolderOpen size={34} className="text-white/15 mx-auto mb-3" />
            <p className="text-white/40 font-medium mb-1">Nenhum tópico criado</p>
            <p className="text-white/20 text-sm mb-4">Crie um tópico para organizar seu conteúdo</p>
            <button onClick={() => setShowNewTopic(true)} className="inline-flex items-center gap-2 bg-white hover:bg-white/90 text-black px-5 py-2.5 rounded-xl text-sm font-bold transition-all">
              <Plus size={14} /> Criar primeiro tópico
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {topics.map((topic, i) => (
              <Link key={topic.id} href={`/notebooks/${id}/topics/${topic.id}`}
                className="flex items-center gap-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/8 hover:border-white/15 rounded-2xl p-4 transition-all group">
                <div className="w-9 h-9 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-white/40">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-sm truncate">{topic.name}</h3>
                  <p className="text-xs text-white/30 mt-0.5">
                    {topic.subtopic_count ?? 0} subtópico{(topic.subtopic_count ?? 0) !== 1 ? 's' : ''}
                    {(topic.question_count ?? 0) > 0 && ` · ${topic.question_count} questões`}
                    {(topic.flashcard_count ?? 0) > 0 && ` · ${topic.flashcard_count} flashcards`}
                  </p>
                </div>
                <button onClick={(e) => deleteTopic(topic.id, e)} className="p-1.5 text-white/15 hover:text-white/50 hover:bg-white/8 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
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
