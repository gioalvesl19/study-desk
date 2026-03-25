'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Upload, CheckCircle, AlertCircle, Info } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Papa from 'papaparse'

export default function ImportQuestionsPage() {
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
      // Check if first row is header
      const firstRow = rows[0]
      const isHeader = firstRow[0]?.toLowerCase().includes('pergunta') ||
        firstRow[0]?.toLowerCase().includes('questão') ||
        firstRow[0]?.toLowerCase().includes('question')

      const dataRows = isHeader ? rows.slice(1) : rows

      let success = 0
      let errors = 0

      const toInsert = dataRows.map((row) => {
        // Expected: pergunta | opA | expA | opB | expB | opC | expC | opD | expD | opE | expE | resposta
        if (row.length < 4) { errors++; return null }
        const question = row[0]?.trim()
        const correct = row[row.length - 1]?.trim()
        if (!question || !correct) { errors++; return null }
        return {
          notebook_id: id,
          question,
          option_a: row[1]?.trim() || null,
          explanation_a: row[2]?.trim() || null,
          option_b: row[3]?.trim() || null,
          explanation_b: row[4]?.trim() || null,
          option_c: row[5]?.trim() || null,
          explanation_c: row[6]?.trim() || null,
          option_d: row[7]?.trim() || null,
          explanation_d: row[8]?.trim() || null,
          option_e: row[9]?.trim() || null,
          explanation_e: row[10]?.trim() || null,
          correct_answer: correct,
        }
      }).filter(Boolean)

      if (toInsert.length > 0) {
        const { error: insertError } = await supabase.from('questions').insert(toInsert as any[])
        if (insertError) throw new Error(insertError.message)
        success = toInsert.length
      }

      setResult({ success, errors })
      if (success > 0) setText('')
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
            <h1 className="text-base font-semibold text-white">Importar Questões</h1>
            <p className="text-xs text-slate-400">Cole os dados no formato tabela (TSV)</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Format guide */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-5">
          <div className="flex items-start gap-2">
            <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-300 mb-1">Formato esperado (separado por tabulação)</p>
              <p className="text-xs text-blue-400 font-mono leading-relaxed">
                pergunta | opção_A | explicação_A | opção_B | explicação_B | opção_C | explicação_C | opção_D | explicação_D | opção_E | explicação_E | resposta_correta
              </p>
              <p className="text-xs text-blue-400 mt-2">
                • A primeira linha pode ser cabeçalho (será ignorada automaticamente)<br />
                • opção_E e sua explicação são opcionais<br />
                • resposta_correta deve ser A, B, C, D ou E<br />
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
            placeholder={`pergunta\topção A\texplicação A\topção B\texplicação B\topção C\texplicação C\topção D\texplicação D\tresposta correta\nQual o potencial de repouso da célula?\t-70 mV\tValor típico de repouso\t-40 mV\tValor de limiar\t+40 mV\tPico do PA\t0 mV\tNão é valor típico\tA`}
            rows={14}
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-600 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-slate-500 mt-1.5">
            {text.trim() ? `${text.trim().split('\n').filter(Boolean).length} linha(s)` : 'Vazio'}
          </p>
        </div>

        {/* Feedback */}
        {result && (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-3 text-sm mb-4">
            <CheckCircle size={16} />
            <span>{result.success} questão(ões) importada(s) com sucesso{result.errors > 0 ? ` • ${result.errors} ignorada(s)` : ''}</span>
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
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-medium transition-colors"
          >
            {importing ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importando...</>
            ) : (
              <><Upload size={16} /> Importar Questões</>
            )}
          </button>
        </div>
      </main>
    </div>
  )
}
