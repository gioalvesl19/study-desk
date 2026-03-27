'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Notebook, Topic } from '@/lib/types'
import { ArrowLeft, Plus, ChevronRight, HelpCircle, CreditCard, FolderOpen, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

export default function NotebookPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
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

    // Count subtopics, questions and flashcards per topic
    const topicList = (topicsRes.data ?? []) as Pick<Topic, 'id' | 'name' | 'created_at'>[]
    if (topicList.length > 0) {
      const enriched = await Promise.all(topicList.map(async (t) => {
        const [subRes] = await Promise.all([
          supabase.from('subtopics').select('id', { count: 'exact', head: true }).eq('topic_id', t.id),
        ])
        const subtopicIds = subRes.count ?? 0
        let qCount = 0
        let fcCount = 0
        const { data: subs } = await supabase.from('subtopics').select('id').eq('topic_id', t.id)
        if (subs && subs.length > 0) {
          const ids = subs.map((s: { id: string }) => s.id)
          const [qqRes, ffRes] = await Promise.all([
            supabase.from('questions').select('id', { count: 'exact', head: true }).in('subtopic_id', ids),
            supabase.from('flashcards').select('id', { count: 'exact', head: true }).in('subtopic_id', ids),
          ])
          qCount = qqRes.count ?? 0
          fcCount = ffRes.count ?? 0
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
    const { error } = await supabase.from('topics').insert({ notebook_id: id, name: newTopicName.trim() })
    if (!error) {
      setNewTopicName('')
      setShowNewTopic(false)
      fetchData()
    }
    setCreating(false)
  }

  async function deleteTopic(topicId: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Excluir este tópico e todo seu conteúdo?')) return
    await supabase.from('topics').delete().eq('id', topicId)
    fetchData()
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!notebook) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-400 mb-4">Caderno não encontrado</p>
        <Link href="/" className="text-indigo-400 hover:text-indigo-300">Voltar</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: notebook.color + '25' }}>
            {notebook.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-white leading-tight truncate">{notebook.name}</h1>
            {notebook.description && <p className="text-xs text-slate-400 truncate">{notebook.description}</p>}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Tópicos', value: topics.length, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
            { label: 'Questões', value: stats.questions, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Flashcards', value: stats.flashcards, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border border-slate-800 rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Study all */}
        {(stats.questions > 0 || stats.flashcards > 0) && (
          <div className="mb-6 p-4 bg-slate-900 border border-slate-800 rounded-2xl">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Estudar Caderno Completo</p>
            <div className="flex gap-2">
              {stats.questions > 0 && (
                <Link href={`/notebooks/${id}/questions`} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                  <HelpCircle size={15} /> {stats.questions} Questões
                </Link>
              )}
              {stats.flashcards > 0 && (
                <Link href={`/notebooks/${id}/flashcards`} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                  <CreditCard size={15} /> {stats.flashcards} Flashcards
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Topics */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Tópicos</h2>
          <button
            onClick={() => setShowNewTopic(true)}
            className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <Plus size={15} /> Novo Tópico
          </button>
        </div>

        {/* New topic input */}
        {showNewTopic && (
          <div className="mb-3 flex gap-2">
            <input
              autoFocus
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') createTopic(); if (e.key === 'Escape') setShowNewTopic(false) }}
              placeholder="Nome do tópico..."
              className="flex-1 bg-slate-900 border border-indigo-500 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
            />
            <button
              onClick={createTopic}
              disabled={creating || !newTopicName.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {creating ? '...' : 'Criar'}
            </button>
            <button
              onClick={() => { setShowNewTopic(false); setNewTopicName('') }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl text-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}

        {topics.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl">
            <FolderOpen size={36} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium mb-1">Nenhum tópico criado</p>
            <p className="text-slate-500 text-sm mb-4">Crie um tópico para organizar seu conteúdo</p>
            <button
              onClick={() => setShowNewTopic(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              <Plus size={15} /> Criar primeiro tópico
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {topics.map((topic) => (
              <Link
                key={topic.id}
                href={`/notebooks/${id}/topics/${topic.id}`}
                className="flex items-center gap-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: notebook.color + '20' }}>
                  <FolderOpen size={18} style={{ color: notebook.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-sm truncate">{topic.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {topic.subtopic_count ?? 0} subtópico{(topic.subtopic_count ?? 0) !== 1 ? 's' : ''}
                    {(topic.question_count ?? 0) > 0 && ` · ${topic.question_count} questões`}
                    {(topic.flashcard_count ?? 0) > 0 && ` · ${topic.flashcard_count} flashcards`}
                  </p>
                </div>
                <button
                  onClick={(e) => deleteTopic(topic.id, e)}
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
