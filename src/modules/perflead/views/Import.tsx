import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
import * as XLSX from 'xlsx'
import {
  countTable,
  fetchImports,
  fetchStatutMapping,
  insertImport,
  upsertContrats,
  upsertLeads,
} from '../api'
import type { ImportRow } from '../types'

// ── Helpers de parsing (portés depuis import.js) ──────────
function toStr(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s.length > 0 ? s : null
}
function toNum(v: unknown): number | null {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return isNaN(n) ? null : n
}
function toFloat(v: unknown): number | null {
  if (v === '' || v === null || v === undefined) return null
  const n = parseFloat(String(v).replace(',', '.'))
  return isNaN(n) ? null : n
}
function toDate(v: unknown): string | null {
  if (!v) return null
  if (v instanceof Date) {
    return isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10)
  }
  const s = String(v).trim()
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return null
}
function calcAge(dob: string | null): number | null {
  if (!dob) return null
  const ms = Date.now() - new Date(dob).getTime()
  return ms < 0 ? null : Math.floor(ms / 31557600000)
}
function trancheAge(a: number | null): string | null {
  if (a === null || a < 0) return null
  if (a < 55) return '<55'
  if (a < 60) return '55-59'
  if (a < 65) return '60-64'
  if (a < 70) return '65-69'
  if (a < 75) return '70-74'
  if (a < 80) return '75-79'
  if (a < 85) return '80-84'
  return '85+'
}
function normalTel(v: unknown): string | null {
  if (!v) return null
  let s = String(v)
    .replace(/\D/g, '')
    .replace(/\.0$/, '')
  if (s.startsWith('33') && s.length === 11) s = '0' + s.slice(2)
  if (s.length < 9 || s.length > 10) return null
  if (!s.startsWith('0')) s = '0' + s
  return s
}
function dedupBy<T extends Record<string, unknown>>(
  arr: T[],
  key: keyof T,
): T[] {
  const m = new Map<string, T>()
  for (const r of arr) {
    const k = r[key]
    if (k !== null && k !== undefined) m.set(String(k), r)
  }
  return Array.from(m.values())
}
function cleanRow(r: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(r)) {
    const cleanKey = k.replace(/^\ufeff/, '').replace(/^"|"$/g, '').trim()
    out[cleanKey] = v
  }
  return out
}

interface ContactInfo {
  civilite: string | null
  prenom: string | null
  nom: string | null
  telephone: string | null
  code_postal: string | null
  ville: string | null
  email: string | null
}

interface LogLine {
  msg: string
  type: 'info' | 'ok' | 'err'
}

function fmt(n: number): string {
  return n.toLocaleString('fr-FR')
}

