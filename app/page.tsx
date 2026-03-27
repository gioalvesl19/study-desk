'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Notebook, NOTEBOOK_ICONS } from '@/lib/types'
import { loadStats, getLevelInfo, touchStreak, saveStats } from '@/lib/game'
import { Plus, BookOpen, Trash2, X, ChevronRight, Zap, Flame, Trophy } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', icon: NOTEBOOK_ICONS[0] })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [gameStats, setGameStats] = useState({ xp: 0, streak: 0, level: 1, title: 'Iniciante', pct: 0, currentXP: 0, neededXP: 100 })

  useEffect(() => {
    fetchNotebooks()
    const stats = touchStreak(loadStats())
    saveStats(stats)
    const info = getLevelInfo(stats.xp)
    setGameStats({ xp: stats.xp, streak: stats.streak, level: info.level, title: info.title, pct: info.pct, currentXP: info.currentXP, neededXP: info.neededXP })
  }, [])

  async function fetchNotebooks() {
    const { data } = await supabase
      .from('notebooks')
      .select('*, questions(count), flashcards(count)')
      .order('created_at', { ascending: false })
    if (data) {
      setNotebooks(data.map((nb: any) => ({
        ...nb,
        question_count: nb.questions?.[0]?.count ?? 0,
        flashcard_count: nb.flashcards?.[0]?.count ?? 0,
      })))
    }
    setLoading(false)
  }

  async function createNotebook() {
    if (!form.name.trim()) return
    setSaving(true)
    await supabase.from('notebooks').insert({ name: form.name.trim(), description: form.description.trim() || null, color: '#ffffff', icon: form.icon })
    setForm({ name: '', description: '', icon: NOTEBOOK_ICONS[0] })
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
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-white/8 bg-black/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
              <BookOpen size={17} className="text-black" />
            </div>
            <span className="text-base font-bold text-white tracking-tight">StudyDesk</span>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-white hover:bg-white/90 text-black text-sm font-semibold px-4 py-2 rounded-xl transition-all glow-white-sm">
            <Plus size={15} /> Novo Caderno
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Game HUD */}
        <div className="mb-8 bg-white/[0.04] border border-white/8 rounded-2xl p-5 glow-white-sm">
          <div className="flex items-center gap-6 flex-wrap">
            {/* Level */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-black font-black text-lg">
                {gameStats.level}
              </div>
              <div>
                <p className="text-xs text-white/40 uppercase tracking-widest font-medium">Nível</p>
                <p className="text-sm font-bold text-white">{gameStats.title}</p>
              </div>
            </div>

            {/* XP Bar */}
            <div className="flex-1 min-w-[160px]">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Zap size={13} className="text-white/60" />
                  <span className="text-xs text-white/60 font-medium">{gameStats.xp} XP</span>
                </div>
                <span className="text-xs text-white/30">{gameStats.currentXP}/{gameStats.neededXP}</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${gameStats.pct}%` }} />
              </div>
            </div>

            {/* Streak */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
              <span className="text-lg animate-streak-fire">🔥</span>
              <div>
                <p className="text-xs text-white/40 uppercase tracking-widest font-medium leading-none mb-0.5">Sequência</p>
                <p className="text-sm font-bold text-white">{gameStats.streak} {gameStats.streak === 1 ? 'dia' : 'dias'}</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : notebooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <BookOpen size={26} className="text-white/30" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Nenhum caderno</h2>
            <p className="text-white/40 mb-6 text-sm">Crie seu primeiro caderno para começar</p>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-white hover:bg-white/90 text-black text-sm font-semibold px-5 py-2.5 rounded-xl transition-all">
              <Plus size={15} /> Criar Caderno
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-white/40 uppercase tracking-widest">Meus Cadernos</h2>
              <span className="text-xs text-white/20">{notebooks.length} caderno{notebooks.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {notebooks.map((nb) => (
                <div key={nb.id} className="group relative bg-white/[0.04] hover:bg-white/[0.07] border border-white/8 hover:border-white/15 rounded-2xl overflow-hidden transition-all duration-200 hover:glow-white-sm">
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-11 h-11 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center text-2xl">
                        {nb.icon}
                      </div>
                      <button onClick={() => deleteNotebook(nb.id)} disabled={deletingId === nb.id}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-white/20 hover:text-white/60 hover:bg-white/8 rounded-lg transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <h3 className="font-bold text-white text-sm mb-1 leading-tight">{nb.name}</h3>
                    {nb.description && <p className="text-white/40 text-xs mb-3 line-clamp-2">{nb.description}</p>}
                    <div className="flex items-center gap-3 text-xs text-white/30 mb-4">
                      <span>{nb.question_count} questões</span>
                      <span>·</span>
                      <span>{nb.flashcard_count} flashcards</span>
                    </div>
                    <Link href={`/notebooks/${nb.id}`}
                      className="flex items-center justify-between w-full bg-white/6 hover:bg-white/10 border border-white/8 hover:border-white/15 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all">
                      Abrir <ChevronRight size={14} className="text-white/40" />
                    </Link>
                  </div>
                </div>
              ))}
              {/* Add new */}
              <button onClick={() => setShowModal(true)}
                className="group flex flex-col items-center justify-center gap-2 bg-white/[0.02] hover:bg-white/[0.05] border border-dashed border-white/10 hover:border-white/20 rounded-2xl p-8 transition-all min-h-[180px]">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-white/20 transition-all">
                  <Plus size={18} className="text-white/30 group-hover:text-white/60 transition-colors" />
                </div>
                <span className="text-xs text-white/25 group-hover:text-white/40 transition-colors font-medium">Novo caderno</span>
              </button>
            </div>
          </>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0e0e0e] border border-white/12 rounded-2xl w-full max-w-md shadow-2xl animate-slide-up glow-white-sm">
            <div className="flex items-center justify-between p-6 border-b border-white/8">
              <h2 className="text-base font-bold text-white">Novo Caderno</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-white/30 hover:text-white hover:bg-white/8 rounded-lg transition-all">
                <X size={17} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Nome *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Fisiologia, Anatomia..." autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && createNotebook()}
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30 focus:bg-white/8 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Descrição</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Opcional"
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30 focus:bg-white/8 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">Ícone</label>
                <div className="flex flex-wrap gap-2">
                  {NOTEBOOK_ICONS.map((icon) => (
                    <button key={icon} onClick={() => setForm({ ...form, icon })}
                      className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${form.icon === icon ? 'bg-white text-black scale-110' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setShowModal(false)} className="flex-1 bg-white/6 hover:bg-white/10 text-white/70 text-sm font-medium py-3 rounded-xl transition-all">
                Cancelar
              </button>
              <button onClick={createNotebook} disabled={!form.name.trim() || saving}
                className="flex-1 bg-white hover:bg-white/90 disabled:opacity-30 text-black text-sm font-bold py-3 rounded-xl transition-all">
                {saving ? 'Criando...' : 'Criar Caderno'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
