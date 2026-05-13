// ─── Social Footer — Links to Facebook, YouTube, Instagram, Telegram ───
import { Facebook, Youtube, Instagram, Send, ExternalLink } from "lucide-react"

const socialLinks = [
  {
    name: "Facebook",
    icon: Facebook,
    color: "#1877F2",
    bg: "#1877F215",
    url: "https://facebook.com/tradevisor",
    handle: "@tradevisor",
  },
  {
    name: "YouTube",
    icon: Youtube,
    color: "#FF0000",
    bg: "#FF000015",
    url: "https://youtube.com/@tradevisor",
    handle: "@tradevisor",
  },
  {
    name: "Instagram",
    icon: Instagram,
    color: "#E4405F",
    bg: "#E4405F15",
    url: "https://instagram.com/tradevisor",
    handle: "@tradevisor",
  },
  {
    name: "Telegram",
    icon: Send,
    color: "#0088CC",
    bg: "#0088CC15",
    url: "https://t.me/tradevisor_signals",
    handle: "@tradevisor_signals",
  },
]

export default function SocialFooter() {
  return (
    <div className="bg-[#0d0d0d] border-t border-[#1f1f1f]">
      {/* Newsletter Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 border-b border-[#1f1f1f]">
        <div className="text-center mb-4">
          <h3 className="text-sm sm:text-base font-bold mb-1">Stay Connected</h3>
          <p className="text-[10px] sm:text-xs text-[#666666]">Follow us for daily signals, analysis & trading tips</p>
        </div>

        {/* Social Icons */}
        <div className="flex items-center justify-center gap-3 sm:gap-4">
          {socialLinks.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-1.5 p-2 sm:p-3 rounded-xl transition-all hover:scale-105"
            >
              <div
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all border"
                style={{ backgroundColor: link.bg, borderColor: link.color + "20" }}
              >
                <link.icon size={18} className="sm:hidden" style={{ color: link.color }} />
                <link.icon size={20} className="hidden sm:block" style={{ color: link.color }} />
              </div>
              <span className="text-[8px] sm:text-[9px] text-[#666666] group-hover:text-white transition-colors">{link.name}</span>
            </a>
          ))}
        </div>

        {/* Replace URLs notice */}
        <p className="text-[8px] text-[#444444] text-center mt-4">
          Replace links in SocialFooter.tsx with your actual social media URLs
        </p>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] sm:text-xs font-bold">Tradevisor</span>
          <span className="text-[9px] text-[#666666]">AI-Powered Trading</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="#/privacy" className="text-[9px] sm:text-[10px] text-[#666666] hover:text-[#d4a843] transition-colors">Privacy</a>
          <a href="#/terms" className="text-[9px] sm:text-[10px] text-[#666666] hover:text-[#d4a843] transition-colors">Terms</a>
          <a href="#/vip" className="text-[9px] sm:text-[10px] text-[#666666] hover:text-[#d4a843] transition-colors flex items-center gap-0.5">
            VIP <ExternalLink size={9} />
          </a>
        </div>
        <span className="text-[8px] sm:text-[9px] text-[#444444]">
          &copy; {new Date().getFullYear()} Tradevisor. All rights reserved.
        </span>
      </div>
    </div>
  )
}
