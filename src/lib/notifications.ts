// ═══════════════════════════════════════════
//  In-App Notification System (No Email Required)
// ═══════════════════════════════════════════

const NOTIFS_KEY = 'tradevisor_admin_notifications'

export interface AdminNotification {
  id: string
  type: 'PAYMENT' | 'APPROVAL' | 'REJECTION' | 'DELETE' | 'SYSTEM'
  title: string
  message: string
  orderId?: string
  email?: string
  read: boolean
  createdAt: string
}

export function addNotification(notif: Omit<AdminNotification, 'id' | 'read' | 'createdAt'>) {
  const notifs: AdminNotification[] = JSON.parse(localStorage.getItem(NOTIFS_KEY) || '[]')
  notifs.push({
    ...notif,
    id: `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    read: false,
    createdAt: new Date().toISOString(),
  })
  localStorage.setItem(NOTIFS_KEY, JSON.stringify(notifs))
  // Dispatch event for real-time updates
  window.dispatchEvent(new StorageEvent('storage', { key: NOTIFS_KEY }))
  return true
}

export function getNotifications(): AdminNotification[] {
  return JSON.parse(localStorage.getItem(NOTIFS_KEY) || '[]')
}

export function getUnreadCount(): number {
  return getNotifications().filter(n => !n.read).length
}

export function markAsRead(id: string) {
  const notifs = getNotifications()
  const idx = notifs.findIndex(n => n.id === id)
  if (idx >= 0) {
    notifs[idx].read = true
    localStorage.setItem(NOTIFS_KEY, JSON.stringify(notifs))
  }
}

export function markAllAsRead() {
  const notifs = getNotifications().map(n => ({ ...n, read: true }))
  localStorage.setItem(NOTIFS_KEY, JSON.stringify(notifs))
}

export function clearAllNotifications() {
  localStorage.removeItem(NOTIFS_KEY)
}

// Open email client as fallback
export function openEmailClient(to: string, subject: string, body: string) {
  const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  window.open(mailto, '_blank')
}
