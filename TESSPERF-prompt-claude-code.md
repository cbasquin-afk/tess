# Prompt Claude Code — Module TessPerf (front)

> À coller dans Claude Code (terminal) à la racine `/Users/chrisb/tess/`.
> Backend complet (12 objets SQL) déjà déployé en DB Supabase.

---

## 🎯 Objectif

Créer le module **TessPerf** (`/tessperf`) : dashboard de pilotage de la performance commerciale à destination des commerciaux productifs (Cheyenne, Charlotte) et des admins (Christopher/fondateur).

**Principe** : pilotage basé sur le taux de conversion et les ratios qualité, **sans notion de marge** (le système de pioche sur Mapapp brouille la marge, donc exclu volontairement).

**Référence UX** : s'inspire fortement des TDB individuels du Sheet `SUIVI_MARGE_BRUTE` (onglets `TDB Charlotte`, `TDB Cheyenne`) mais en version vivante, projection dynamique, avec drill-down semaine/jour.

---

## 📐 Architecture & routes

### Module

```
src/modules/tessperf/
├── types.ts                    # Types TypeScript des vues
├── api.ts                      # Fetch Supabase (12 vues, voir §Backend)
├── index.tsx                   # Router interne du module
├── hooks/
│   ├── useMonthlyEquipe.ts
│   ├── useMonthlyCommercial.ts
│   ├── useWeeklyData.ts
│   └── useDailyDrilldown.ts
├── views/
│   ├── DashboardEquipe.tsx     # Route `/tessperf`
│   └── DashboardCommercial.tsx # Route `/tessperf/commercial/:id`
└── components/
    ├── KpiCard.tsx             # Carte KPI générique avec feu tricolore
    ├── ObjectifProgress.tsx    # Jauge CA vs objectif
    ├── TauxConversionGauge.tsx
    ├── VentilationDonut.tsx    # Ventilation par source/produit
    ├── RatioQualite.tsx        # Frais service / Multi-équip / Avis
    ├── SidecarMetric.tsx       # Instances / Rétractations (observationnel)
    ├── WeekDrilldown.tsx       # Tableau semaine avec expand jour
    ├── CommercialSelector.tsx  # Tabs Charlotte / Cheyenne / équipe
    └── PeriodSwitch.tsx        # Mois / Semaine
```

### Routes

| Route | Vue | Accès |
|---|---|---|
| `/tessperf` | Dashboard équipe | admin (`role='admin'` ou `'superadmin'`) |
| `/tessperf/commercial/:id` | Dashboard individuel | admin OU commercial dont `id` correspond à son `commercial_id` |

### Logique de routing au login

Dans `/tessperf` (entrée par défaut), redirection conditionnelle :

```ts
// Au montage de /tessperf
1. Récupérer le user connecté (auth.user.email)
2. SELECT commercial_id, statut FROM perf_v_commerciaux 
   WHERE email = auth.user.email
3. Si commercial.statut = 'actif_productif' → redirect /tessperf/commercial/{commercial_id}
4. Sinon (admin non-productif comme Basquin) → rester sur /tessperf (vue équipe)
```

Le commercial productif a quand même un lien "Vue équipe" visible dans le menu du module s'il est admin (Cheyenne et Charlotte sont admin en plus d'être productives).

### Déclaration module

Ajouter dans `src/shell/modules.config.ts` :

```ts
{
  id: 'tessperf',
  label: 'TessPerf',
  path: '/tessperf',
  icon: 'TrendingUp',  // lucide
  minRole: 'commercial',  // accessible tous authentifiés, filtrage fin dans le module
  order: 25,
}
```

Ajouter l'entrée dans `src/shell/Sidebar.tsx` au bon endroit (après PerfLead, avant TessFinances).

---

## 🗄️ Backend (déjà déployé)

Les vues sont **toutes dans `public.*`** donc accessibles via `supabase-js`.

### Vues principales

