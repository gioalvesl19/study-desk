'use client'

import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Upload, CheckCircle, AlertCircle, Info, FileSpreadsheet, X } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

type ParsedRow = string[]

export default function ImportFlashcardsPage() {
  const { id } = useParams<{ id: string }>()
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ success: number; errors: number } | null>(null)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<ParsedRow[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  function readExcel(f: File): Promise<ParsedRow[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer)
          const wb = XLSX.read(data, { type: 'array' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const rows: ParsedRow[] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as ParsedRow[]
          resolve(rows.filter((r) => r.some((c) => c?.toString().trim())))
        } catch (err) { reject(err) }
      }
      reader.onerror = reject
      reader.readAsArrayBuffer(f)
    })
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setResult(null)
    setError('')
    try {
      let rows: ParsedRow[]
      if (f.name.endsWith('.csv')) {
        const t = await f.text()
        rows = Papa.parse<ParsedRow>(t, { skipEmptyLines: true }).data
      } else {
        rows = await readExcel(f)
      }
      setPreview(rows.slice(0, 4))
      setText('')
    } catch {
      setError('Erro ao ler o arquivo. Verifique se é um Excel ou CSV válido.')
    }
  }

  function clearFile() {
    setFile(null)
    setPreview([])
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleImport() {
    setImporting(true)
    setError('')
    setResult(null)

    try {
      let rows: ParsedRow[] = []

      if (file) {
        if (file.name.endsWith('.csv')) {
          const t = await file.text()
          rows = Papa.parse<ParsedRow>(t, { skipEmptyLines: true }).data
        } else {
          rows = await readExcel(file)
        }
      } else if (text.trim()) {
        rows = Papa.parse<ParsedRow>(text.trim(), { delimiter: '\t', skipEmptyLines: true }).data
      } else return

      const isHeader =
        rows[0]?.[0]?.toLowerCase().includes('pergunta') ||
        rows[0]?.[0]?.toLowerCase().includes('questão') ||
        rows[0]?.[0]?.toLowerCase().includes('frente') ||
        rows[0]?.[0]?.toLowerCase().includes('front')
      const dataRows = isHeader ? rows.slice(1) : rows

      let errors = 0
      const toInsert: object[] = []
      for (const row of dataRows) {
        const question = row[0]?.trim()
        const answer = row[1]?.trim()
        if (!question || !answer) { errors++; continue }
        toInsert.push({ notebook_id: id, question, answer })
      }

      if (toInsert.length > 0) {
        const { error: insertError } = await supabase.from('flashcards').insert(toInsert)
        if (insertError) throw new Error(insertError.message)
      }

      setResult({ success: toInsert.length, errors })
      setText('')
      clearFile()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  const hasData = file !== null || text.trim().length > 0

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href={`/notebooks/${id}`} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-base font-semibold text-white">Importar Flashcards</h1>
            <p className="text-xs text-slate-400">Excel, CSV ou cole no formato tabela</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Format guide */}
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-5">
          <div className="flex items-start gap-2">
            <Info size={16} className="text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-purple-300 mb-1">Colunas esperadas</p>
              <p className="text-xs text-purple-400 font-mono">pergunta | resposta</p>
              <p className="text-xs text-purple-400 mt-2">
                • Cada linha = 1 flashcard<br />
                • A primeira linha pode ser cabeçalho (ignorada automaticamente)
              </p>
            </div>
          </div>
        </div>

        {/* File upload */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">Arquivo Excel ou CSV</label>
          {file ? (
            <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
              <FileSpreadsheet size={20} className="text-emerald-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{file.name}</p>
                <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button onClick={clearFile} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                <X size={15} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 bg-slate-900 border-2 border-dashed border-slate-700 hover:border-purple-500 hover:bg-slate-800/50 rounded-xl px-4 py-8 cursor-pointer transition-all group">
              <FileSpreadsheet size={28} className="text-slate-500 group-hover:text-purple-400 transition-colors" />
              <div className="text-center">
                <p className="text-sm text-slate-300 font-medium">Clique para selecionar o arquivo</p>
                <p className="text-xs text-slate-500 mt-0.5">.xlsx, .xls ou .csv</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          )}
        </div>

        {/* Preview */}
        {preview.length > 0 && (
          <div className="mb-4 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <p className="text-xs font-medium text-slate-400 px-4 py-2 border-b border-slate-800">
              Pré-visualização (primeiras {preview.length} linhas)
            </p>
            <table className="text-xs w-full">
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className={i === 0 ? 'bg-slate-800/60' : ''}>
                    <td className="px-4 py-2.5 border-b border-slate-800 text-slate-300 w-1/2 truncate max-w-0">{row[0] || <span className="text-slate-600">—</span>}</td>
                    <td className="px-4 py-2.5 border-b border-slate-800 text-slate-400 w-1/2 truncate max-w-0">{row[1] || <span className="text-slate-600">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Divider + textarea */}
        {!file && (
          <>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-xs text-slate-500 font-medium">ou cole os dados manualmente</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>
            <div className="mb-4">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`pergunta\tresposta\nQual o potencial de repouso?\t-70 mV\nO que é despolarização?\tInversão da polaridade da membrana`}
                rows={8}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-600 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-slate-500 mt-1.5">
                {text.trim() ? `${text.trim().split('\n').filter(Boolean).length} linha(s)` : 'Vazio'}
              </p>
            </div>
          </>
        )}

        {/* Feedback */}
        {result && (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-3 text-sm mb-4">
            <CheckCircle size={16} />
            <span>{result.success} flashcard(s) importado(s){result.errors > 0 ? ` • ${result.errors} ignorado(s)` : ''}</span>
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
          <Link href={`/notebooks/${id}`} className="flex-1 text-center bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl text-sm font-medium transition-colors">
            Cancelar
          </Link>
          <button
            onClick={handleImport}
            disabled={!hasData || importing}
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
