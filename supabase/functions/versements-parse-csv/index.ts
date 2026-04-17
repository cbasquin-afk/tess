import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function normalize(s: string): string {
  return s
    .toUpperCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function parseDate(s: string | undefined): string | null {
  if (!s || !s.trim()) return null
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

function parseNum(s: string | undefined): number | null {
  if (!s || !s.trim()) return null
  const cleaned = s.trim().replace(/\s/g, '').replace(',', '.')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResp({ error: 'Method not allowed' }, 405)

  try {
    const { file_base64, file_name, compagnie_bordereau, annee, mois } = await req.json()
    if (!file_base64 || !compagnie_bordereau || !annee || !mois) {
      return jsonResp({ error: 'file_base64, compagnie_bordereau, annee, mois requis' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    // 1. Decode base64 → ISO-8859-1
    const raw = Uint8Array.from(atob(file_base64), (c) => c.charCodeAt(0))
    const text = new TextDecoder('iso-8859-1').decode(raw)

    // 2. Parse CSV (séparateur ;)
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
    if (lines.length < 2) return jsonResp({ error: 'CSV vide ou sans données' }, 400)

    const headers = lines[0].split(';').map((h) => h.trim())
    const col = (row: string[], name: string) => {
      const idx = headers.indexOf(name)
      return idx >= 0 ? row[idx] : undefined
    }

    interface ParsedLine {
      compagnie: string | null
      client_raw: string
      police_num: string | null
      produit: string | null
      periode_debut: string | null
      periode_fin: string | null
      base: number | null
      type_com: string | null
      taux_pct: number | null
      montant: number
      motif: string | null
    }

    const parsed: ParsedLine[] = []
    let totalBrut = 0

    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(';').map((c) => c.trim())
      const clientRaw = col(cells, 'Adhérent') ?? col(cells, 'Adherent') ?? ''
      if (!clientRaw) continue

      const montant = parseNum(col(cells, 'Commission')) ?? 0
      totalBrut += montant

      parsed.push({
        compagnie: col(cells, 'Compagnie') ?? null,
        client_raw: clientRaw,
        police_num: col(cells, 'Police') ?? null,
        produit: col(cells, 'Garantie Choisie') ?? null,
        periode_debut: parseDate(col(cells, "Date d'Effet") ?? col(cells, 'Date d\'Effet')),
        periode_fin: parseDate(col(cells, 'Date Etat')),
        base: parseNum(col(cells, 'Base de Comm')),
        type_com: col(cells, 'Etat Contrat') ?? null,
        taux_pct: parseNum(col(cells, 'Taux de comm en %')),
        montant,
        motif: col(cells, 'Motif Résiliation') ?? null,
      })
    }

    // 3. Insert bordereau
    const { data: bData, error: bErr } = await supabase
      .from('versements_bordereaux')
      .insert({
        source_file_name: file_name ?? null,
        source_type: 'csv',
        compagnie: compagnie_bordereau,
        annee,
        mois,
        total_brut_fichier: Math.round(totalBrut * 100) / 100,
        status: 'parsed',
        nb_lignes_total: parsed.length,
      })
      .select('id')
      .single()

    if (bErr) return jsonResp({ error: `insert bordereau: ${bErr.message}` }, 500)
    const bordereauId = bData.id as string

    // 4. Insert lignes
    const lignesPayload = parsed.map((p) => ({
      bordereau_id: bordereauId,
      compagnie: p.compagnie,
      client_raw: p.client_raw,
      police_num: p.police_num,
      produit: p.produit,
      periode_debut: p.periode_debut,
      periode_fin: p.periode_fin,
      base: p.base,
      type_com: p.type_com,
      taux_pct: p.taux_pct,
      montant: p.montant,
      motif: p.motif,
      match_status: 'non_match',
    }))

    const { error: lErr } = await supabase
      .from('versements_lignes')
      .insert(lignesPayload)

    if (lErr) return jsonResp({ error: `insert lignes: ${lErr.message}` }, 500)

    // 5. Auto-match
    // Charger les contrats actifs de cette compagnie
    const { data: contrats } = await supabase
      .from('contrats')
      .select('id, client')
      .eq('compagnie_assureur', compagnie_bordereau)
      .eq('workflow_statut', 'actif')

    interface ContratRef { id: string; client: string; normalized: string; words: string[] }
    const contratRefs: ContratRef[] = (contrats ?? []).map((c: { id: string; client: string }) => {
      const n = normalize(c.client ?? '')
      return { id: c.id, client: c.client, normalized: n, words: n.split(/[\s\-]+/).filter(Boolean) }
    })

    // Charger les lignes qu'on vient d'insérer
    const { data: lignesInserted } = await supabase
      .from('versements_lignes')
      .select('id, client_raw')
      .eq('bordereau_id', bordereauId)

    let nbMatchees = 0
    let nbAmbigues = 0
    let nbNonMatchees = 0

    for (const ligne of (lignesInserted ?? []) as { id: string; client_raw: string }[]) {
      const rawNorm = normalize(ligne.client_raw)
      const rawWords = rawNorm.split(/[\s\-]+/).filter(Boolean)

      // Stratégie 1 : match exact (tous les mots)
      const exactMatches = contratRefs.filter((c) =>
        rawWords.every((w) => c.normalized.includes(w))
      )

      if (exactMatches.length === 1) {
        await supabase.from('versements_lignes').update({
          contrat_id: exactMatches[0].id,
          match_status: 'auto',
          match_confidence_pct: 100,
        }).eq('id', ligne.id)
        nbMatchees++
        continue
      }

      if (exactMatches.length > 1) {
        await supabase.from('versements_lignes').update({
          contrat_id: exactMatches[0].id,
          match_status: 'ambigu',
          match_confidence_pct: 80,
        }).eq('id', ligne.id)
        nbAmbigues++
        continue
      }

      // Stratégie 2 : match premier mot (nom de famille)
      if (rawWords.length > 0) {
        const firstWord = rawWords[0]
        const nameMatches = contratRefs.filter((c) =>
          c.words.some((w) => w === firstWord)
        )

        if (nameMatches.length === 1) {
          await supabase.from('versements_lignes').update({
            contrat_id: nameMatches[0].id,
            match_status: 'auto',
            match_confidence_pct: 90,
          }).eq('id', ligne.id)
          nbMatchees++
          continue
        }

        if (nameMatches.length > 1) {
          await supabase.from('versements_lignes').update({
            contrat_id: nameMatches[0].id,
            match_status: 'ambigu',
            match_confidence_pct: 60,
          }).eq('id', ligne.id)
          nbAmbigues++
          continue
        }
      }

      // Stratégie 3 : aucun match
      nbNonMatchees++
    }

    // 6. Update bordereau stats
    await supabase.from('versements_bordereaux').update({
      nb_matchees: nbMatchees,
      nb_non_matchees: nbNonMatchees + nbAmbigues,
      status: 'matched',
    }).eq('id', bordereauId)

    return jsonResp({
      bordereau_id: bordereauId,
      nb_lignes: parsed.length,
      nb_matchees: nbMatchees,
      nb_ambigues: nbAmbigues,
      nb_non_matchees: nbNonMatchees,
    })
  } catch (err) {
    return jsonResp({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
