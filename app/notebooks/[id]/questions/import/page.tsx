'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Upload, CheckCircle, AlertCircle, Info, FileSpreadsheet, X, ChevronDown, Plus } from 'lucide-react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

type ParsedRow = string[]

function parseRows(rows: ParsedRow[]): { toInsert: object[]; errors: number } {
  const isHeader =
    rows[0]?.[0]?.toLowerCase().includes('pergunta') ||
    rows[0]?.[0]?.toLowerCase().includes('questão') ||
    rows[0]?.[0]?.toLowerCase().includes('question')
  const dataRows = isHeader ? rows.slice(1) : rows
  let errors = 0
  const toInsert: object[] = []
  for (const row of dataRows) {
    const question = row[0]?.trim()
    const correct = row[row.length - 1]?.trim()
    if (!question || !correct || row.length < 4) { errors++; continue }
    toInsert.push({
      question,
      option_a: row[1]?.trim() || null, explanation_a: row[2]?.trim() || null,
      option_b: row[3]?.trim() || null, explanation_b: row[4]?.trim() || null,
      option_c: row[5]?.trim() || null, explanation_c: row[6]?.trim() || null,
      option_d: row[7]?.trim() || null, explanation_d: row[8]?.trim() || null,
      option_e: row[9]?.trim() || null, explanation_e: row[10]?.trim() || null,
      correct_answer: correct,
    })
  }
  return { toInsert, errors }
}