| Vue | Usage front |
|---|---|
| `tessperf_v_monthly_equipe` | Synthèse équipe mois (1 ligne par mois) |
| `tessperf_v_monthly_kpis` | KPIs par commercial × mois |
| `tessperf_v_weekly_kpis` | KPIs par commercial × semaine |
| `tessperf_v_leads_daily` | Leads par jour (drill-down) |
| `tessperf_v_contrats_daily` | Contrats signés par jour (drill-down) |
| `tessperf_v_instances_daily` | Instances sidecar par jour |
| `tessperf_v_retractations_daily` | Rétractations par jour |
| `tessperf_v_ca_encaisse_mensuel` | CA encaissé calendaire (complément) |
| `perf_v_commerciaux` | Liste commerciaux avec `statut` |
| `perf_parametres` | Config (panier_moyen_cible=315, taux_transfo=0.13, coef=1.10) |

### Schéma TypeScript attendu (à générer dans `types.ts`)

```ts
export type CommercialStatut = 'actif_productif' | 'actif_non_productif' | 'suspendu' | 'archive';

export interface Commercial {
  id: string;
  prenom: string;
  email: string | null;
  statut: CommercialStatut;
  productif: boolean;
}

export interface PerfParametres {
  panier_moyen_cible: number;           // 315
  taux_transfo_mapapp_cible: number;    // 0.13
  coef_ambition: number;                // 1.10
  ratio_frais_service_cible: number;    // 0.3333
  ratio_multi_equip_cible: number;      // 0.20
  objectif_avis_mensuel: number;        // 5
  panier_moyen_repere: number;          // 100
  ca_par_contrat_repere: number;        // 300
}

export interface MonthlyEquipe {
  annee: number;
  mois: number;
  mois_libelle: string;                 // '2026-04'
  premier_jour: string;
  dernier_jour: string;
  jours_ouvres_total: number;
  jours_ouvres_ecoules: number;
  mois_passe: boolean;
  mois_en_cours: boolean;
  nb_leads_total_mapapp: number;
  nb_leads_productifs: number;
  nb_decroches_productifs: number;
  nb_signes_productifs: number;
  nb_mutuelles_productifs: number;
  nb_multi_equip_productifs: number;
  nb_frais_service_productifs: number;
  ca_acquisition_productifs: number;
  ca_projete_productifs: number;
  nb_instances_productifs: number;
  nb_retractations_productifs: number;
  // KPIs calculés
  taux_conversion_productifs_pct: number;
  ratio_frais_service_realise: number;
  ratio_frais_service_cible: number;
  ratio_multi_equip_realise: number;
  ratio_multi_equip_cible: number;
  objectif_ca_a_date: number;
  nb_leads_projete_fin_mois: number;
  objectif_ca_projete_fin_mois: number;
  pct_objectif_a_date: number;
}

export interface MonthlyKpis {
  annee: number;
  mois: number;
  mois_libelle: string;
  commercial_id: string;
  commercial_prenom: string;
  commercial_statut: CommercialStatut;
  jours_ouvres_total: number;
  jours_ouvres_ecoules: number;
  mois_passe: boolean;
  mois_en_cours: boolean;
  // Volumes
  nb_leads_recus: number;
  nb_decroches: number;
  nb_contrats_signes: number;
  // Ventilation par source
  nb_contrats_mapapp: number;
  nb_contrats_reco: number;
  nb_contrats_multi_equip: number;
  nb_contrats_site: number;
  nb_contrats_bo: number;
  // Ventilation par produit
  nb_contrats_mutuelle: number;
  nb_contrats_obseques: number;
  nb_contrats_prevoyance: number;
  nb_contrats_emprunteur: number;
  nb_contrats_animal: number;
  nb_contrats_autre: number;
  // Qualité
  nb_frais_service: number;
  total_frais_service: number;
  ratio_frais_service_realise: number;
  ratio_multi_equip_realise: number;
  // CA
  ca_acquisition: number;
  ca_total_societe: number;
  panier_moyen_cotisation: number;
  ca_moyen_par_contrat: number;
  // Projections
  ca_projete_fin_mois: number;
  nb_contrats_projete: number;
  // Taux principal
  taux_conversion_pct: number;
  // Sidecars
  nb_instances_creees: number;
  nb_retractations: number;
  taux_instance_pct: number;
  taux_retractation_pct: number;
}

export interface WeeklyKpis {
  semaine_debut: string;
  semaine_fin: string;
  commercial_id: string | null;
  commercial_prenom: string | null;
  commercial_statut: CommercialStatut | null;
  nb_leads_recus: number;
  nb_decroches: number;
  nb_contrats_signes: number;
  nb_mutuelles: number;
  nb_multi_equip: number;
  nb_frais_service: number;
  ca_acquisition: number;
  taux_conversion_pct: number;
}

export interface LeadsDaily {
  jour: string;
  commercial_id: string | null;
  attribution_brute: string;
  categorie: string | null;
  nb_leads: number;
  nb_decroches: number;
  nb_signes_crm: number;
  nb_perdus: number;
  nb_en_cours: number;
}

export interface ContratsDaily {
  jour: string;
  commercial_id: string | null;
  commercial_prenom: string | null;
  source: string;         // mapapp|site|back_office|recommandation|multi_equipement
  type_produit: string;   // mutuelle|obseques|prevoyance|emprunteur|animal|frontalier|autre
  nb_contrats: number;
  cotisation_totale: number;
  frais_service_total: number;
  nb_avec_frais_service: number;
  ca_acquisition_societe: number;
  ca_total_societe: number;
  ca_total_mandataire: number;
}
```

