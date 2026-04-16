// Edge Function : envoie des statuts leads vers le webhook Mapapp (n8n).
// Body : { lead_ids: string[] } — chaque lead_id est un identifiant_projet
// (converti en string).
//
// Logique :
//   1. Récupérer les leads (identifiant_projet, email, statut)
//   2. Pour chacun : mapper statut → statut_mapapp via callback_statut_map
//   3. Si mapping : POST sur le webhook, logger dans callback_log
//   4. Sinon : skip (pas de log HTTP)

// @ts-nocheck — Deno runtime, pas de résolution TS locale
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WEBHOOK_URL = 'https://mapapp.app.n8n.cloud/webhook/tessoria-callback'

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
  email: string | null
  statut: string | null
}

interface MappingRow {
  statut_interne: string
  statut_mapapp: string
  actif: boolean
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
        {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Configuration Supabase manquante' }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        },
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    // Les lead_ids peuvent arriver en string (UI) ou number — convertir tous
    // en number pour le filtre SQL sur identifiant_projet (bigint)
    const numericIds = lead_ids
      .map((id: unknown) => Number(id))
      .filter((n) => Number.isFinite(n) && n > 0)

    if (numericIds.length === 0) {
      return new Response(
        JSON.stringify({
          sent: 0,
          skipped: 0,
          errors: 0,
          details: [],
          error: 'Aucun lead_id numérique valide',
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        },
      )
    }

    // 1. Fetch leads
    const { data: leadsData, error: eLeads } = await supabase
      .from('perflead_leads')
      .select('identifiant_projet, email, statut')
      .in('identifiant_projet', numericIds)

    if (eLeads) {
      return new Response(
        JSON.stringify({ error: `fetch leads: ${eLeads.message}` }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        },
      )
    }

    const leads = (leadsData ?? []) as LeadRow[]

    // 2. Fetch mapping
    const { data: mapData, error: eMap } = await supabase
      .from('callback_statut_map')
      .select('statut_interne, statut_mapapp, actif')
      .eq('actif', true)

    if (eMap) {
      return new Response(
        JSON.stringify({ error: `fetch mapping: ${eMap.message}` }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        },
      )
    }

    const mapping = new Map<string, string>()
    for (const m of (mapData ?? []) as MappingRow[]) {
      mapping.set(m.statut_interne, m.statut_mapapp)
    }

    // 3. Construire les payloads (avec ou sans mapping)
    const conversionDate = new Date().toISOString()
    const tasks = leads.map(async (lead): Promise<CallbackResult> => {
      const leadIdStr = String(lead.identifiant_projet ?? '')
      const statutInterne = lead.statut ?? ''
      const statutMapapp = mapping.get(statutInterne) ?? null

      // Pas de mapping → skip, log sans HTTP
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
          reponse = txt ? (() => { try { return JSON.parse(txt) } catch { return { raw: txt } } })() : null
        } catch {
          reponse = null
        }
      } catch (err) {
        httpStatus = null
        reponse = {
          error: err instanceof Error ? err.message : String(err),
        }
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
        else if (s.value.http_status !== null && s.value.http_status >= 200 && s.value.http_status < 300) {
          sent += 1
        } else {
          errors += 1
        }
      } else {
        errors += 1
      }
    }

    return new Response(
      JSON.stringify({ sent, skipped, errors, details }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      },
    )
  }
})
