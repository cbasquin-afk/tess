import { useCallback, useState } from 'react'

export interface Notification {
  id: string
  title: string
  body?: string
  level: 'info' | 'success' | 'warning' | 'error'
  createdAt: string
  read: boolean
}

export function useNotifications() {
  const [items, setItems] = useState<Notification[]>([])

  const push = useCallback(
    (n: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
      setItems((prev) => [
        {
          ...n,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          read: false,
        },
        ...prev,
      ])
    },
    [],
  )

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const unreadCount = items.filter((n) => !n.read).length

  return { items, unreadCount, push, markAllRead }
}
