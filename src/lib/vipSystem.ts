// ═══════════════════════════════════════════
//  VIP Subscription System — Complete
// ═══════════════════════════════════════════

export interface Subscriber {
  id: string
  orderId: string
  email: string
  code: string
  plan: string
  amount: string
  txId: string
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED'
  startDate: string
  endDate: string
}

const CODES_KEY = 'tv_codes_v3'
const MONTHLY_CODES_KEY = 'tv_monthly_codes_v1'
const VIP_YEARLY_CODES_KEY = 'tv_vip_yearly_codes_v1'
const SUBS_KEY = 'tv_subscribers_v3'
const LOGINS_KEY = 'tradevisor_user_logins'
const PENDING_KEY = 'tradevisor_pending_users'

// ─── Helpers ───
function generateUUID(): string {
  return 'sub_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
}

function generateCodes(count: number): string[] {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    let code = ''
    for (let j = 0; j < 8; j++) code += chars.charAt(Math.floor(Math.random() * chars.length))
    codes.push(code)
  }
  return codes
}

// ─── Codes ───
export function initCodes(): Array<{ code: string; used: boolean; assignedTo: string | null }> {
  const existing = localStorage.getItem(CODES_KEY)
  if (existing) {
    try {
      return JSON.parse(existing)
    } catch {
      const newCodes = generateCodes(100).map(code => ({ code, used: false, assignedTo: null as string | null }))
      localStorage.setItem(CODES_KEY, JSON.stringify(newCodes))
      return newCodes
    }
  }
  const newCodes = generateCodes(100).map(code => ({ code, used: false, assignedTo: null as string | null }))
  localStorage.setItem(CODES_KEY, JSON.stringify(newCodes))
  return newCodes
}

export function getAvailableCode(): string | null {
  const codes = initCodes()
  const available = codes.find(c => !c.used)
  return available ? available.code : null
}

export function assignCode(code: string, email: string) {
  const codes = initCodes()
  const idx = codes.findIndex(c => c.code === code)
  if (idx >= 0) {
    codes[idx].used = true
    codes[idx].assignedTo = email
    localStorage.setItem(CODES_KEY, JSON.stringify(codes))
  }
}

// ─── Monthly Subscription Codes (100 codes) ───
export function initMonthlyCodes(): Array<{ code: string; used: boolean; assignedTo: string | null }> {
  const existing = localStorage.getItem(MONTHLY_CODES_KEY)
  if (existing) {
    try { return JSON.parse(existing) } catch { /* regenerate */ }
  }
  const newCodes = generateCodes(100).map(code => ({ code, used: false, assignedTo: null as string | null }))
  localStorage.setItem(MONTHLY_CODES_KEY, JSON.stringify(newCodes))
  return newCodes
}

export function getAvailableMonthlyCode(): string | null {
  const codes = initMonthlyCodes()
  const available = codes.find(c => !c.used)
  return available ? available.code : null
}

export function assignMonthlyCode(code: string, email: string) {
  const codes = initMonthlyCodes()
  const idx = codes.findIndex(c => c.code === code)
  if (idx >= 0) {
    codes[idx].used = true
    codes[idx].assignedTo = email
    localStorage.setItem(MONTHLY_CODES_KEY, JSON.stringify(codes))
  }
}

export function freeMonthlyCode(code: string) {
  const codes = initMonthlyCodes()
  const idx = codes.findIndex(c => c.code === code)
  if (idx >= 0) {
    codes[idx].used = false
    codes[idx].assignedTo = null
    localStorage.setItem(MONTHLY_CODES_KEY, JSON.stringify(codes))
  }
}

export function replaceAllMonthlyCodes(count: number = 100): Array<{ code: string; used: boolean; assignedTo: string | null }> {
  localStorage.removeItem(MONTHLY_CODES_KEY)
  const newCodes = generateCodes(count).map(code => ({ code, used: false, assignedTo: null as string | null }))
  localStorage.setItem(MONTHLY_CODES_KEY, JSON.stringify(newCodes))
  return newCodes
}

export function freeCode(code: string) {
  const codes = initCodes()
  const idx = codes.findIndex(c => c.code === code)
  if (idx >= 0) {
    codes[idx].used = false
    codes[idx].assignedTo = null
    localStorage.setItem(CODES_KEY, JSON.stringify(codes))
  }
}

// ─── Yearly VIP Subscription Codes (100 codes) ───
export function initYearlyCodes(): Array<{ code: string; used: boolean; assignedTo: string | null }> {
  const existing = localStorage.getItem(VIP_YEARLY_CODES_KEY)
  if (existing) {
    try { return JSON.parse(existing) } catch { /* regenerate */ }
  }
  const newCodes = generateCodes(100).map(code => ({ code, used: false, assignedTo: null as string | null }))
  localStorage.setItem(VIP_YEARLY_CODES_KEY, JSON.stringify(newCodes))
  return newCodes
}

