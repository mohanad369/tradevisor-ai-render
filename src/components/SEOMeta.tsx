// ─── SEO + Open Graph + Schema.org ───
// For social sharing & search engines

export function setPageMeta(options: {
  title?: string
  description?: string
  image?: string
  url?: string
  type?: string
}) {
  const {
    title = "Tradevisor - AI-Powered Trading Analysis & VIP Signals",
    description = "Professional trading analysis with AI-powered signals. VIP dashboard with real-time charts, strategies, and education.",
    image = "https://cc6q3jhp2ld6i.kimi.page/og-image.jpg",
    url = "https://cc6q3jhp2ld6i.kimi.page",
    type = "website",
  } = options

  document.title = title

  const setMeta = (name: string, content: string) => {
    let tag = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`) as HTMLMetaElement
    if (!tag) {
      tag = document.createElement('meta')
      document.head.appendChild(tag)
    }
    if (name.startsWith('og:') || name.startsWith('twitter:')) {
      tag.setAttribute('property', name)
    } else {
      tag.setAttribute('name', name)
    }
    tag.content = content
  }

  // ─── Standard SEO ───
  setMeta('description', description)
  setMeta('keywords', 'trading, forex, gold, XAUUSD, AI trading, signals, technical analysis, SMC, ICT')

  // ─── Open Graph (Facebook) ───
  setMeta('og:title', title)
  setMeta('og:description', description)
  setMeta('og:image', image)
  setMeta('og:url', url)
  setMeta('og:type', type)
  setMeta('og:site_name', 'Tradevisor')
  setMeta('og:locale', 'ar_AR')

  // ─── Twitter Cards ───
  setMeta('twitter:card', 'summary_large_image')
  setMeta('twitter:title', title)
  setMeta('twitter:description', description)
  setMeta('twitter:image', image)

  // ─── Schema.org ───
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Tradevisor",
    url,
    description,
    potentialAction: {
      "@type": "SearchAction",
      target: `${url}/#/vip`,
      "query-input": "required name=search_term",
    },
  }

  let schemaTag = document.getElementById('schema-structured-data') as HTMLScriptElement | null
  if (!schemaTag) {
    schemaTag = document.createElement('script')
    schemaTag.id = 'schema-structured-data'
    schemaTag.type = 'application/ld+json'
    document.head.appendChild(schemaTag)
  }
  schemaTag.textContent = JSON.stringify(schema)
}

// ─── Initialize default meta ───
export function initDefaultMeta() {
  setPageMeta({})
}