### API (`src/modules/tessperf/api.ts`)

```ts
import { supabase } from '@/lib/supabase';

export async function fetchMonthlyEquipe(annee: number, mois: number) {
  const { data, error } = await supabase
    .from('tessperf_v_monthly_equipe')
    .select('*')
    .eq('annee', annee)
    .eq('mois', mois)
    .single();
  if (error) throw error;
  return data as MonthlyEquipe;
}

export async function fetchMonthlyKpisByCommercial(commercial_id: string, annee: number, mois: number) {
  const { data, error } = await supabase
    .from('tessperf_v_monthly_kpis')
    .select('*')
    .eq('commercial_id', commercial_id)
    .eq('annee', annee)
    .eq('mois', mois)
    .single();
  if (error) throw error;
  return data as MonthlyKpis;
}

export async function fetchWeeklyKpisByCommercial(
  commercial_id: string, 
  debut: string, 
  fin: string
) { /* .gte('semaine_debut', debut).lte('semaine_debut', fin) */ }

export async function fetchContratsDaily(
  commercial_id: string | null,  // null = toute l'équipe
  jour_debut: string, 
  jour_fin: string
) { /* ... */ }

export async function fetchLeadsDaily(
  commercial_id: string | null,
  jour_debut: string, 
  jour_fin: string
) { /* ... */ }

export async function fetchParametres() {
  const { data } = await supabase.from('perf_parametres').select('*').single();
  return data as PerfParametres;
}

export async function fetchCommerciauxProductifs() {
  const { data } = await supabase
    .from('perf_v_commerciaux')
    .select('*')
    .in('statut', ['actif_productif']);
  return data as Commercial[];
}

export async function fetchCurrentUserCommercial(email: string) {
  const { data } = await supabase
    .from('perf_v_commerciaux')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  return data as Commercial | null;
}
```

---

## 🎨 UX des écrans

### Écran 1 — Dashboard équipe (`/tessperf`)

**Header**
- Titre "TessPerf · Équipe Tessoria"
- Sélecteur de mois (par défaut mois en cours)
- Switch "Mois" / "Semaine" à droite

**Zone 1 — Objectif CA (pleine largeur, prioritaire)**

Carte avec :
- **Big number** : CA acquisition productifs (ex: `14 690 €`)
- **Progress bar** : CA réalisé / objectif à date
- **Annotation** : `42,7% de l'objectif à date (34 369 €)`
- **Projection fin de mois** : `projection 27 216 € / objectif 34 369 €`
- Feu tricolore sur la couleur de la barre :
  - 🟢 Vert si `pct_objectif_a_date ≥ 85%`
  - 🟠 Orange si `50% ≤ pct < 85%`
  - 🔴 Rouge si `pct < 50%`
- Texte discret "Calculé sur 763 leads Mapapp × 13% × 315€ × 1.10"

**Zone 2 — Volume & Conversion (3 colonnes égales)**

Card 1 — **Leads reçus**
- `nb_leads_total_mapapp`
- Sous-titre : `dont X productifs / Y pioche`
- Micro trend : compare vs mois précédent

Card 2 — **Décrochés**
- `nb_decroches_productifs`
- Sous-titre : `X% des leads productifs décrochés`

Card 3 — **Taux de conversion**
- `taux_conversion_productifs_pct`
- Sous-titre : `X signés / Y décrochés`
- Comparaison cible 13% avec feu tricolore

**Zone 3 — Ventilation contrats signés (2 colonnes)**