export function getAvailableYearlyCode(): string | null {
  const codes = initYearlyCodes()
  const available = codes.find(c => !c.used)
  return available ? available.code : null
}

export function assignYearlyCode(code: string, email: string) {
  const codes = initYearlyCodes()
  const idx = codes.findIndex(c => c.code === code)
  if (idx >= 0) {
    codes[idx].used = true
    codes[idx].assignedTo = email
    localStorage.setItem(VIP_YEARLY_CODES_KEY, JSON.stringify(codes))
  }
}

export function freeYearlyCode(code: string) {
  const codes = initYearlyCodes()
  const idx = codes.findIndex(c => c.code === code)
  if (idx >= 0) {
    codes[idx].used = false
    codes[idx].assignedTo = null
    localStorage.setItem(VIP_YEARLY_CODES_KEY, JSON.stringify(codes))
  }
}

export function replaceAllYearlyCodes(count: number = 100): Array<{ code: string; used: boolean; assignedTo: string | null }> {
  localStorage.removeItem(VIP_YEARLY_CODES_KEY)
  const newCodes = generateCodes(count).map(code => ({ code, used: false, assignedTo: null as string | null }))
  localStorage.setItem(VIP_YEARLY_CODES_KEY, JSON.stringify(newCodes))
  return newCodes
}

// ─── Subscribers ───
export function addSubscriber(data: {
  orderId: string
  email: string
  code: string
  plan: string
  amount: string
  txId: string
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED'
}): Subscriber {
  const subs: Subscriber[] = JSON.parse(localStorage.getItem(SUBS_KEY) || '[]')

  const isYearly = data.plan.toLowerCase().includes('year')
  const start = new Date()
  const end = new Date()
  end.setMonth(start.getMonth() + (isYearly ? 12 : 1))

  const sub: Subscriber = {
    id: generateUUID(),
    orderId: data.orderId,
    email: data.email,
    code: data.code,
    plan: data.plan,
    amount: data.amount,
    txId: data.txId,
    status: data.status,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  }

  subs.push(sub)
  localStorage.setItem(SUBS_KEY, JSON.stringify(subs))
  return sub
}

export function getSubscribers(): Subscriber[] {
  const raw = localStorage.getItem(SUBS_KEY)
  if (!raw) return []
  try {
    const subs: Subscriber[] = JSON.parse(raw)
    const now = new Date().getTime()
    // Auto-mark expired
    let changed = false
    subs.forEach(s => {
      if (s.status === 'ACTIVE' && new Date(s.endDate).getTime() < now) {
        s.status = 'EXPIRED'
        changed = true
      }
    })
    if (changed) localStorage.setItem(SUBS_KEY, JSON.stringify(subs))
    return subs
  } catch {
    return []
  }
}

export function checkSubscriberAccess(email: string, code: string): boolean {
  const subs = getSubscribers()
  const sub = subs.find(s => s.email === email && s.code === code)
  if (!sub) return false
  if (sub.status === 'REVOKED') return false
  const now = new Date().getTime()
  if (new Date(sub.endDate).getTime() < now) return false
  return true
}

export function revokeSubscriber(subId: string) {
  const subs = getSubscribers()
  const idx = subs.findIndex(s => s.id === subId)
  if (idx >= 0) {
    subs[idx].status = 'REVOKED'
    localStorage.setItem(SUBS_KEY, JSON.stringify(subs))
  }
}

export function reactivateSubscriber(subId: string) {
  const subs = getSubscribers()
  const idx = subs.findIndex(s => s.id === subId)
  if (idx >= 0) {
    subs[idx].status = 'ACTIVE'
    localStorage.setItem(SUBS_KEY, JSON.stringify(subs))
  }
}

export function renewSubscriber(subId: string) {
  const subs = getSubscribers()
  const idx = subs.findIndex(s => s.id === subId)
  if (idx >= 0) {
    const sub = subs[idx]
    const isYearly = sub.plan.toLowerCase().includes('year')
    const newEnd = new Date(sub.endDate)
    newEnd.setMonth(newEnd.getMonth() + (isYearly ? 12 : 1))
    subs[idx].endDate = newEnd.toISOString()
    subs[idx].status = 'ACTIVE'
    localStorage.setItem(SUBS_KEY, JSON.stringify(subs))
  }
}

