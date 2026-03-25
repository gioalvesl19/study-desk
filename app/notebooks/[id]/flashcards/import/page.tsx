'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Upload, CheckCircle, AlertCircle, Info } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Papa from 'papaparse'

export default function ImportFlashcardsPage() {
  const { id } = useParams<{ id: string }>()
  const [text, setText] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ success: number; errors: number } | null>(null)
  const [error, setError] = useState('')

  async function handleImport() {
    if (!text.trim()) return
    setImporting(true)
    setError('')
    setResult(null)

    try {
      const parsed = Papa.parse<string[]>(text.trim(), {
        delimiter: '\t',
        skipEmptyLines: true,
      })

      const rows = parsed.data
      const isHeader = rows[0]?.[0]?.toLowerCase().includes('pergunta') ||
        rows[0]?.[0]?.toLowerCase().includes('questão') ||
        rows[0]?.[0]?.toLowerCase().includes('question') ||
        rows[0]?.[0]?.toLowerCase().includes('frente')

      const dataRows = isHeader ? rows.slice(1) : rows

      let errors = 0
      const toInsert = dataRows.map((row) => {
        const question = row[0]?.trim()
        const answer = row[1]?.trim()
        if (!question || !answer) { errors++; return null }
        return { notebook_id: id, question, answer }
      }).filter(Boolean)

      if (toInsert.length > 0) {
        const { error: insertError } = await supabase.from('flashcards').insert(toInsert as any[])
        if (insertError) throw new Error(insertError.message)
      }

      setResult({ success: toInsert.length, errors })
      if (toInsert.length > 0) setText('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href={`/notebooks/${id}`} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-base font-semibold text-white">Importar Flashcards</h1>
            <p className="text-xs text-slate-400">Cole os dados no formato tabela (TSV)</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Format guide */}
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-5">
          <div className="flex items-start gap-2">
            <Info size={16} className="text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-purple-300 mb-1">Formato esperado (separado por tabulação)</p>
              <p className="text-xs text-purple-400 font-mono leading-relaxed">
                pergunta | resposta
              </p>
              <p className="text-xs text-purple-400 mt-2">
                • Cada linha é um flashcard<br />
                • A primeira linha pode ser cabeçalho (será ignorada automaticamente)<br />
                • Copie direto do Excel/Google Sheets ou cole separado por tab
              </p>
            </div>
          </div>
        </div>

        {/* Textarea */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Cole os dados aqui
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`pergunta\tresposta\nQual o potencial de repouso?\t-70 mV\nO que é despolarização?\tInversão da polaridade da membrana celular\nComo funciona a bomba Na+/K+?\tBomba 3 Na+ para fora e 2 K+ para dentro`}
            rows={14}
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-600 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-slate-500 mt-1.5">
            {text.trim() ? `${text.trim().split('\n').filter(Boolean).length} linha(s)` : 'Vazio'}
          </p>
        </div>

        {/* Feedback */}
        {result && (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-3 text-sm mb-4">
            <CheckCircle size={16} />
            <span>{result.success} flashcard(s) importado(s) com sucesso{result.errors > 0 ? ` • ${result.errors} ignorado(s)` : ''}</span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm mb-4">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <Link
            href={`/notebooks/${id}`}
            className="flex-1 text-center bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl text-sm font-medium transition-colors"
          >
            Cancelar
          </Link>
          <button
            onClick={handleImport}
            disabled={!text.trim() || importing}
            className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-medium transition-colors"
          >
            {importing ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importando...</>
            ) : (
              <><Upload size={16} /> Importar Flashcards</>
            )}
          </button>
        </div>
      </main>
    </div>
  )
}