**Par source** (donut) :
- Mapapp, Site, Back-office, Recommandation, Multi-équipement
- Légende avec nb et %

**Par produit** (donut) :
- Mutuelle, Obsèques, Prévoyance, Emprunteur, Animal, Autre
- Mutuelle largement majoritaire, ça doit se voir

**Zone 4 — Qualité (3 colonnes)**

Card 1 — **Frais de service**
- Ratio réalisé : `5/33 mutuelles = 15%`
- Cible : `33% (1/3)`
- Feu tricolore + barre de progression
- Total € : `59,70 €`

Card 2 — **Multi-équipement**
- Ratio réalisé : `2/33 mutuelles = 6%`
- Cible : `20% (1/5)`
- Feu tricolore

Card 3 — **Avis 5★**
- `0/5` obtenus (pas encore de source data → affiche "Saisie manuelle à venir" en placeholder)

**Zone 5 — Sidecars observationnels (2 colonnes)**

Card 1 — **Instances**
- `nb_instances_creees`
- Taux : `taux_instance_pct`
- Note : "Observationnel, pas de pénalité"

Card 2 — **Rétractations**
- `nb_retractations`
- Taux : `taux_retractation_pct`
- Note : "Parmi les signatures du mois"

**Footer — Détail par commercial**

Tableau condensé avec une ligne par commercial productif :

| Commercial | Leads | Décrochés | Signés | Taux conv | CA | Projection | Mutuelles | Multi-éq | Frais |
|---|---|---|---|---|---|---|---|---|---|
| Cheyenne | 208 | 163 | 34 | 20.9% | 7 049 € | 7 049 € | 33 | 0 | 5 |
| Charlotte | 252 | 210 | 33 | 15.7% | 7 641 € | 7 641 € | 31 | 2 | 0 |

Clic sur une ligne → navigation vers `/tessperf/commercial/:id`.

### Écran 2 — Dashboard commercial individuel (`/tessperf/commercial/:id`)

**Header**
- "TessPerf · Cheyenne" (ou son prénom)
- Breadcrumb `< Équipe` si admin
- Switch "Mois" / "Semaine"
- Sélecteur de mois

**Même structure que dashboard équipe** mais filtré sur `commercial_id`, avec en plus :

**Zone "Points de repère"** (nouvelle)
- Panier moyen cotisation (ex: 84 €) vs repère 100 €
- CA moyen par contrat (ex: 207 €) vs repère 300 €
- Simple affichage, pas de feu tricolore (ce sont des repères pas des cibles)

**Zone "Semaine en cours"** (switch "Semaine")

Affiche la semaine courante + drill-down journalier.

```
Semaine du 20 avril au 26 avril 2026

┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│ Lun │ Mar │ Mer │ Jeu │ Ven │ Sam │ Dim │
│ 20  │ 21  │ 22  │ 23  │ 24  │ 25  │ 26  │
├─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ 12  │ 15  │  8  │  -  │  -  │  -  │  -  │  ← nb décrochés
│  3  │  4  │  2  │  -  │  -  │  -  │  -  │  ← nb signés
│ 690€│ 820€│ 410€│  -  │  -  │  -  │  -  │  ← CA
└─────┴─────┴─────┴─────┴─────┴─────┴─────┘

Total semaine : 35 décrochés · 9 signés · 1 920 €
Tendance vs S-1 : +15% décrochés, -10% signés, +5% CA
```

Clic sur un jour → drawer latéral avec détail des contrats signés ce jour-là (lecture `tessperf_v_contrats_daily`).

---

## 🎨 Design system

Respecter **scrupuleusement** le design existant de l'app :

- Pas de librairie graphique exotique. Recharts est déjà installé — l'utiliser pour donuts et courbes.
- Tailwind only
- Composants shadcn/ui présents (Card, Button, Select, Tabs, Table) → **utiliser**
- Icônes : `lucide-react`
- Couleurs feux tricolores :
  - Vert : `text-emerald-600` / `bg-emerald-50` / border `emerald-200`
  - Orange : `text-amber-600` / `bg-amber-50` / border `amber-200`
  - Rouge : `text-red-600` / `bg-red-50` / border `red-200`
  - Neutre / info : `text-slate-600`
- Format monétaire FR : `14 690 €` (espace millier, pas de décimales pour les gros montants)
- Format pourcentage : `42,7 %` (virgule, espace avant %)
- Format nombre : `1 234` (espace millier)

