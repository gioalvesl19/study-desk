'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Notebook, NOTEBOOK_COLORS, NOTEBOOK_ICONS } from '@/lib/types'
import { Plus, BookOpen, Trash2, X, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', color: NOTEBOOK_COLORS[0], icon: NOTEBOOK_ICONS[0] })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchNotebooks()
  }, [])

  async function fetchNotebooks() {
    setLoading(true)
    const { data } = await supabase
      .from('notebooks')
      .select('*, questions(count), flashcards(count)')
      .order('created_at', { ascending: false })

    if (data) {
      const mapped = data.map((nb: any) => ({
        ...nb,
        question_count: nb.questions?.[0]?.count ?? 0,
        flashcard_count: nb.flashcards?.[0]?.count ?? 0,
      }))
      setNotebooks(mapped)
    }
    setLoading(false)
  }

  async function createNotebook() {
    if (!form.name.trim()) return
    setSaving(true)
    await supabase.from('notebooks').insert({
      name: form.name.trim(),
      description: form.description.trim() || null,
      color: form.color,
      icon: form.icon,
    })
    setForm({ name: '', description: '', color: NOTEBOOK_COLORS[0], icon: NOTEBOOK_ICONS[0] })
    setShowModal(false)
    setSaving(false)
    fetchNotebooks()
  }

  async function deleteNotebook(id: string) {
    if (!confirm('Excluir este caderno e todo seu conteúdo?')) return
    setDeletingId(id)
    await supabase.from('notebooks').delete().eq('id', id)
    setDeletingId(null)
    fetchNotebooks()
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center">
              <BookOpen size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">StudyDesk</h1>
              <p className="text-xs text-slate-400">Sistema de Estudos</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            Novo Caderno
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notebooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
              <BookOpen size={28} className="text-slate-500" />
            </div>
            <h2 className="text-xl font-semibold text-slate-300 mb-2">Nenhum caderno ainda</h2>
            <p className="text-slate-500 mb-6">Crie seu primeiro caderno para começar a estudar</p>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              <Plus size={16} />
              Criar Caderno
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white">Meus Cadernos</h2>
              <p className="text-slate-400 text-sm mt-1">{notebooks.length} caderno{notebooks.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {notebooks.map((nb) => (
                <div key={nb.id} className="group relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all hover:shadow-xl hover:shadow-slate-900/50">
                  {/* Color bar */}
                  <div className="h-1.5 w-full" style={{ backgroundColor: nb.color }} />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                        style={{ backgroundColor: nb.color + '20' }}
                      >
                        {nb.icon}
                      </div>
                      <button
                        onClick={() => deleteNotebook(nb.id)}
                        disabled={deletingId === nb.id}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <h3 className="font-semibold text-white text-base mb-1 leading-tight">{nb.name}</h3>
                    {nb.description && (
                      <p className="text-slate-400 text-sm mb-3 line-clamp-2">{nb.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        {nb.question_count} questões
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                        {nb.flashcard_count} flashcards
                      </span>
                    </div>
                    <Link
                      href={`/notebooks/${nb.id}`}
                      className="flex items-center justify-between w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors group/btn"
                    >
                      Abrir caderno
                      <ChevronRight size={15} className="text-slate-400 group-hover/btn:text-white transition-colors" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Create Notebook Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">Novo Caderno</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Nome *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Fisiologia, Anatomia..."
                  className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  onKeyDown={(e) => e.key === 'Enter' && createNotebook()}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Descrição</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Opcional"
                  className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Ícone</label>
                <div className="flex flex-wrap gap-2">
                  {NOTEBOOK_ICONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setForm({ ...form, icon })}
                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${form.icon === icon ? 'bg-indigo-500 ring-2 ring-indigo-400' : 'bg-slate-800 hover:bg-slate-700'}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Cor</label>
                <div className="flex flex-wrap gap-2">
                  {NOTEBOOK_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setForm({ ...form, color })}
                      className={`w-8 h-8 rounded-lg transition-all ${form.color === color ? 'ring-2 ring-white scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-6 pb-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium py-2.5 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={createNotebook}
                disabled={!form.name.trim() || saving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
              >
                {saving ? 'Criando...' : 'Criar Caderno'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
