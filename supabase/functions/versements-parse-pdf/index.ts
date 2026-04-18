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

interface ParsedLigne {
  client: string
  police_num: string | null
  produit: string | null
  periode_debut: string | null
  periode_fin: string | null
  base: number | null
  type_com_raw: string | null
  type_com: string | null
  taux_pct: number | null
  montant: number
  motif: string | null
}

interface ClaudeParsed {
  total_2ye?: number | null
  lignes?: ParsedLigne[]
}

function stripJsonFences(text: string): string {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (fenced) return fenced[1].trim()
  return trimmed
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
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) return jsonResp({ error: 'ANTHROPIC_API_KEY manquante' }, 500)

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    // 1. Récupérer la config compagnie
    const { data: config, error: cfgErr } = await supabase
      .schema('tadmin')
      .from('versements_config_compagnie')
      .select('compagnie, code_courtier, format, prompt_extraction')
      .eq('compagnie', compagnie_bordereau)
      .maybeSingle()

    if (cfgErr) return jsonResp({ error: `config compagnie: ${cfgErr.message}` }, 500)
    if (!config) return jsonResp({ error: `Compagnie ${compagnie_bordereau} non configurée` }, 400)
    if (config.format !== 'pdf_ia') {
      return jsonResp({ error: `Format ${config.format} — utiliser l'upload ${config.format}` }, 400)
    }
    if (!config.prompt_extraction) {
      return jsonResp({ error: `Prompt d'extraction manquant pour ${compagnie_bordereau}` }, 500)
    }

    // 2. Upload PDF dans le bucket Storage
    const pdfBytes = Uint8Array.from(atob(file_base64), (c) => c.charCodeAt(0))
    const timestamp = Date.now()
    const safeName = (file_name ?? 'bordereau.pdf').replace(/[^A-Za-z0-9._-]/g, '_')
    const storagePath = `${compagnie_bordereau}/${annee}-${String(mois).padStart(2, '0')}/${timestamp}-${safeName}`

    const { error: upErr } = await supabase.storage
      .from('versements-pdf')
      .upload(storagePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false,
      })
    if (upErr) return jsonResp({ error: `upload storage: ${upErr.message}` }, 500)

    // 3. Créer le bordereau
    const { data: bData, error: bErr } = await supabase
      .from('versements_bordereaux')
      .insert({
        source_file_name: file_name ?? null,
        source_type: 'pdf',
        compagnie: compagnie_bordereau,
        code_courtier: config.code_courtier,
        annee,
        mois,
        pdf_storage_path: storagePath,
        status: 'uploaded',
        nb_lignes_total: 0,
      })
      .select('id')
      .single()

    if (bErr) return jsonResp({ error: `insert bordereau: ${bErr.message}` }, 500)
    const bordereauId = bData.id as string

    // 4. Appel Claude API
    let claudeResp: Response
    try {
      claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 8192,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'document',
                  source: {
                    type: 'base64',
                    media_type: 'application/pdf',
                    data: file_base64,
                  },
                },
                {
                  type: 'text',
                  text: config.prompt_extraction,
                },
              ],
            },
          ],
        }),
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return jsonResp({ error: `API Claude fetch: ${msg}`, bordereau_id: bordereauId }, 502)
    }

    if (!claudeResp.ok) {
      const errBody = await claudeResp.text()
      await supabase.from('versements_bordereaux').update({
        notes: `API Claude HTTP ${claudeResp.status}: ${errBody.slice(0, 2000)}`,
      }).eq('id', bordereauId)
      return jsonResp(
        { error: `API Claude HTTP ${claudeResp.status}`, details: errBody.slice(0, 500), bordereau_id: bordereauId },
        502,
      )
    }

    const claudeJson = await claudeResp.json()
    const rawText: string = claudeJson?.content?.[0]?.text ?? ''
    const cleanedText = stripJsonFences(rawText)

    let parsed: ClaudeParsed
    try {
      parsed = JSON.parse(cleanedText)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      await supabase.from('versements_bordereaux').update({
        notes: `JSON parse error: ${msg}\n\nRaw response:\n${rawText.slice(0, 4000)}`,
      }).eq('id', bordereauId)
      return jsonResp(
        { error: `Réponse Claude non JSON: ${msg}`, bordereau_id: bordereauId },
        500,
      )
    }

    const lignes = Array.isArray(parsed.lignes) ? parsed.lignes : []

    if (lignes.length === 0) {
      await supabase.from('versements_bordereaux').update({
        status: 'parsed',
        total_brut_fichier: parsed.total_2ye ?? null,
        nb_lignes_total: 0,
        notes: 'Aucune ligne extraite — vérifier le PDF et le code courtier',
      }).eq('id', bordereauId)
      return jsonResp({
        bordereau_id: bordereauId,
        nb_lignes: 0,
        nb_matchees: 0,
        nb_ambigues: 0,
        nb_non_matchees: 0,
        total_montant: 0,
        warning: 'Aucune ligne extraite — vérifier le PDF et le code courtier',
      })
    }

    // 5. Insert lignes
    let totalBrut = 0
    const lignesPayload = lignes.map((l) => {
      const montant = Number(l.montant) || 0
      totalBrut += montant
      return {
        bordereau_id: bordereauId,
        compagnie: compagnie_bordereau,
        client_raw: String(l.client ?? ''),
        police_num: l.police_num ?? null,
        produit: l.produit ?? null,
        periode_debut: l.periode_debut ?? null,
        periode_fin: l.periode_fin ?? null,
        base: l.base != null ? Number(l.base) : null,
        type_com: l.type_com ?? l.type_com_raw ?? null,
        taux_pct: l.taux_pct != null ? Number(l.taux_pct) : null,
        montant,
        motif: l.motif ?? null,
        match_status: 'non_match',
      }
    })

    const { error: lErr } = await supabase
      .from('versements_lignes')
      .insert(lignesPayload)
    if (lErr) return jsonResp({ error: `insert lignes: ${lErr.message}`, bordereau_id: bordereauId }, 500)

    // 6. Update bordereau totals
    await supabase.from('versements_bordereaux').update({
      total_brut_fichier: Math.round((parsed.total_2ye ?? totalBrut) * 100) / 100,
      nb_lignes_total: lignes.length,
      status: 'parsed',
    }).eq('id', bordereauId)

    // 7. Auto-match (même logique que versements-parse-csv)
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

      const exactMatches = contratRefs.filter((c) =>
        rawWords.every((w) => c.normalized.includes(w)),
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

      if (rawWords.length > 0) {
        const firstWord = rawWords[0]
        const nameMatches = contratRefs.filter((c) =>
          c.words.some((w) => w === firstWord),
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

      nbNonMatchees++
    }

    // 8. Update bordereau match stats
    await supabase.from('versements_bordereaux').update({
      nb_matchees: nbMatchees,
      nb_non_matchees: nbNonMatchees + nbAmbigues,
      status: 'matched',
    }).eq('id', bordereauId)

    return jsonResp({
      bordereau_id: bordereauId,
      nb_lignes: lignes.length,
      nb_matchees: nbMatchees,
      nb_ambigues: nbAmbigues,
      nb_non_matchees: nbNonMatchees,
      total_montant: parsed.total_2ye ?? totalBrut,
    })
  } catch (err) {
    return jsonResp({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
