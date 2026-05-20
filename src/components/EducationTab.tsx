import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CandlestickChart,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  GraduationCap,
  Layers,
  PlayCircle,
  Shield,
  Star,
  Target,
  TrendingUp,
  Youtube,
  Zap,
  type LucideIcon,
} from "lucide-react"

type SchoolId = "smc" | "ict" | "classic"
type LessonStatus = "locked" | "available" | "completed"

interface Lesson {
  id: string
  title: string
  description: string
  duration: string
  status: LessonStatus
  icon: LucideIcon
  videoId: string
  content: string
}

interface School {
  id: SchoolId
  name: string
  description: string
  icon: LucideIcon
  color: string
  lessons: Lesson[]
}

// Use youtube-nocookie.com — the privacy-enhanced domain. It is more
// permissive about the embedding origin, so the player keeps working
// even when the site is reached via an IP address, a tunnel domain, or
// a non-standard origin. We deliberately do NOT pass an &origin= param,
// because a wrong/unknown origin is exactly what makes YouTube refuse
// to play the embed ("Video unavailable").
const videoEmbedUrl = (videoId: string) =>
  `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`

const videoWatchUrl = (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`

const schools: School[] = [
  {
    id: "smc",
    name: "SMC - Smart Money Concepts",
    description: "Follow institutional liquidity, order blocks, imbalance, and bank-driven market structure.",
    icon: Target,
    color: "#22c55e",
    lessons: [
      { id: "smc-1", title: "Smart Money Introduction", description: "Understand who moves the market and how their footprints appear.", duration: "10 min", status: "available", icon: BookOpen, videoId: "YeW966gEioY", content: "Smart Money focuses on how banks and large institutions build positions, grab liquidity, and move price toward high-value zones." },
      { id: "smc-2", title: "Supply and Demand Zones", description: "Identify strong institutional reaction areas.", duration: "15 min", status: "available", icon: Layers, videoId: "Pn4kqSGrk70", content: "Supply and demand zones show where large orders previously entered the market. These areas can become high-probability reaction points." },
      { id: "smc-3", title: "Order Blocks", description: "Map the last institutional candle before displacement.", duration: "12 min", status: "available", icon: Shield, videoId: "tHRbItC0kDE", content: "An order block is a price zone created before a strong impulsive move. It helps define entry zones, invalidation, and risk." },
      { id: "smc-4", title: "Fair Value Gaps", description: "Read imbalance and unfilled price delivery.", duration: "10 min", status: "available", icon: Zap, videoId: "54fBtXvNQYU", content: "A fair value gap is an imbalance created by fast movement. Price often revisits these zones before continuing or reversing." },
      { id: "smc-5", title: "Liquidity Sweeps", description: "Spot stop hunts before the real move starts.", duration: "14 min", status: "available", icon: TrendingUp, videoId: "zrkfntcsorg", content: "Liquidity sweeps happen when price runs obvious highs or lows to trigger stops before reversing into the intended direction." },
      { id: "smc-6", title: "Break of Structure", description: "Confirm continuation after a structural break.", duration: "11 min", status: "available", icon: BarChart3, videoId: "YeW966gEioY", content: "A break of structure confirms that price has taken out a meaningful swing high or low, giving context for continuation setups." },
      { id: "smc-7", title: "Change of Character", description: "Recognize the first warning that trend behavior is changing.", duration: "13 min", status: "available", icon: CandlestickChart, videoId: "Pn4kqSGrk70", content: "Change of character appears when price breaks against the current flow, warning that a reversal or deeper correction may be forming." },
      { id: "smc-8", title: "Premium vs Discount", description: "Buy from discount and sell from premium zones.", duration: "10 min", status: "available", icon: Star, videoId: "tHRbItC0kDE", content: "Premium and discount help separate expensive and cheap pricing inside a dealing range, improving entry quality." },
      { id: "smc-9", title: "AMD Cycle", description: "Read accumulation, manipulation, and distribution.", duration: "16 min", status: "available", icon: Target, videoId: "54fBtXvNQYU", content: "The AMD cycle explains how price can build liquidity, manipulate traders into the wrong side, then distribute into the main move." },
      { id: "smc-10", title: "Draw on Liquidity", description: "Define the next likely liquidity target.", duration: "14 min", status: "available", icon: Award, videoId: "zrkfntcsorg", content: "Draw on liquidity is the level price is most likely being attracted toward, based on stops, highs, lows, and imbalance." },
    ],
  },
  {
    id: "ict",
    name: "ICT - Inner Circle Trader",
    description: "Study time, price, liquidity, displacement, and institutional delivery models.",
    icon: Zap,
    color: "#d4a843",
    lessons: [
      { id: "ict-1", title: "ICT Foundation", description: "Learn the core language of ICT price delivery.", duration: "12 min", status: "available", icon: BookOpen, videoId: "ClMZRAyjFis", content: "ICT methodology studies liquidity, time windows, imbalance, and how institutional price delivery forms repeatable setups." },
      { id: "ict-2", title: "Killzones", description: "Focus on London and New York high-liquidity windows.", duration: "15 min", status: "available", icon: Target, videoId: "qM5liah_6QI", content: "Killzones are high-activity windows where liquidity and volatility often create the best intraday opportunities." },
      { id: "ict-3", title: "ICT Order Blocks", description: "Use order blocks for entries and invalidation.", duration: "14 min", status: "available", icon: Shield, videoId: "ClMZRAyjFis", content: "ICT order blocks are institutional reference zones formed before displacement, often used with liquidity and market structure." },
      { id: "ict-4", title: "Imbalance and FVG", description: "Read inefficient price movement.", duration: "11 min", status: "available", icon: Zap, videoId: "qM5liah_6QI", content: "Imbalance shows areas where price moved too quickly. These areas can become magnets or continuation references." },
      { id: "ict-5", title: "Breaker Blocks", description: "Trade failed order blocks after structural shifts.", duration: "13 min", status: "available", icon: TrendingUp, videoId: "ClMZRAyjFis", content: "A breaker block forms when an old order block fails and later becomes a new support or resistance reference." },
      { id: "ict-6", title: "Mitigation Blocks", description: "Understand institutional position mitigation.", duration: "10 min", status: "available", icon: Layers, videoId: "qM5liah_6QI", content: "Mitigation blocks are areas where price returns to reduce exposure from previous institutional positioning." },
      { id: "ict-7", title: "Liquidity Pools", description: "Map buy-side and sell-side liquidity.", duration: "15 min", status: "available", icon: BarChart3, videoId: "ClMZRAyjFis", content: "Liquidity pools form above highs and below lows. Price often seeks these pools before choosing the true direction." },
      { id: "ict-8", title: "Market Structure", description: "Read trend, reversal, and range conditions.", duration: "12 min", status: "available", icon: CandlestickChart, videoId: "qM5liah_6QI", content: "Structure defines the active market state: bullish, bearish, ranging, correcting, or transitioning." },
      { id: "ict-9", title: "Displacement", description: "Confirm institutional intent through strong candles.", duration: "11 min", status: "available", icon: Star, videoId: "ClMZRAyjFis", content: "Displacement is a strong directional expansion that confirms urgency and often leaves imbalance behind." },
      { id: "ict-10", title: "Time and Price", description: "Combine timing windows with price levels.", duration: "18 min", status: "available", icon: Award, videoId: "qM5liah_6QI", content: "Time and price together help filter low-quality signals and wait for entries at the right moment." },
    ],
  },
  {
    id: "classic",
    name: "Classic Technical Analysis",
    description: "Master structure, support, resistance, patterns, indicators, and disciplined risk.",
    icon: GraduationCap,
    color: "#3b82f6",
    lessons: [
      { id: "cls-1", title: "Technical Analysis Basics", description: "Learn the foundation of reading price charts.", duration: "10 min", status: "available", icon: BookOpen, videoId: "nuVv0ZWUfs4", content: "Technical analysis studies historical price action to understand trend, momentum, support, resistance, and probability." },
      { id: "cls-2", title: "Support and Resistance", description: "Find levels where price reacts repeatedly.", duration: "14 min", status: "available", icon: Shield, videoId: "nuVv0ZWUfs4", content: "Support and resistance are key levels where buyers or sellers previously stepped in. They help plan entries and exits." },
      { id: "cls-3", title: "Trend Lines", description: "Draw trend direction using swing points.", duration: "12 min", status: "available", icon: TrendingUp, videoId: "FON9FujCv3s", content: "Trend lines connect meaningful highs or lows and help identify trend continuation, correction, or break conditions." },
      { id: "cls-4", title: "Candlestick Patterns", description: "Read candle behavior and reversal clues.", duration: "16 min", status: "available", icon: CandlestickChart, videoId: "nuVv0ZWUfs4", content: "Candlestick patterns such as engulfing, doji, hammer, and morning star help interpret pressure and rejection." },
      { id: "cls-5", title: "Chart Patterns", description: "Recognize continuation and reversal formations.", duration: "15 min", status: "available", icon: BarChart3, videoId: "FON9FujCv3s", content: "Patterns such as triangles, flags, double tops, and head and shoulders help structure trade ideas." },
      { id: "cls-6", title: "Moving Averages", description: "Use moving averages for trend context.", duration: "13 min", status: "available", icon: Layers, videoId: "nuVv0ZWUfs4", content: "Moving averages smooth price data and help identify direction, dynamic support, and momentum shifts." },
      { id: "cls-7", title: "Fibonacci Tools", description: "Measure retracements and extensions.", duration: "14 min", status: "available", icon: Star, videoId: "FON9FujCv3s", content: "Fibonacci levels help estimate correction zones and targets, especially when combined with structure." },
      { id: "cls-8", title: "RSI and MACD", description: "Use momentum indicators responsibly.", duration: "15 min", status: "available", icon: Zap, videoId: "nuVv0ZWUfs4", content: "RSI and MACD can confirm momentum, divergence, and exhaustion, but they should not replace price action." },
      { id: "cls-9", title: "Risk Management", description: "Control position size, loss, and reward.", duration: "18 min", status: "available", icon: Target, videoId: "FON9FujCv3s", content: "Professional trading starts with risk. Define stop loss, risk percentage, and reward target before entering." },
      { id: "cls-10", title: "Trading Psychology", description: "Build discipline and emotional control.", duration: "20 min", status: "available", icon: Award, videoId: "nuVv0ZWUfs4", content: "Psychology protects the account. Patience, discipline, and rule-based execution matter more than one perfect setup." },
    ],
  },
]

function LessonVideo({ lesson, color }: { lesson: Lesson; color: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#1f1f1f] bg-[#070707]">
      <div className="flex flex-col gap-2 border-b border-[#1f1f1f] bg-[#0f0f0f] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-[10px] font-bold text-white sm:text-xs">
          <Youtube size={14} style={{ color }} />
          Video lesson
          <span className="rounded-full bg-[#1a1a1a] px-2 py-0.5 text-[9px] text-[#777777]">{lesson.duration}</span>
        </div>
        <a
          href={videoWatchUrl(lesson.videoId)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#2a2a2a] bg-[#141414] px-3 py-1.5 text-[10px] font-bold text-[#d4a843] transition hover:border-[#d4a843]/50 hover:bg-[#1b1710]"
          onClick={(event) => event.stopPropagation()}
        >
          Open YouTube
          <ExternalLink size={11} />
        </a>
      </div>
      <div className="relative aspect-video bg-black">
        <iframe
          className="absolute inset-0 h-full w-full"
          src={videoEmbedUrl(lesson.videoId)}
          title={lesson.title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      <div className="flex items-start gap-2 border-t border-[#1f1f1f] bg-[#0b0b0b] px-3 py-2 text-[9px] leading-relaxed text-[#777777] sm:text-[10px]">
        <PlayCircle size={13} className="mt-0.5 shrink-0" style={{ color }} />
        If the player is blocked by YouTube or the browser, use Open YouTube. The lesson remains connected to this VIP school page.
      </div>
    </div>
  )
}

export default function EducationTab() {
  const [selectedSchool, setSelectedSchool] = useState<SchoolId>("smc")
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null)
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set())

  const currentSchool = schools.find((school) => school.id === selectedSchool)!
  const completedInSchool = currentSchool.lessons.filter((lesson) => completedLessons.has(lesson.id)).length
  const progress = Math.round((completedInSchool / currentSchool.lessons.length) * 100)

  const toggleComplete = (lessonId: string) => {
    setCompletedLessons((prev) => {
      const next = new Set(prev)
      if (next.has(lessonId)) next.delete(lessonId)
      else next.add(lessonId)
      return next
    })
  }

  return (
    <div className="px-1 sm:px-0">
      <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h2 className="mb-0.5 flex items-center gap-2 text-lg font-bold sm:text-xl">
            <GraduationCap size={16} className="text-[#d4a843] sm:hidden" />
            <GraduationCap size={18} className="hidden text-[#d4a843] sm:block" />
            Trading Schools
          </h2>
          <p className="text-[11px] text-[#666666] sm:text-xs">30 video lessons across 3 professional methodologies</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[#1f1f1f] bg-[#141414] px-3 py-2">
          <span className="text-[10px] text-[#666666]">{currentSchool.name.split("-")[0]}</span>
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#1f1f1f]">
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: currentSchool.color }} />
          </div>
          <span className="text-[10px] font-bold" style={{ color: currentSchool.color }}>{progress}%</span>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
        {schools.map((school) => {
          const isActive = selectedSchool === school.id
          const SchoolIcon = school.icon
          return (
            <button
              key={school.id}
              onClick={() => {
                setSelectedSchool(school.id)
                setExpandedLesson(null)
              }}
              className={`relative rounded-xl p-3 text-left transition-all sm:p-4 ${
                isActive ? "border bg-opacity-10" : "border border-[#1f1f1f] bg-[#0d0d0d] hover:bg-[#141414]"
              }`}
              style={{ borderColor: isActive ? school.color : undefined, backgroundColor: isActive ? `${school.color}10` : undefined }}
            >
              <div className="mb-1.5 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg sm:h-8 sm:w-8" style={{ backgroundColor: `${school.color}15` }}>
                  <SchoolIcon size={14} className="sm:hidden" style={{ color: school.color }} />
                  <SchoolIcon size={16} className="hidden sm:block" style={{ color: school.color }} />
                </div>
                <span className={`text-[10px] font-bold sm:text-xs ${isActive ? "text-white" : "text-[#a0a0a0]"}`}>{school.name.split("-")[0]}</span>
              </div>
              <p className="line-clamp-2 text-[8px] leading-relaxed text-[#666666] sm:text-[9px]">{school.description}</p>
              {isActive && <div className="mt-2 h-0.5 rounded-full" style={{ backgroundColor: school.color, opacity: 0.4 }} />}
            </button>
          )
        })}
      </div>

      <div className="space-y-2">
        {currentSchool.lessons.map((lesson, index) => {
          const isExpanded = expandedLesson === lesson.id
          const isCompleted = completedLessons.has(lesson.id)
          const LessonIcon = lesson.icon

          return (
            <motion.div
              key={lesson.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`overflow-hidden rounded-xl border bg-[#0d0d0d] transition-all ${
                isCompleted ? "border-[#22c55e]/20" : isExpanded ? "border-[#d4a843]/20" : "border-[#1f1f1f]"
              }`}
            >
              <div
                className={`flex cursor-pointer items-center gap-3 p-3 transition-all sm:p-4 ${isExpanded ? "bg-[#141414]" : "hover:bg-[#141414]"}`}
                onClick={() => setExpandedLesson(isExpanded ? null : lesson.id)}
              >
                <div className="shrink-0">
                  {isCompleted ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#22c55e]/10 sm:h-9 sm:w-9">
                      <CheckCircle size={16} className="text-[#22c55e] sm:hidden" />
                      <CheckCircle size={18} className="hidden text-[#22c55e] sm:block" />
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full sm:h-9 sm:w-9" style={{ backgroundColor: `${currentSchool.color}12` }}>
                      <LessonIcon size={14} className="sm:hidden" style={{ color: currentSchool.color }} />
                      <LessonIcon size={16} className="hidden sm:block" style={{ color: currentSchool.color }} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-[#666666]">{String(index + 1).padStart(2, "0")}</span>
                    <span className={`text-xs font-bold sm:text-sm ${isCompleted ? "text-[#22c55e]" : "text-white"}`}>{lesson.title}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[9px] text-[#666666] sm:text-[10px]">{lesson.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="flex items-center gap-1 rounded-full bg-[#141414] px-2 py-0.5 text-[8px] text-[#666666] sm:text-[9px]">
                    <Clock size={8} /> {lesson.duration}
                  </span>
                  {isExpanded ? <ChevronUp size={14} className="text-[#666666]" /> : <ChevronDown size={14} className="text-[#666666]" />}
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="border-t border-[#1f1f1f] px-3 pb-3 sm:px-4 sm:pb-4">
                      <div className="space-y-3 pt-3">
                        <LessonVideo lesson={lesson} color={currentSchool.color} />

                        <div className="rounded-xl bg-[#141414] p-3 sm:p-4">
                          <h4 className="mb-2 text-xs font-bold text-white sm:text-sm">Lesson Overview</h4>
                          <p className="text-[10px] leading-relaxed text-[#a0a0a0] sm:text-xs">{lesson.content}</p>
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {["Key concept explanation", "Real chart examples", "Practice exercises", "Review checklist"].map((point) => (
                            <div key={point} className="flex items-center gap-2 rounded-lg bg-[#141414] p-2">
                              <ArrowRight size={10} style={{ color: currentSchool.color }} />
                              <span className="text-[9px] text-[#a0a0a0] sm:text-[10px]">{point}</span>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => toggleComplete(lesson.id)}
                          className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all sm:py-3 ${
                            isCompleted
                              ? "border border-[#22c55e]/20 bg-[#22c55e]/10 text-[#22c55e] hover:bg-[#22c55e]/20"
                              : "border border-[#1f1f1f] bg-[#141414] text-[#a0a0a0] hover:border-[#22c55e]/30 hover:text-[#22c55e]"
                          }`}
                        >
                          <CheckCircle size={14} />
                          {isCompleted ? "Completed" : "Mark as Complete"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      <div className="mt-5 rounded-xl border border-[#1f1f1f] bg-[#0d0d0d] p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-bold sm:text-sm">Current School Progress</span>
          <span className="text-xs font-bold" style={{ color: currentSchool.color }}>{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#141414]">
          <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full rounded-full" style={{ backgroundColor: currentSchool.color }} />
        </div>
        <p className="mt-2 text-[9px] text-[#666666] sm:text-[10px]">
          {completedInSchool} of {currentSchool.lessons.length} lessons completed
        </p>
      </div>
    </div>
  )
}
