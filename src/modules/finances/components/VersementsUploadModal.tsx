import { useState, type ChangeEvent } from 'react'
import { Modal, Button } from '@/shared/ui'
import { supabase } from '@/shared/supabase'
import { COMPAGNIES_BORDEREAU } from '../types'

const MOIS_NOMS = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
] as const

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: (bordereauId: string, summary: string) => void
}

export function VersementsUploadModal({ open, onClose, onSuccess }: Props) {
  const now = new Date()
  const [file, setFile] = useState<File | null>(null)
  const [compagnie, setCompagnie] = useState<string>('FMA')
  const [annee, setAnnee] = useState(now.getFullYear())
  const [mois, setMois] = useState(now.getMonth() + 1)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!file) return
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

      const { data, error: err } = await supabase.functions.invoke(
        'versements-parse-csv',
        {
          body: {
            file_base64,
            file_name: file.name,
            compagnie_bordereau: compagnie,
            annee,
            mois,
          },
        },
      )

      if (err) throw new Error(err.message)

      const d = data as {
        bordereau_id: string
        nb_lignes: number
        nb_matchees: number
        nb_ambigues: number
        nb_non_matchees: number
      }

      const parts = [
        `${d.nb_lignes} lignes`,
        `${d.nb_matchees} matchées`,
        d.nb_ambigues > 0 ? `${d.nb_ambigues} ambiguës` : null,
        d.nb_non_matchees > 0 ? `${d.nb_non_matchees} non matchées` : null,
      ].filter(Boolean)

      onSuccess(d.bordereau_id, parts.join(' · '))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Uploader un bordereau CSV">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>Fichier CSV</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setFile(e.target.files?.[0] ?? null)
            }
            style={{ fontSize: 13 }}
          />
        </div>

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
        </div>

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

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={() => void handleSubmit()}
            disabled={!file || sending}
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