function Import() {
  const [imports, setImports] = useState<ImportRow[]>([])
  const [counts, setCounts] = useState<{ leads: number; contrats: number }>({
    leads: 0,
    contrats: 0,
  })
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<LogLine[]>([])
  const [historyError, setHistoryError] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    try {
      const [imps, nbL, nbC] = await Promise.all([
        fetchImports(5),
        countTable('perflead_leads'),
        countTable('perflead_contrats'),
      ])
      setImports(imps)
      setCounts({ leads: nbL, contrats: nbC })
    } catch (e: unknown) {
      setHistoryError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  function addLog(msg: string, type: LogLine['type'] = 'info') {
    setLogs((prev) => [...prev, { msg, type }])
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setProgress(0)
    setLogs([])

    try {
      addLog('▶ Lecture du fichier…')
      setProgress(5)
      const wb = XLSX.read(await file.arrayBuffer(), {
        type: 'array',
        cellDates: true,
      })

      const wsProjets = wb.Sheets['Projets Assurance de personnes']
      const wsAnimaux = wb.Sheets['Projets Animaux']
      if (!wsProjets) {
        throw new Error('Onglet "Projets Assurance de personnes" introuvable')
      }

      const projetsRaw = XLSX.utils
        .sheet_to_json<Record<string, unknown>>(wsProjets, { defval: '' })
        .map(cleanRow)
      const animauxRaw = wsAnimaux
        ? XLSX.utils
            .sheet_to_json<Record<string, unknown>>(wsAnimaux, { defval: '' })
            .map(cleanRow)
        : []
      const projets = [...projetsRaw, ...animauxRaw]

      const wsContrats = wb.Sheets['Contrats Assurance de personnes']
      const wsContratsAnim = wb.Sheets['Contrats Animaux']
      const cRawPersonnes = wsContrats
        ? XLSX.utils.sheet_to_json<Record<string, unknown>>(wsContrats, {
            defval: '',
          })
        : []
      const cRawAnimaux = wsContratsAnim
        ? XLSX.utils.sheet_to_json<Record<string, unknown>>(wsContratsAnim, {
            defval: '',
          })
        : []
      const cRaw = [...cRawPersonnes, ...cRawAnimaux]

      addLog(
        `📋 ${projetsRaw.length} projets santé + ${animauxRaw.length} projets animaux lus`,
      )
      setProgress(10)

      // Mapping statuts
      const mapping = await fetchStatutMapping()
      const statTocat = Object.fromEntries(
        mapping.map((r) => [r.statut_crm, r.categorie]),
      )
      setProgress(15)

      // Période d'import
      const dates = projets
        .map((r) => toDate(r['Date de création']))
        .filter((d): d is string => d !== null)
        .sort()

      const imp = await insertImport({
        filename: file.name,
        nb_projets: projets.length,
        nb_contrats: cRaw.length,
        date_min: dates[0] ?? null,
        date_max: dates.at(-1) ?? null,
      })
      addLog('📝 Import enregistré')
      setProgress(20)

      // Charger contacts pour jointure
      const wsContacts = wb.Sheets['Contacts']
      const contactMap = new Map<number, ContactInfo>()
      if (wsContacts) {
        const contactsRaw = XLSX.utils
          .sheet_to_json<Record<string, unknown>>(wsContacts, { defval: '' })
          .map(cleanRow)
        for (const c of contactsRaw) {
          const idRaw = c['Identifiant']
          const id = idRaw ? parseInt(String(idRaw), 10) : NaN
          if (!isNaN(id)) {
            contactMap.set(id, {
              civilite: toStr(c['Civilité']),
              prenom: toStr(c['Prénom']),
              nom: toStr(c['Nom']),
              telephone:
                normalTel(c['Téléphone 1']) ?? normalTel(c['Téléphone 2']),
              code_postal:
                String(c['Code postal'] ?? '')
                  .replace('.0', '')
                  .padStart(5, '0')
                  .slice(0, 5) || null,
              ville: toStr(c['Ville']),
              email: toStr(c['Email']),
            })
          }
        }
      }
      addLog(`👤 ${contactMap.size} contacts chargés`)
      setProgress(25)

      // Construction des leads
      const leadsRaw = projets
        .map((r) => {
          const statut = toStr(r['Statut']) ?? 'Inconnu'
          const dob = toDate(r['Assuré 1 - Date de naissance'])
          const a = calcAge(dob)
          const idContactRaw = r['Identifiant contact']
          const idContact = idContactRaw
            ? parseInt(String(idContactRaw), 10)
            : NaN
          const contact =
            !isNaN(idContact) ? contactMap.get(idContact) ?? null : null
          const idProjet = toNum(r['Identifiant projet'])
          const commentaire = toStr(r['Commentaire'])
          const leadbyteMatch = String(commentaire ?? '').match(
            /LeadByte #(\d+)/,
          )
          return {
            import_id: imp.id,
            identifiant_projet: idProjet,
            identifiant_contact: !isNaN(idContact) ? idContact : null,
            leadbyte_id: leadbyteMatch ? leadbyteMatch[1] : null,
            statut,
            categorie: statTocat[statut] ?? 'Autre',
            date_creation: toDate(r['Date de création']),
            derniere_modification: toDate(r['Dernière modification']),
            auteur: toStr(r['Auteur']),
            attribution: toStr(r['Attribution']),
            civilite: toStr(r['Assuré 1 - Civilité']),
            prenom: toStr(r['Assuré 1 - Prénom']),
            nom: toStr(r['Assuré 1 - Nom']),
            contact_civilite: contact?.civilite ?? null,
            contact_prenom: contact?.prenom ?? null,
            contact_nom: contact?.nom ?? null,
            telephone: contact?.telephone ?? null,
            code_postal: contact?.code_postal ?? null,
            ville: contact?.ville ?? null,
            email: contact?.email ?? null,
            type_contrat: toStr(r['Type']) ?? 'Complémentaire santé',
            origine: toStr(r['Origine']) ?? 'MapApp Digital',
            source: toStr(r['Provenance']) ?? 'mapapp',
            url_projet: idProjet
              ? `https://tessoriaassurances.oggo-data.net/admin/insurance/projects/${idProjet}`
              : null,
            date_naissance: dob,
            regime: toStr(r['Assuré 1 - Régime']),
            age: a,
            tranche_age: trancheAge(a),
            commentaire: commentaire?.slice(0, 500) ?? null,
          }
        })
        .filter((r) => r.identifiant_projet !== null)

      const leads = dedupBy(leadsRaw, 'identifiant_projet')
      addLog(`👥 ${leads.length} leads à importer`)

      await upsertLeads(leads)
      addLog(`✅ ${leads.length} leads importés`, 'ok')
      setProgress(70)

      // Construction des contrats
      const contratsData = dedupBy(
        cRaw
          .filter((r) => toNum(r['Projet - Identifiant']) !== null)
          .map((r) => ({
            import_id: imp.id,
            identifiant_projet: toNum(r['Projet - Identifiant']),
            identifiant_contact: toNum(r['Contact - Identifiant']),
            prenom: toStr(r['Assuré 1 - Prénom']),
            nom: toStr(r['Assuré 1 - Nom']),
            date_naissance: toDate(r['Assuré 1 - Date de naissance']),
            regime: toStr(r['Assuré 1 - Régime']),
            compagnie: toStr(r['Contrat - Compagnie']),
            produit: toStr(r['Contrat - Produit']),
            formule: toStr(r['Contrat - Formule']),
            date_souscription: toDate(r['Projet - Date de souscription']),
            date_effet: toDate(r["Contrat - Début d'effet"]),
            statut_projet: toStr(r['Projet - Statut']),
            prime_brute_mensuelle: toFloat(r['Contrat - Prime brute mensuelle']),
            prime_nette_mensuelle: toFloat(r['Contrat - Prime nette mensuelle']),
            prime_brute_annuelle: toFloat(r['Contrat - Prime brute annuelle']),
            prime_nette_annuelle: toFloat(r['Contrat - Prime nette annuelle']),
            frais_honoraires: toFloat(r["Contrat - Frais d'honoraires"]),
            commission_1ere_annee: toFloat(
              r["Contrat - Commissionnement 1ère année (%)"],
            ),
            commission_annees_suiv: toFloat(
              r['Contrat - Commissionnement années suivantes (%)'],
            ),
            fractionnement: toStr(r['Contrat - Fractionnement']),
            attribution: toStr(r['Projet - Attribution']),
            email: toStr(r['Contact - Email']),
            type_contrat: toStr(r['Projet - Type']) ?? 'Complémentaire santé',
            origine: toStr(r['Projet - Origine']) ?? 'MapApp Digital',
            source: toStr(r['Projet - Provenance']) ?? 'mapapp',
          })),
        'identifiant_projet',
      )

      await upsertContrats(contratsData)
      addLog(`💶 ${contratsData.length} contrats importés`, 'ok')
      setProgress(100)
      addLog(`📅 Période : ${dates[0] ?? '?'} → ${dates.at(-1) ?? '?'}`, 'ok')

      await loadHistory()
    } catch (err: unknown) {
      addLog(
        '❌ Erreur : ' + (err instanceof Error ? err.message : String(err)),
        'err',
      )
    } finally {
      setBusy(false)
      // reset l'input pour permettre de réimporter le même fichier
      e.target.value = ''
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Import CRM</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Import d'un export Excel MapApp — leads, contacts et contrats.
        </p>
      </div>

      <div
        style={{
          background: '#ecfdf5',
          color: '#065f46',
          borderRadius: 8,
          padding: '12px 16px',
          fontSize: 13,
        }}
      >
        ✅ Base de données · <strong>{fmt(counts.leads)} leads</strong> ·{' '}
        <strong>{fmt(counts.contrats)} contrats</strong>
      </div>

      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 22,
        }}
      >
        <label
          style={{
            display: 'inline-block',
            background: '#1f3a8a',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: 6,
            cursor: busy ? 'not-allowed' : 'pointer',
            fontSize: 14,
            fontWeight: 600,
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? 'Import en cours…' : '📁 Importer un fichier Excel'}
          <input
            type="file"
            accept=".xlsx,.xls"
            disabled={busy}
            onChange={(e) => {
              void onFile(e)
            }}
            style={{ display: 'none' }}
          />
        </label>

        {(busy || progress > 0) && (
          <div style={{ marginTop: 18 }}>
            <div
              style={{
                height: 6,
                background: '#f1f5f9',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: '#1f3a8a',
                  transition: 'width 0.3s',
                }}
              />
            </div>
          </div>
        )}

        {logs.length > 0 && (
          <div
            style={{
              marginTop: 16,
              background: '#0f172a',
              color: '#e2e8f0',
              padding: 14,
              borderRadius: 6,
              fontFamily: 'ui-monospace, monospace',
              fontSize: 12,
              maxHeight: 280,
              overflowY: 'auto',
            }}
          >
            {logs.map((l, i) => (
              <div
                key={i}
                style={{
                  color:
                    l.type === 'ok'
                      ? '#86efac'
                      : l.type === 'err'
                        ? '#fca5a5'
                        : '#cbd5e1',
                  padding: '2px 0',
                }}
              >
                {l.msg}
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 18,
        }}
      >
        <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>
          Historique des imports
        </h3>
        {historyError && (
          <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 8 }}>
            {historyError}
          </div>
        )}
        {imports.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: 13 }}>Aucun import.</div>
        ) : (
          <div style={{ fontSize: 12, color: '#475569' }}>
            {imports.map((imp) => {
              const d = new Date(imp.imported_at).toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
              return (
                <div
                  key={imp.id}
                  style={{
                    padding: '6px 0',
                    borderTop: '1px solid #f1f5f9',
                  }}
                >
                  {d} · <strong>{imp.filename}</strong> · {fmt(imp.nb_projets)}{' '}
                  projets · {fmt(imp.nb_contrats)} contrats
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Import