function ImportQuestionsContent() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const initialSubtopicId = searchParams.get('subtopicId') ?? ''

  const [topics, setTopics] = useState<{ id: string; name: string }[]>([])
  const [subtopics, setSubtopics] = useState<{ id: string; name: string }[]>([])
  const [selectedTopicId, setSelectedTopicId] = useState('')
  const [selectedSubtopicId, setSelectedSubtopicId] = useState(initialSubtopicId)
  const [newTopicName, setNewTopicName] = useState('')
  const [newSubtopicName, setNewSubtopicName] = useState('')
  const [showNewTopic, setShowNewTopic] = useState(false)
  const [showNewSubtopic, setShowNewSubtopic] = useState(false)

  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ success: number; errors: number } | null>(null)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<ParsedRow[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchTopics() }, [id])

  useEffect(() => {
    if (selectedTopicId) fetchSubtopics(selectedTopicId)
    else setSubtopics([])
  }, [selectedTopicId])

  // If initialSubtopicId provided, load its topic
  useEffect(() => {
    if (initialSubtopicId) {
      supabase.from('subtopics').select('id, name, topic_id').eq('id', initialSubtopicId).single().then(({ data }) => {
        if (data) {
          setSelectedTopicId(data.topic_id)
          setSelectedSubtopicId(initialSubtopicId)
        }
      })
    }
  }, [initialSubtopicId])

  async function fetchTopics() {
    const { data } = await supabase.from('topics').select('id, name').eq('notebook_id', id).order('created_at')
    setTopics(data ?? [])
  }

  async function fetchSubtopics(topicId: string) {
    const { data } = await supabase.from('subtopics').select('id, name').eq('topic_id', topicId).order('created_at')
    setSubtopics(data ?? [])
  }

  async function createTopic() {
    if (!newTopicName.trim()) return
    const { data } = await supabase.from('topics').insert({ notebook_id: id, name: newTopicName.trim() }).select('id, name').single()
    if (data) { setTopics((prev) => [...prev, data]); setSelectedTopicId(data.id) }
    setNewTopicName(''); setShowNewTopic(false)
  }

  async function createSubtopic() {
    if (!newSubtopicName.trim() || !selectedTopicId) return
    const { data } = await supabase.from('subtopics').insert({ topic_id: selectedTopicId, name: newSubtopicName.trim() }).select('id, name').single()
    if (data) { setSubtopics((prev) => [...prev, data]); setSelectedSubtopicId(data.id) }
    setNewSubtopicName(''); setShowNewSubtopic(false)
  }

  function readExcel(f: File): Promise<ParsedRow[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer)
          const wb = XLSX.read(data, { type: 'array' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as ParsedRow[]
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
    setFile(f); setResult(null); setError('')
    try {
      let rows: ParsedRow[]
      if (f.name.endsWith('.csv')) { const t = await f.text(); rows = Papa.parse<ParsedRow>(t, { skipEmptyLines: true }).data }
      else rows = await readExcel(f)
      setPreview(rows.slice(0, 4)); setText('')
    } catch { setError('Erro ao ler o arquivo.') }
  }

  function clearFile() { setFile(null); setPreview([]); if (fileRef.current) fileRef.current.value = '' }

  async function handleImport() {
    if (!selectedSubtopicId) { setError('Selecione um subtópico antes de importar.'); return }
    setImporting(true); setError(''); setResult(null)
    try {
      let rows: ParsedRow[] = []
      if (file) {
        if (file.name.endsWith('.csv')) { const t = await file.text(); rows = Papa.parse<ParsedRow>(t, { skipEmptyLines: true }).data }
        else rows = await readExcel(file)
      } else if (text.trim()) {
        rows = Papa.parse<ParsedRow>(text.trim(), { delimiter: '\t', skipEmptyLines: true }).data
      } else return

      const { toInsert, errors } = parseRows(rows)
      if (toInsert.length > 0) {
        const withIds = toInsert.map((r) => ({ ...r, notebook_id: id, subtopic_id: selectedSubtopicId }))
        const { error: insertError } = await supabase.from('questions').insert(withIds)
        if (insertError) throw new Error(insertError.message)
      }
      setResult({ success: toInsert.length, errors })
      setText(''); clearFile()
    } catch (err: any) { setError(err.message) }
    finally { setImporting(false) }
  }

  const hasData = file !== null || text.trim().length > 0
  const backHref = initialSubtopicId
    ? `/notebooks/${id}/topics/${selectedTopicId}/subtopics/${initialSubtopicId}`
    : `/notebooks/${id}`

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href={backHref} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-base font-semibold text-white">Importar Questões</h1>
            <p className="text-xs text-slate-400">Excel, CSV ou cole no formato tabela</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Topic/Subtopic selector */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-slate-300">Onde importar?</p>

          {/* Topic */}
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Tópico</label>
            {!showNewTopic ? (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select
                    value={selectedTopicId}
                    onChange={(e) => { setSelectedTopicId(e.target.value); setSelectedSubtopicId('') }}
                    className="w-full appearance-none bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                  >
                    <option value="">Selecione um tópico...</option>
                    {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                <button onClick={() => setShowNewTopic(true)} className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2.5 rounded-xl text-sm transition-colors whitespace-nowrap">
                  <Plus size={14} /> Novo
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input autoFocus value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') createTopic(); if (e.key === 'Escape') setShowNewTopic(false) }}
                  placeholder="Nome do tópico..." className="flex-1 bg-slate-800 border border-indigo-500 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
                <button onClick={createTopic} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">Criar</button>
                <button onClick={() => setShowNewTopic(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2.5 rounded-xl text-sm transition-colors">✕</button>
              </div>
            )}
          </div>

          {/* Subtopic */}
          {selectedTopicId && (
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Subtópico</label>
              {!showNewSubtopic ? (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select
                      value={selectedSubtopicId}
                      onChange={(e) => setSelectedSubtopicId(e.target.value)}
                      className="w-full appearance-none bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                    >
                      <option value="">Selecione um subtópico...</option>
                      {subtopics.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  <button onClick={() => setShowNewSubtopic(true)} className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2.5 rounded-xl text-sm transition-colors whitespace-nowrap">
                    <Plus size={14} /> Novo
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input autoFocus value={newSubtopicName} onChange={(e) => setNewSubtopicName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') createSubtopic(); if (e.key === 'Escape') setShowNewSubtopic(false) }}
                    placeholder="Nome do subtópico..." className="flex-1 bg-slate-800 border border-indigo-500 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
                  <button onClick={createSubtopic} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">Criar</button>
                  <button onClick={() => setShowNewSubtopic(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2.5 rounded-xl text-sm transition-colors">✕</button>
                </div>
              )}
            </div>
          )}

          {selectedSubtopicId && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 rounded-lg px-3 py-2">
              <CheckCircle size={13} />
              Destino selecionado: {topics.find(t => t.id === selectedTopicId)?.name} → {subtopics.find(s => s.id === selectedSubtopicId)?.name}
            </div>
          )}
        </div>

        {/* Format guide */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-300 mb-1">Colunas esperadas (em ordem)</p>
              <p className="text-xs text-blue-400 font-mono leading-relaxed">
                pergunta | opção_A | explicação_A | opção_B | explicação_B | opção_C | explicação_C | opção_D | explicação_D | opção_E | explicação_E | resposta_correta
              </p>
              <p className="text-xs text-blue-400 mt-2">
                • A primeira linha pode ser cabeçalho (ignorada automaticamente)<br />
                • opção_E e explicação_E são opcionais • resposta_correta: A, B, C, D ou E
              </p>
            </div>
          </div>
        </div>

        {/* File upload */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Arquivo Excel ou CSV</label>
          {file ? (
            <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
              <FileSpreadsheet size={20} className="text-emerald-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{file.name}</p>
                <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button onClick={clearFile} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"><X size={15} /></button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 bg-slate-900 border-2 border-dashed border-slate-700 hover:border-indigo-500 hover:bg-slate-800/50 rounded-xl px-4 py-8 cursor-pointer transition-all group">
              <FileSpreadsheet size={28} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
              <div className="text-center">
                <p className="text-sm text-slate-300 font-medium">Clique para selecionar o arquivo</p>
                <p className="text-xs text-slate-500 mt-0.5">.xlsx, .xls ou .csv</p>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
            </label>
          )}
        </div>

        {/* Preview */}
        {preview.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <p className="text-xs font-medium text-slate-400 px-4 py-2 border-b border-slate-800">Pré-visualização ({preview.length} linhas)</p>
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className={i === 0 ? 'bg-slate-800/60' : ''}>
                      {row.slice(0, 6).map((cell, j) => (
                        <td key={j} className="px-3 py-2 border-b border-slate-800 text-slate-300 max-w-[160px] truncate">{cell?.toString() || <span className="text-slate-600">—</span>}</td>
                      ))}
                      {row.length > 6 && <td className="px-3 py-2 text-slate-500">+{row.length - 6} cols</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Divider + textarea */}
        {!file && (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-xs text-slate-500 font-medium">ou cole os dados manualmente</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>
            <div>
              <textarea
                value={text} onChange={(e) => setText(e.target.value)}
                placeholder={`pergunta\topção A\texplicação A\topção B\texplicação B\topção C\texplicação C\topção D\texplicação D\tresposta correta`}
                rows={8}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-600 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-slate-500 mt-1.5">{text.trim() ? `${text.trim().split('\n').filter(Boolean).length} linha(s)` : 'Vazio'}</p>
            </div>
          </>
        )}

        {/* Feedback */}
        {result && (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-3 text-sm">
            <CheckCircle size={16} />
            <span>{result.success} questão(ões) importada(s){result.errors > 0 ? ` · ${result.errors} ignorada(s)` : ''}</span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
            <AlertCircle size={16} /><span>{error}</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <Link href={backHref} className="flex-1 text-center bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl text-sm font-medium transition-colors">
            Cancelar
          </Link>
          <button onClick={handleImport} disabled={!hasData || importing || !selectedSubtopicId}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-medium transition-colors">
            {importing ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importando...</> : <><Upload size={16} /> Importar Questões</>}
          </button>
        </div>
      </main>
    </div>
  )
}

export default function ImportQuestionsPage() {
  return <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}><ImportQuestionsContent /></Suspense>
}
