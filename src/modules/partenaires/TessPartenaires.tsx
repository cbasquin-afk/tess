import { useState } from 'react'
import { usePartenaires } from './hooks/usePartenaires'
import { TabCompagnies } from './components/TabCompagnies'
import { TabOffres } from './components/TabOffres'
import { TabProtocoles } from './components/TabProtocoles'
import { TabReprises } from './components/TabReprises'
import { TabSimulateur } from './components/TabSimulateur'

const TABS = [
  { id: 'compagnies', label: 'Compagnies' },
  { id: 'offres', label: 'Offres & Rému' },
  { id: 'protocoles', label: 'Protocoles' },
  { id: 'reprises', label: 'Conditions reprise' },
  { id: 'simulateur', label: 'Simulateur' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function TessPartenaires() {
  const [activeTab, setActiveTab] = useState<TabId>('compagnies')
  const { compagnies, offres, protocoles, reprises, loading, error, reload } = usePartenaires()

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
        Partenaires & Commissions
      </h1>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>
        Conventions de partenariat, barèmes de rémunération et conditions de reprise.
      </p>

      <div
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: '2px solid #e5e7eb',
          marginBottom: 24,
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? '#1f3a8a' : '#6b7280',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #1f3a8a' : '2px solid transparent',
              marginBottom: -2,
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ padding: 32, color: '#6b7280', fontSize: 14 }}>
          Chargement des données partenaires…
        </div>
      )}

      {error && (
        <div
          style={{
            padding: 16,
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: 8,
            fontSize: 14,
          }}
        >
          Erreur : {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {activeTab === 'compagnies' && <TabCompagnies compagnies={compagnies} offres={offres} />}
          {activeTab === 'offres' && <TabOffres compagnies={compagnies} offres={offres} onReload={reload} />}
          {activeTab === 'protocoles' && <TabProtocoles compagnies={compagnies} protocoles={protocoles} />}
          {activeTab === 'reprises' && <TabReprises compagnies={compagnies} reprises={reprises} />}
          {activeTab === 'simulateur' && <TabSimulateur compagnies={compagnies} offres={offres} />}
        </>
      )}
    </div>
  )
}
