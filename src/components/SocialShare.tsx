// ─── Social Share Buttons — Facebook, WhatsApp, Telegram, Twitter ───
import { Share2, Facebook, Twitter, MessageCircle, Send } from "lucide-react"

interface Props {
  title?: string
  description?: string
  url?: string
}

export default function SocialShare({
  title = "Tradevisor - AI Trading Analysis",
  description = "Professional trading signals & education",
  url = "https://cc6q3jhp2ld6i.kimi.page",
}: Props) {
  const encodedTitle = encodeURIComponent(title)
  const encodedDesc = encodeURIComponent(description)
  const encodedUrl = encodeURIComponent(url)

  const shareLinks = [
    {
      name: "Facebook",
      icon: Facebook,
      color: "#1877F2",
      bg: "#1877F215",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}%0A${encodedDesc}`,
    },
    {
      name: "WhatsApp",
      icon: MessageCircle,
      color: "#25D366",
      bg: "#25D36615",
      url: `https://wa.me/?text=${encodedTitle}%0A${encodedUrl}`,
    },
    {
      name: "Telegram",
      icon: Send,
      color: "#0088CC",
      bg: "#0088CC15",
      url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}%0A${encodedDesc}`,
    },
    {
      name: "Twitter",
      icon: Twitter,
      color: "#1DA1F2",
      bg: "#1DA1F215",
      url: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    },
  ]

  return (
    <div className="flex items-center gap-1.5">
      <Share2 size={12} className="text-[#666666] mr-1" />
      {shareLinks.map((link) => (
        <a
          key={link.name}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
          style={{ backgroundColor: link.bg }}
          title={`Share on ${link.name}`}
        >
          <link.icon size={13} style={{ color: link.color }} />
        </a>
      ))}
    </div>
  )
}