export function permanentlyDeleteSubscriber(subId: string) {
  const subs = getSubscribers()
  const sub = subs.find(s => s.id === subId)
  if (!sub) return false

  // 1. Remove from subscribers
  const updatedSubs = subs.filter(s => s.id !== subId)
  localStorage.setItem(SUBS_KEY, JSON.stringify(updatedSubs))

  // 2. Free the code
  freeCode(sub.code)

  // 3. Remove from user_logins
  const logins = JSON.parse(localStorage.getItem(LOGINS_KEY) || '[]')
  const updatedLogins = logins.filter((l: any) => l.code !== sub.code)
  localStorage.setItem(LOGINS_KEY, JSON.stringify(updatedLogins))

  // 4. Remove from pending users (if exists)
  const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]')
  const updatedPending = pending.filter((p: any) => p.email !== sub.email)
  localStorage.setItem(PENDING_KEY, JSON.stringify(updatedPending))

  return true
}

// ─── Monthly Codes Stats ───
export function getMonthlyCodesStats() {
  const codes = initMonthlyCodes()
  return {
    monthlyCodesAvailable: codes.filter(c => !c.used).length,
    monthlyCodesUsed: codes.filter(c => c.used).length,
    monthlyCodesTotal: codes.length,
    monthlyCodes: codes,
  }
}

// ─── Yearly VIP Codes Stats ───
export function getYearlyCodesStats() {
  const codes = initYearlyCodes()
  return {
    yearlyCodesAvailable: codes.filter(c => !c.used).length,
    yearlyCodesUsed: codes.filter(c => c.used).length,
    yearlyCodesTotal: codes.length,
    yearlyCodes: codes,
  }
}

// ─── Stats ───
export function getStats() {
  const subs = getSubscribers()
  const now = new Date().getTime()
  const codes = initCodes()
  const monthlyStats = getMonthlyCodesStats()
  const yearlyStats = getYearlyCodesStats()
  return {
    totalSubs: subs.length,
    active: subs.filter(s => s.status === 'ACTIVE' && new Date(s.endDate).getTime() > now).length,
    expired: subs.filter(s => s.status === 'EXPIRED' || (s.status === 'ACTIVE' && new Date(s.endDate).getTime() < now)).length,
    revoked: subs.filter(s => s.status === 'REVOKED').length,
    codesAvailable: codes.filter(c => !c.used).length,
    codesUsed: codes.filter(c => c.used).length,
    ...monthlyStats,
    ...yearlyStats,
  }
}

// ─── Email — Send via FormSubmit with no-cors ───
export async function sendEmail(to: string, subject: string, message: string) {
  try {
    const fd = new FormData()
    fd.append('_subject', subject)
    fd.append('_captcha', 'false')
    fd.append('_template', 'table')
    fd.append('_reply_to', 'noreply@tradevisor.com')
    fd.append('message', message)

    await fetch(`https://formsubmit.co/${to}`, {
      method: 'POST',
      body: fd,
      mode: 'no-cors',
    })
    return true
  } catch {
    return false
  }
}

// ─── Replace All Codes — Delete old + Generate new ───
export function replaceAllCodes(count: number = 100): Array<{ code: string; used: boolean; assignedTo: string | null }> {
  // Delete old codes completely
  localStorage.removeItem(CODES_KEY)
  // Generate fresh codes
  const newCodes = generateCodes(count).map(code => ({ code, used: false, assignedTo: null as string | null }))
  localStorage.setItem(CODES_KEY, JSON.stringify(newCodes))
  return newCodes
}

// ─── Delete specific code ───
export function deleteCode(code: string) {
  const codes = initCodes()
  const updated = codes.filter(c => c.code !== code)
  localStorage.setItem(CODES_KEY, JSON.stringify(updated))
}

// ─── Cleanup — Clear ALL old data (for admin delete) ───
export function permanentlyDeletePending(orderId: string) {
  const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]')
  const user = pending.find((u: any) => u.orderId === orderId)

  // Remove from pending
  const updated = pending.filter((u: any) => u.orderId !== orderId)
  localStorage.setItem(PENDING_KEY, JSON.stringify(updated))

  // Also clean up any related logins and subscriber data
  if (user && user.email && user.assignedCode) {
    // Remove from logins
    const logins = JSON.parse(localStorage.getItem(LOGINS_KEY) || '[]')
    const updatedLogins = logins.filter((l: any) => l.code !== user.assignedCode && l.email !== user.email)
    localStorage.setItem(LOGINS_KEY, JSON.stringify(updatedLogins))

    // Free the code
    freeCode(user.assignedCode)
  }

  return true
}

// ─── Init ───
export function initVIPSystem() {
  initCodes()
}