Helper à ajouter dans `src/modules/tessperf/utils/format.ts` :

```ts
export const fmtEUR = (n: number) => 
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export const fmtPct = (n: number, decimals = 1) => 
  `${n.toFixed(decimals).replace('.', ',')} %`;

export const fmtInt = (n: number) => 
  new Intl.NumberFormat('fr-FR').format(n);

export const feuTricolore = (realise: number, cible: number): 'vert' | 'orange' | 'rouge' => {
  const ratio = cible === 0 ? 0 : realise / cible;
  if (ratio >= 0.85) return 'vert';
  if (ratio >= 0.50) return 'orange';
  return 'rouge';
};
```

---

## ✅ Checklist de livraison

- [ ] Dossier `src/modules/tessperf/` créé avec arborescence décrite
- [ ] Module déclaré dans `modules.config.ts` et `Sidebar.tsx`
- [ ] `types.ts` complet avec les types ci-dessus
- [ ] `api.ts` avec au minimum les 7 fonctions listées
- [ ] Dashboard équipe fonctionnel avec les 5 zones UX
- [ ] Dashboard commercial fonctionnel avec drill-down semaine
- [ ] Auth logic : commercial productif redirigé vers sa vue au login
- [ ] Formatage FR (€, %, milliers)
- [ ] Feux tricolores appliqués sur jauge CA, taux conv, ratios qualité
- [ ] Accessible depuis `/tessperf` au menu latéral
- [ ] Zéro erreur TypeScript, zéro warning console

## ⚠️ À ne PAS faire

- **Pas de notion de marge** : aucune mention, aucun calcul de coût de lead, de charges, de marge nette. Performance pure.
- **Pas de suivi avis 5★ automatique** : placeholder "Saisie manuelle à venir" dans l'UI
- **Pas d'alertes / notifications** : pas dans le MVP
- **Pas d'objectifs personnalisés par commercial** : pour l'instant tout le monde hérite de `perf_parametres`
- **Ne pas créer de tables ou vues DB** : le backend est posé, ne pas y toucher
- **Ne pas utiliser de lib graphique externe** : Recharts suffit, déjà installé
- **Pas d'export PDF/Excel** : à prévoir en v2
- **Pas de comparaison inter-commerciaux** : respecter l'individuel, pas de "leaderboard"

---

## 📊 Données de référence pour les tests

Pour valider que les chiffres affichés sont corrects, voici les valeurs attendues en mars 2026 :

**Équipe mars 2026**
- 763 leads Mapapp total
- 67 signés productifs (Cheyenne + Charlotte)
- 17,96 % taux conversion équipe productifs
- 14 690 € CA acquisition productifs
- 34 369 € objectif CA à date
- 42,7 % d'objectif atteint

**Cheyenne mars 2026**
- 208 leads, 163 décrochés, 34 signés → 20,86 % taux conv
- 7 049 € CA acquisition
- 33 mutuelles, 0 multi-équipement
- 5 frais de service → ratio 15,15 % vs cible 33 %
- Panier moyen 84 €

**Charlotte mars 2026**
- 252 leads, 210 décrochés, 33 signés → 15,71 % taux conv
- 7 641 € CA acquisition
- 31 mutuelles, 2 multi-équipement (ratio 6,45 %)
- 0 frais de service → ratio 0 %
- Panier moyen 105 €
- 4 rétractations → taux rétractation 10,81 %

**Avril 2026 (mois en cours, 16/22 jours)**
- 235 leads total à date
- 30 signés productifs
- 7 716 € CA réalisé
- 10 586 € objectif à date → 72,9 % (bon rythme 🟠)
- Projection 10 610 € CA fin de mois
- Objectif projeté 14 550 € → 73 % (stable sur l'ambition)

---

## 🚀 Commandes de démarrage

```bash
cd /Users/chrisb/tess/
git checkout -b feat/tessperf-front
# Développer ici
npm run dev
# Tester sur http://localhost:5173/tessperf
git add src/modules/tessperf src/shell/modules.config.ts src/shell/Sidebar.tsx
git commit -m "feat(tessperf): module de pilotage performance commerciale"
```

---

*Prompt généré le 21 avril 2026 — Backend TessPerf v1.0 déjà en DB Supabase.*
