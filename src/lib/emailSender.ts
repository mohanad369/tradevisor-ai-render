// ═══════════════════════════════════════════
//  Email Sender — Multiple fallback methods
// ═══════════════════════════════════════════

const ADMIN_EMAIL = "mohanadmaria777@gmail.com"

/**
 * Method 1: Open mailto: link (most reliable, always works)
 */
export function sendViaMailto(to: string, subject: string, body: string): boolean {
  try {
    const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = mailtoUrl
    return true
  } catch {
    return false
  }
}

/**
 * Method 2: Create and submit a hidden form (bypasses CORS)
 */
export function sendViaFormSubmit(to: string, subject: string, body: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      // Create invisible iframe
      const iframe = document.createElement('iframe')
      iframe.name = 'formsubmit_target_' + Date.now()
      iframe.style.cssText = 'position:absolute;width:0;height:0;border:0;'
      document.body.appendChild(iframe)

      // Create form
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = `https://formsubmit.co/${to}`
      form.target = iframe.name
      form.style.cssText = 'position:absolute;width:0;height:0;'

      // Add fields
      const fields: Record<string, string> = {
        _subject: subject,
        _captcha: 'false',
        _template: 'table',
        _reply_to: 'noreply@tradevisor.com',
        message: body,
      }

      Object.entries(fields).forEach(([key, value]) => {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = key
        input.value = value
        form.appendChild(input)
      })

      document.body.appendChild(form)
      form.submit()

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(form)
        document.body.removeChild(iframe)
        resolve(true)
      }, 3000)
    } catch {
      resolve(false)
    }
  })
}

/**
 * Method 3: Fetch with no-cors (fire and forget)
 */
export async function sendViaFetch(to: string, subject: string, body: string): Promise<boolean> {
  try {
    const fd = new FormData()
    fd.append('_subject', subject)
    fd.append('_captcha', 'false')
    fd.append('_template', 'table')
    fd.append('_reply_to', 'noreply@tradevisor.com')
    fd.append('message', body)

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

/**
 * Send email using ALL methods simultaneously
 * Returns which methods succeeded
 */
export async function sendEmailAllMethods(to: string, subject: string, body: string): Promise<{
  mailto: boolean
  formSubmit: boolean
  fetch: boolean
}> {
  const results = {
    mailto: sendViaMailto(to, subject, body),
    formSubmit: false,
    fetch: false,
  }

  // Try form submit and fetch in parallel
  const [formResult, fetchResult] = await Promise.all([
    sendViaFormSubmit(to, subject, body).catch(() => false),
    sendViaFetch(to, subject, body).catch(() => false),
  ])

  results.formSubmit = formResult
  results.fetch = fetchResult

  return results
}

/**
 * Send payment notification to admin using all available methods
 */
export async function notifyAdminOfPayment(orderId: string, email: string, plan: string, amount: string, txId: string): Promise<string> {
  // Detect plan type
  const isYearly = plan.toLowerCase().includes('year') || plan.toLowerCase().includes('annual')
  const isMonthly = !isYearly
  const planType = isYearly ? 'YEARLY' : 'MONTHLY'
  const planPrice = isYearly ? '$1000' : '$100'
  const planDuration = isYearly ? '12 months' : '1 month'

  const subject = `NEW VIP ${planType} PAYMENT - ${orderId}`
  const body = `NEW PAYMENT REQUIRES VERIFICATION

========================================
ORDER DETAILS
========================================
Order ID: ${orderId}
Plan Type: ${planType} SUBSCRIPTION
Plan Name: ${plan}
Amount Paid: $${amount} USDT (TRC20)
Plan Price: ${planPrice}
Duration: ${planDuration}

========================================
CUSTOMER INFO
========================================
Email: ${email}
TXID: ${txId}
Submitted: ${new Date().toLocaleString()}

========================================
ACTION REQUIRED
========================================
Approve at: Admin Panel > Verifications
Assign ${planType.toLowerCase()} code from: Admin Panel > Monthly Subs

---
Tradevisor VIP System`

  // Try all methods
  const results = await sendEmailAllMethods(ADMIN_EMAIL, subject, body)

  if (results.mailto || results.formSubmit || results.fetch) {
    return 'sent'
  }

  return 'failed'
}
