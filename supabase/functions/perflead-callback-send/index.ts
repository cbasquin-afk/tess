// Edge Function : envoie des statuts leads vers le webhook Mapapp (n8n).
// Body : { lead_ids: string[] } — leadbyte_id (text) ou identifiant_projet
// converti en string. Deux queries .in() chunkées (pour éviter URL trop longue).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WEBHOOK_URL = 'https://mapapp.app.n8n.cloud/webhook/tessoria-callback'
const CHUNK_SIZE = 200

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CallbackResult {
  lead_id: string
  email: string | null
  statut_interne: string
  statut_mapapp: string | null
  http_status: number | null
  skipped: boolean
}

interface LeadRow {
  identifiant_projet: number | null
  leadbyte_id: string | null
  email: string | null
  statut: string | null
}

interface MappingRow {
  statut_interne: string
  statut_mapapp: string
  actif: boolean
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { lead_ids } = await req.json()
    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'lead_ids doit être un tableau non vide' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Configuration Supabase manquante' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    const idStrings = lead_ids
      .map((id: unknown) => (typeof id === 'string' ? id : String(id ?? '')))
      .filter((s: string) => s.length > 0)

    if (idStrings.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, skipped: 0, errors: 0, details: [], error: 'Aucun lead_id valide' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    const numericIds = idStrings
      .map((s: string) => Number(s))
      .filter((n: number) => Number.isFinite(n) && n > 0 && Number.isInteger(n))

    // Deux queries distinctes, chunkées. Les leads correspondant soit par
    // leadbyte_id, soit par identifiant_projet, sont collectés puis dédupliqués.
    const leadsMap = new Map<number, LeadRow>() // key = identifiant_projet

    for (const c of chunk(idStrings, CHUNK_SIZE)) {
      const { data, error } = await supabase
        .from('perflead_leads')
        .select('identifiant_projet, leadbyte_id, email, statut')
        .in('leadbyte_id', c)
      if (error) {
        return new Response(
          JSON.stringify({ error: `fetch leads (leadbyte): ${error.message}` }),
          { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
        )
      }
      for (const row of (data ?? []) as LeadRow[]) {
        if (row.identifiant_projet != null) leadsMap.set(row.identifiant_projet, row)
      }
    }

    for (const c of chunk(numericIds, CHUNK_SIZE)) {
      const { data, error } = await supabase
        .from('perflead_leads')
        .select('identifiant_projet, leadbyte_id, email, statut')
        .in('identifiant_projet', c)
      if (error) {
        return new Response(
          JSON.stringify({ error: `fetch leads (projet): ${error.message}` }),
          { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
        )
      }
      for (const row of (data ?? []) as LeadRow[]) {
        if (row.identifiant_projet != null) leadsMap.set(row.identifiant_projet, row)
      }
    }

    const leads = Array.from(leadsMap.values())

    const { data: mapData, error: eMap } = await supabase
      .from('callback_statut_map')
      .select('statut_interne, statut_mapapp, actif')
      .eq('actif', true)

    if (eMap) {
      return new Response(
        JSON.stringify({ error: `fetch mapping: ${eMap.message}` }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    const mapping = new Map<string, string>()
    for (const m of (mapData ?? []) as MappingRow[]) {
      mapping.set(m.statut_interne, m.statut_mapapp)
    }

    const conversionDate = new Date().toISOString()
    const tasks = leads.map(async (lead): Promise<CallbackResult> => {
      const leadIdStr = lead.leadbyte_id ?? String(lead.identifiant_projet ?? '')
      const statutInterne = lead.statut ?? ''
      const statutMapapp = mapping.get(statutInterne) ?? null

      if (!statutMapapp) {
        await supabase.from('callback_log').insert({
          lead_id: leadIdStr,
          email: lead.email,
          statut_envoye: '(skipped)',
          statut_interne: statutInterne,
          http_status: null,
          reponse: { reason: 'no_mapping' },
        })
        return {
          lead_id: leadIdStr,
          email: lead.email,
          statut_interne: statutInterne,
          statut_mapapp: null,
          http_status: null,
          skipped: true,
        }
      }

      const payload = {
        leadid: leadIdStr,
        email: lead.email,
        status: statutMapapp,
        conversion_date: conversionDate,
      }

      let httpStatus: number | null = null
      let reponse: unknown = null
      try {
        const res = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        httpStatus = res.status
        try {
          const txt = await res.text()
          if (txt) {
            try {
              reponse = JSON.parse(txt)
            } catch {
              reponse = { raw: txt }
            }
          }
        } catch {
          reponse = null
        }
      } catch (err) {
        httpStatus = null
        reponse = { error: err instanceof Error ? err.message : String(err) }
      }

      await supabase.from('callback_log').insert({
        lead_id: leadIdStr,
        email: lead.email,
        statut_envoye: statutMapapp,
        statut_interne: statutInterne,
        http_status: httpStatus,
        reponse,
      })

      return {
        lead_id: leadIdStr,
        email: lead.email,
        statut_interne: statutInterne,
        statut_mapapp: statutMapapp,
        http_status: httpStatus,
        skipped: false,
      }
    })

    const settled = await Promise.allSettled(tasks)
    const details: CallbackResult[] = []
    let sent = 0
    let skipped = 0
    let errors = 0
    for (const s of settled) {
      if (s.status === 'fulfilled') {
        details.push(s.value)
        if (s.value.skipped) skipped += 1
        else if (
          s.value.http_status !== null &&
          s.value.http_status >= 200 &&
          s.value.http_status < 300
        ) {
          sent += 1
        } else {
          errors += 1
        }
      } else {
        errors += 1
      }
    }

    return new Response(JSON.stringify({ sent, skipped, errors, details }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }
})
