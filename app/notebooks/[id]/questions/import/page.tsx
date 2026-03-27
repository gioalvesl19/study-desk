'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Upload, CheckCircle, AlertCircle, FileSpreadsheet, X, ChevronDown, Plus, Info } from 'lucide-react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

type ParsedRow = string[]

function parseRows(rows: ParsedRow[]): { toInsert: object[]; errors: number } {
  const isHeader = rows[0]?.[0]?.toLowerCase().includes('pergunta') || rows[0]?.[0]?.toLowerCase().includes('question')
  const dataRows = isHeader ? rows.slice(1) : rows
  let errors = 0
  const toInsert: object[] = []
  for (const row of dataRows) {
    const question = row[0]?.trim(); const correct = row[row.length - 1]?.trim()
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
  useEffect(() => { if (selectedTopicId) fetchSubtopics(selectedTopicId); else setSubtopics([]) }, [selectedTopicId])
  useEffect(() => {
    if (initialSubtopicId) {
      supabase.from('subtopics').select('id, name, topic_id').eq('id', initialSubtopicId).single().then(({ data }) => {
        if (data) { setSelectedTopicId(data.topic_id); setSelectedSubtopicId(initialSubtopicId) }
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
    if (data) { setTopics((p) => [...p, data]); setSelectedTopicId(data.id) }
    setNewTopicName(''); setShowNewTopic(false)
  }
  async function createSubtopic() {
    if (!newSubtopicName.trim() || !selectedTopicId) return
    const { data } = await supabase.from('subtopics').insert({ topic_id: selectedTopicId, name: newSubtopicName.trim() }).select('id, name').single()
    if (data) { setSubtopics((p) => [...p, data]); setSelectedSubtopicId(data.id) }
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
          resolve((XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as ParsedRow[]).filter((r) => r.some((c) => c?.toString().trim())))
        } catch (err) { reject(err) }
      }
      reader.onerror = reject; reader.readAsArrayBuffer(f)
    })
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setFile(f); setResult(null); setError('')
    try {
      const rows = f.name.endsWith('.csv') ? Papa.parse<ParsedRow>(await f.text(), { skipEmptyLines: true }).data : await readExcel(f)
      setPreview(rows.slice(0, 4)); setText('')
    } catch { setError('Erro ao ler o arquivo.') }
  }
  function clearFile() { setFile(null); setPreview([]); if (fileRef.current) fileRef.current.value = '' }

  async function handleImport() {
    if (!selectedSubtopicId) { setError('Selecione um subtópico antes de importar.'); return }
    setImporting(true); setError(''); setResult(null)
    try {
      let rows: ParsedRow[] = []
      if (file) rows = file.name.endsWith('.csv') ? Papa.parse<ParsedRow>(await file.text(), { skipEmptyLines: true }).data : await readExcel(file)
      else if (text.trim()) rows = Papa.parse<ParsedRow>(text.trim(), { delimiter: '\t', skipEmptyLines: true }).data
      else return
      const { toInsert, errors } = parseRows(rows)
      if (toInsert.length > 0) {
        const { error: e } = await supabase.from('questions').insert(toInsert.map((r) => ({ ...r, notebook_id: id, subtopic_id: selectedSubtopicId })))
        if (e) throw new Error(e.message)
      }
      setResult({ success: toInsert.length, errors }); setText(''); clearFile()
    } catch (err: any) { setError(err.message) }
    finally { setImporting(false) }
  }

  const hasData = file !== null || text.trim().length > 0
  const backHref = initialSubtopicId && selectedTopicId ? `/notebooks/${id}/topics/${selectedTopicId}/subtopics/${initialSubtopicId}` : `/notebooks/${id}`

  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-white/8 bg-black/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href={backHref} className="p-1.5 text-white/30 hover:text-white hover:bg-white/8 rounded-lg transition-all">
            <ArrowLeft size={17} />
          </Link>
          <div>
            <h1 className="text-base font-bold text-white">Importar Questões</h1>
            <p className="text-xs text-white/30">Excel, CSV ou cole no formato tabela</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Destination */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-medium text-white/40 uppercase tracking-widest">Destino</p>
          <div>
            <label className="text-xs text-white/30 mb-1.5 block">Tópico</label>
            {!showNewTopic ? (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select value={selectedTopicId} onChange={(e) => { setSelectedTopicId(e.target.value); setSelectedSubtopicId('') }}
                    className="w-full appearance-none bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/30 pr-10">
                    <option value="">Selecione um tópico...</option>
                    {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                </div>
                <button onClick={() => setShowNewTopic(true)} className="flex items-center gap-1.5 bg-white/5 hover:bg-white/8 border border-white/10 text-white/50 px-3 py-2.5 rounded-xl text-xs transition-all">
                  <Plus size={13} /> Novo
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input autoFocus value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') createTopic(); if (e.key === 'Escape') setShowNewTopic(false) }}
                  placeholder="Nome do tópico..." className="flex-1 bg-white/5 border border-white/30 text-white placeholder-white/20 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
                <button onClick={createTopic} className="bg-white hover:bg-white/90 text-black px-4 py-2.5 rounded-xl text-sm font-bold transition-all">Criar</button>
                <button onClick={() => setShowNewTopic(false)} className="bg-white/5 text-white/40 px-3 py-2.5 rounded-xl text-sm transition-all">✕</button>
              </div>
            )}
          </div>
          {selectedTopicId && (
            <div>
              <label className="text-xs text-white/30 mb-1.5 block">Subtópico</label>
              {!showNewSubtopic ? (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select value={selectedSubtopicId} onChange={(e) => setSelectedSubtopicId(e.target.value)}
                      className="w-full appearance-none bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/30 pr-10">
                      <option value="">Selecione um subtópico...</option>
                      {subtopics.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                  </div>
                  <button onClick={() => setShowNewSubtopic(true)} className="flex items-center gap-1.5 bg-white/5 hover:bg-white/8 border border-white/10 text-white/50 px-3 py-2.5 rounded-xl text-xs transition-all">
                    <Plus size={13} /> Novo
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input autoFocus value={newSubtopicName} onChange={(e) => setNewSubtopicName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') createSubtopic(); if (e.key === 'Escape') setShowNewSubtopic(false) }}
                    placeholder="Nome do subtópico..." className="flex-1 bg-white/5 border border-white/30 text-white placeholder-white/20 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
                  <button onClick={createSubtopic} className="bg-white hover:bg-white/90 text-black px-4 py-2.5 rounded-xl text-sm font-bold transition-all">Criar</button>
                  <button onClick={() => setShowNewSubtopic(false)} className="bg-white/5 text-white/40 px-3 py-2.5 rounded-xl text-sm transition-all">✕</button>
                </div>
              )}
            </div>
          )}
          {selectedSubtopicId && (
            <div className="flex items-center gap-2 text-xs text-white/60 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
              <CheckCircle size={12} /> {topics.find(t => t.id === selectedTopicId)?.name} → {subtopics.find(s => s.id === selectedSubtopicId)?.name}
            </div>
          )}
        </div>

        {/* Format */}
        <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <Info size={14} className="text-white/30 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-white/50 mb-1">Colunas esperadas</p>
              <p className="text-xs text-white/25 font-mono leading-relaxed">pergunta | opção_A | exp_A | opção_B | exp_B | opção_C | exp_C | opção_D | exp_D | opção_E | exp_E | resposta</p>
            </div>
          </div>
        </div>

        {/* File upload */}
        <div>
          <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">Arquivo Excel ou CSV</label>
          {file ? (
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <FileSpreadsheet size={18} className="text-white/60 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{file.name}</p>
                <p className="text-xs text-white/30">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button onClick={clearFile} className="p-1.5 text-white/30 hover:text-white hover:bg-white/8 rounded-lg transition-all"><X size={14} /></button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 bg-white/[0.02] border-2 border-dashed border-white/10 hover:border-white/25 hover:bg-white/[0.04] rounded-xl px-4 py-8 cursor-pointer transition-all group">
              <FileSpreadsheet size={26} className="text-white/20 group-hover:text-white/50 transition-colors" />
              <p className="text-sm text-white/40 group-hover:text-white/60 font-medium transition-colors">Clique para selecionar</p>
              <p className="text-xs text-white/20">.xlsx, .xls ou .csv</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
            </label>
          )}
        </div>

        {preview.length > 0 && (
          <div className="bg-white/[0.03] border border-white/8 rounded-xl overflow-hidden">
            <p className="text-xs text-white/30 px-4 py-2 border-b border-white/8">Prévia ({preview.length} linhas)</p>
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className={i === 0 ? 'bg-white/5' : ''}>
                      {row.slice(0, 6).map((cell, j) => (
                        <td key={j} className="px-3 py-2 border-b border-white/5 text-white/50 max-w-[140px] truncate">{cell?.toString() || '—'}</td>
                      ))}
                      {row.length > 6 && <td className="px-3 py-2 text-white/20">+{row.length - 6}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!file && (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-xs text-white/20">ou cole manualmente</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)}
              placeholder={`pergunta\topção A\texplicação A\topção B\texplicação B\topção C\texplicação C\topção D\texplicação D\tresposta correta`}
              rows={7}
              className="w-full bg-white/[0.03] border border-white/8 text-white/70 placeholder-white/15 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-white/25 resize-none" />
            <p className="text-xs text-white/20 -mt-2">{text.trim() ? `${text.trim().split('\n').filter(Boolean).length} linha(s)` : 'Vazio'}</p>
          </>
        )}

        {result && <div className="flex items-center gap-2 bg-white/5 border border-white/15 text-white/80 rounded-xl px-4 py-3 text-sm"><CheckCircle size={15} />{result.success} questão(ões) importada(s){result.errors > 0 ? ` · ${result.errors} ignorada(s)` : ''}</div>}
        {error && <div className="flex items-center gap-2 bg-white/5 border border-white/15 text-white/50 rounded-xl px-4 py-3 text-sm"><AlertCircle size={15} />{error}</div>}

        <div className="flex gap-3">
          <Link href={backHref} className="flex-1 text-center bg-white/5 hover:bg-white/8 border border-white/8 text-white/50 py-3 rounded-xl text-sm font-medium transition-all">Cancelar</Link>
          <button onClick={handleImport} disabled={!hasData || importing || !selectedSubtopicId}
            className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-white/90 disabled:opacity-25 text-black py-3 rounded-xl text-sm font-bold transition-all glow-white-sm">
            {importing ? <><div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> Importando...</> : <><Upload size={15} /> Importar Questões</>}
          </button>
        </div>
      </main>
    </div>
  )
}

export default function ImportQuestionsPage() {
  return <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="w-7 h-7 border-2 border-white/20 border-t-white rounded-full animate-spin" /></div>}><ImportQuestionsContent /></Suspense>
}
