import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from './sections/Navbar'
import Footer from './sections/Footer'
import SpringSalePopup from './components/SpringSalePopup'
import SupportChatWidget from './components/SupportChatWidget'
import Disclaimer from './pages/Disclaimer'
import Hero from './sections/Hero'
import ChartAnalyzer from './sections/ChartAnalyzer'
import AIAgentsWorkflow from './sections/AIAgentsWorkflow'
import CommunityWins from './sections/CommunityWins'
import Features from './sections/Features'
import Pricing from './sections/Pricing'
import Testimonials from './sections/Testimonials'
import LeadCapture from './components/LeadCapture'
import SocialFooter from './components/SocialFooter'
import Jarvis from './components/Jarvis'
import { initFacebookPixel, initGoogleAnalytics, trackPageView } from './lib/analytics'
import { initDefaultMeta, setPageMeta } from './components/SEOMeta'

export default function App() {
  const [disclaimerAccepted, setDisclaimerAccepted] = useState<boolean>(() => {
    return localStorage.getItem('tradevisor_disclaimer_accepted') === 'true'
  })

  // ─── Initialize Analytics & SEO ───
  useEffect(() => {
    if (import.meta.env.DEV) return

    // Facebook Pixel — replace with your actual Pixel ID
    initFacebookPixel('YOUR_FACEBOOK_PIXEL_ID')

    // Google Analytics — replace with your actual GA ID
    initGoogleAnalytics('G-YOUR_GA_ID')

    // Default SEO meta tags
    initDefaultMeta()

    // Track page view
    trackPageView('home')

    // Update meta for home page
    setPageMeta({
      title: 'Tradevisor - AI-Powered Trading Signals & Analysis',
      description: 'Professional AI trading analysis, VIP signals, Smart Money education, and real-time charts. Join 10,000+ traders worldwide.',
      url: 'https://cc6q3jhp2ld6i.kimi.page',
    })
  }, [])

  if (!disclaimerAccepted) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Disclaimer onAccept={() => setDisclaimerAccepted(true)} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans antialiased">
      <Navbar />
      <main>
        <Hero />
        <ChartAnalyzer />
        <AIAgentsWorkflow />
        <CommunityWins />
        <Features />
        <Pricing />
        <Testimonials />
        {/* Lead Capture — Newsletter / VIP Waiting List */}
        <section className="py-8 sm:py-12 px-3 sm:px-6 max-w-2xl mx-auto">
          <LeadCapture variant="card" />
        </section>
      </main>
      <Footer />
      {/* Social Media Footer with Facebook, YouTube, Instagram, Telegram */}
      <SocialFooter />
      <Jarvis />
      <SpringSalePopup />
      <SupportChatWidget />
    </div>
  )
}
