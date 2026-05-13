// ═══════════════════════════════════════════
//  BroadcastChannel — Cross-Tab Communication
//  Instant sync between Admin tab & User tab
// ═══════════════════════════════════════════

const CHANNEL_NAME = 'tradevisor-sync'

class SyncChannel {
  private channel: BroadcastChannel | null = null
  private listeners: Set<(data: any) => void> = new Set()

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(CHANNEL_NAME)
      this.channel.onmessage = (event) => {
        this.listeners.forEach(cb => cb(event.data))
      }
    }
  }

  onMessage(callback: (data: any) => void) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  post(data: any) {
    if (this.channel) {
      this.channel.postMessage(data)
    }
    // Also dispatch storage event for older browsers
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'tradevisor_sync_event',
      newValue: JSON.stringify({ ...data, timestamp: Date.now() }),
    }))
  }

  close() {
    if (this.channel) {
      this.channel.close()
    }
  }
}

export const syncChannel = typeof window !== 'undefined' ? new SyncChannel() : null

// Helper to sync pending payments to admin
export function syncPendingPayment(orderId: string, email: string, plan: string, amount: string) {
  syncChannel?.post({
    type: 'NEW_PAYMENT',
    orderId,
    email,
    plan,
    amount,
    timestamp: Date.now(),
  })
}

// Helper to sync approval to user
export function syncApproval(orderId: string, email: string, code: string) {
  syncChannel?.post({
    type: 'APPROVED',
    orderId,
    email,
    code,
    timestamp: Date.now(),
  })
}
