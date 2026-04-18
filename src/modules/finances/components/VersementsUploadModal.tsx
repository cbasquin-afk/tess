import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Modal, Button } from '@/shared/ui'
import { supabase } from '@/shared/supabase'
import { COMPAGNIES_BORDEREAU } from '../types'
import type { CompagnieFormat, VersementConfigCompagnie } from '../types'
import { fetchConfigCompagnies } from '../api'

const MOIS_NOMS = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
] as const

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: (bordereauId: string, summary: string) => void
}

function detectFormatFromFile(file: File): 'csv' | 'pdf' | null {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv')) return 'csv'
  if (name.endsWith('.pdf')) return 'pdf'
  return null
}

export function VersementsUploadModal({ open, onClose, onSuccess }: Props) {
  const now = new Date()
  const [file, setFile] = useState<File | null>(null)
  const [compagnie, setCompagnie] = useState<string>('FMA')
  const [annee, setAnnee] = useState(now.getFullYear())
  const [mois, setMois] = useState(now.getMonth() + 1)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [configs, setConfigs] = useState<VersementConfigCompagnie[]>([])

  useEffect(() => {
    if (!open) return
    fetchConfigCompagnies()
      .then(setConfigs)
      .catch(() => setConfigs([]))
  }, [open])

  const configMap = useMemo(() => {
    const m = new Map<string, VersementConfigCompagnie>()
    for (const c of configs) m.set(c.compagnie, c)
    return m
  }, [configs])

  const selectedFormat: CompagnieFormat | null = configMap.get(compagnie)?.format ?? null
  const fileFormat = file ? detectFormatFromFile(file) : null

  const expectedExt: 'csv' | 'pdf' | null =
    selectedFormat === 'csv' ? 'csv' :
    selectedFormat === 'pdf_ia' ? 'pdf' :
    null

  const mismatchMsg =
    file && expectedExt && fileFormat && expectedExt !== fileFormat
      ? `Le fichier est ${fileFormat.toUpperCase()} mais ${compagnie} attend ${expectedExt.toUpperCase()}.`
      : null

  const isManuel = selectedFormat === 'manuel'

  const handleSubmit = async () => {
    if (!file) return
    if (isManuel) return
    if (mismatchMsg) return
    setSending(true)
    setError(null)
    try {
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      const file_base64 = btoa(binary)

      const fn = fileFormat === 'pdf' ? 'versements-parse-pdf' : 'versements-parse-csv'

      const { data, error: err } = await supabase.functions.invoke(fn, {
        body: {
          file_base64,
          file_name: file.name,
          compagnie_bordereau: compagnie,
          annee,
          mois,
        },
      })

      if (err) throw new Error(err.message)

      const d = data as {
        bordereau_id: string
        nb_lignes: number
        nb_matchees: number
        nb_ambigues: number
        nb_non_matchees: number
        warning?: string
      }

      const parts = [
        `${d.nb_lignes} lignes`,
        `${d.nb_matchees} matchées`,
        d.nb_ambigues > 0 ? `${d.nb_ambigues} ambiguës` : null,
        d.nb_non_matchees > 0 ? `${d.nb_non_matchees} non matchées` : null,
        d.warning ? `⚠ ${d.warning}` : null,
      ].filter(Boolean)

      onSuccess(d.bordereau_id, parts.join(' · '))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSending(false)
    }
  }

  const title = fileFormat === 'pdf'
    ? 'Uploader un bordereau PDF'
    : 'Uploader un bordereau'

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>Compagnie bordereau</label>
          <select
            value={compagnie}
            onChange={(e) => setCompagnie(e.target.value)}
            style={inputStyle}
          >
            {COMPAGNIES_BORDEREAU.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {selectedFormat && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#64748b' }}>
              {selectedFormat === 'pdf_ia' && <>📄 Upload PDF — extraction IA (~30-60s)</>}
              {selectedFormat === 'csv' && <>📊 Upload CSV</>}
              {selectedFormat === 'manuel' && (
                <span style={{ color: '#b45309' }}>
                  Pas encore configuré — saisie manuelle à venir
                </span>
              )}
            </div>
          )}
        </div>

        {!isManuel && (
          <div>
            <label style={labelStyle}>
              Fichier {selectedFormat === 'pdf_ia' ? 'PDF' : selectedFormat === 'csv' ? 'CSV' : 'CSV ou PDF'}
            </label>
            <input
              type="file"
              accept=".csv,.pdf"
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFile(e.target.files?.[0] ?? null)
              }
              style={{ fontSize: 13 }}
            />
            {mismatchMsg && (
              <div style={{ marginTop: 6, fontSize: 11, color: '#dc2626' }}>
                {mismatchMsg}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Année</label>
            <select
              value={annee}
              onChange={(e) => setAnnee(Number(e.target.value))}
              style={inputStyle}
            >
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Mois</label>
            <select
              value={mois}
              onChange={(e) => setMois(Number(e.target.value))}
              style={inputStyle}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{MOIS_NOMS[m]}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div style={{ color: '#dc2626', fontSize: 13 }}>Erreur : {error}</div>
        )}

        {sending && (
          <div style={{ color: '#1f3a8a', fontSize: 12, fontWeight: 500 }}>
            {fileFormat === 'pdf'
              ? 'Extraction IA du PDF en cours (30-60s)…'
              : 'Parsing CSV…'}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={() => void handleSubmit()}
            disabled={!file || sending || isManuel || !!mismatchMsg}
          >
            {sending ? 'Upload en cours…' : 'Uploader et parser'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#64748b',
  marginBottom: 4,
}
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  fontSize: 13,
}
