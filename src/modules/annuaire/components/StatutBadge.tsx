import { Badge } from '@/shared/ui'
import type { StatutPage } from '../types'

const TONES: Record<StatutPage, 'success' | 'warning' | 'neutral'> = {
  publiee: 'success',
  brouillon: 'warning',
  archivee: 'neutral',
}
const LABELS: Record<StatutPage, string> = {
  publiee: 'Publiée',
  brouillon: 'Brouillon',
  archivee: 'Archivée',
}

export function StatutBadge({ value }: { value: StatutPage }) {
  return <Badge tone={TONES[value] ?? 'neutral'}>{LABELS[value] ?? value}</Badge>
}
