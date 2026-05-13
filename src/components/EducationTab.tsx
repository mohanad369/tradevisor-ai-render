import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BookOpen, ChevronDown, ChevronUp, GraduationCap,
  Target, TrendingUp, Layers, Zap, Shield, Star,
  CheckCircle, Lock, PlayCircle, Award, BarChart3,
  CandlestickChart, ArrowRight, Clock, Youtube
} from "lucide-react"

type SchoolId = "smc" | "ict" | "classic"
type LessonStatus = "locked" | "available" | "completed"

interface Lesson {
  id: string
  title: string
  description: string
  duration: string
  status: LessonStatus
  icon: any
  videoId: string
  content: string
}

interface School {
  id: SchoolId
  name: string
  description: string
  icon: any
  color: string
  lessons: Lesson[]
}

const schools: School[] = [
  {
    id: "smc",
    name: "SMC - Smart Money Concepts",
    description: "تعلم كيف تتبع الأموال الذكية والبنوك الكبرى في السوق",
    icon: Target,
    color: "#22c55e",
    lessons: [
      { id: "smc-1", title: "مقدمة Smart Money", description: "ما هي Smart Money وكيف تتحرك في السوق", duration: "10 دق", status: "available", icon: BookOpen, videoId: "YeW966gEioY", content: "Smart Money هي الأموال التي تدار من قبل البنوك الكبرى والمؤسسات المالية. هذه الأموال تتحرك بطرق محددة تترك آثاراً على الرسم البياني." },
      { id: "smc-2", title: "Supply & Demand Zones", description: "تعرف على مناطق العرض والطلب", duration: "15 دق", status: "available", icon: Layers, videoId: "Pn4kqSGrk70", content: "مناطق العرض والطلب هي أماكن تجمع الأوامر الكبيرة. عندما يصل السعر لهذه المناطق، يتوقف أو ينعكس." },
      { id: "smc-3", title: "Order Blocks", description: "بلوكات الأوامر وكيفية تحديدها", duration: "12 دق", status: "available", icon: Shield, videoId: "tHRbItC0kDE", content: "Order Block هو آخر شمعة قبل حركة سعرية قوية. تمثل منطقة تراكم المؤسسات." },
      { id: "smc-4", title: "Fair Value Gaps (FVG)", description: "الفجوات السعرية وكيفية استغلالها", duration: "10 دق", status: "available", icon: Zap, videoId: "54fBtXvNQYU", content: "FVG هي فجوة سعرية تظهر عند حركة سريعة. السعر عادة ما يعود ليملأ هذه الفجوة." },
      { id: "smc-5", title: "Liquidity Sweeps", description: "سحب السيولة من قبل الأموال الذكية", duration: "14 دق", status: "available", icon: TrendingUp, videoId: "zrkfntcsorg", content: "Liquidity Sweep هو سحب السيولة من مستويات واضحة قبل الحركة الحقيقية." },
      { id: "smc-6", title: "Break of Structure (BOS)", description: "كسر البنية السعرية", duration: "11 دق", status: "available", icon: BarChart3, videoId: "YeW966gEioY", content: "BOS يحدث عندما يكسر السعر قمة أو قاع سابق، مؤكداً استمرار الاتجاه." },
      { id: "smc-7", title: "Change of Character (CHoCH)", description: "تغيير طابع السوق", duration: "13 دق", status: "available", icon: CandlestickChart, videoId: "Pn4kqSGrk70", content: "CHoCH إشارة على احتمالية تغيير الاتجاه. يظهر عند كسر结构 معاكس للاتجاه الحالي." },
      { id: "smc-8", title: "Premium vs Discount", description: "مناطق الغلو والتخفيض", duration: "10 دق", status: "available", icon: Star, videoId: "tHRbItC0kDE", content: "Premium = مناطق بيع غالية. Discount = مناطق شراء رخيصة. نشتري من Discount ونبيع من Premium." },
      { id: "smc-9", title: "AMD Cycle", description: "دورة التجميع والتلاعب والتوزيع", duration: "16 دق", status: "available", icon: Target, videoId: "54fBtXvNQYU", content: "Accumulation = تجميع. Manipulation = تلاعب. Distribution = توزيع. دورة تتكرر في السوق." },
      { id: "smc-10", title: "DOL - Draw on Liquidity", description: "جذب السيولة", duration: "14 دق", status: "available", icon: Award, videoId: "zrkfntcsorg", content: "DOL هي المستويات التي يجذبها السعر. نتوقع الحركة بناءً على أقرب سيولة." },
    ],
  },
  {
    id: "ict",
    name: "ICT - Inner Circle Trader",
    description: "منهجية مايكل هدلسون لتداول المؤسسات",
    icon: Zap,
    color: "#d4a843",
    lessons: [
      { id: "ict-1", title: "مقدمة ICT", description: "أساسيات منهجية Inner Circle Trader", duration: "12 دق", status: "available", icon: BookOpen, videoId: "ClMZRAyjFis", content: "ICT هي منهجية طورتها Michael J. Huddleston. تركز على تتبع السيولة وحركة المؤسسات." },
      { id: "ict-2", title: "Killzones", description: "أوقات التداول الرئيسية (Asian/London/NY)", duration: "15 دق", status: "available", icon: Target, videoId: "qM5liah_6QI", content: "Killzones هي أوقات ذات سيولة عالية: London (2-5 AM EST) و New York (8-11 AM EST)." },
      { id: "ict-3", title: "Order Blocks", description: "بلوكات الأوامر في منهجية ICT", duration: "14 دق", status: "available", icon: Shield, videoId: "ClMZRAyjFis", content: "Order Block في ICT هو آخر شمعة معاكسة قبل displacement. منطقة دخول عالية الاحتمالية." },
      { id: "ict-4", title: "Fair Value Gaps", description: "الفجوات السعرية (Imbalance)", duration: "11 دق", status: "available", icon: Zap, videoId: "qM5liah_6QI", content: "FVG أو Imbalance هي منطقة لم يتم فيها تداول. السعر يسعى لملئها قبل الاستمرار." },
      { id: "ict-5", title: "Breaker Blocks", description: "بلوكات الكسر وإعادة الاختبار", duration: "13 دق", status: "available", icon: TrendingUp, videoId: "ClMZRAyjFis", content: "Breaker Block يتشكل عندما يكسر Order Block ويتحول لدعم/مقاومة جديدة." },
      { id: "ict-6", title: "Mitigation Blocks", description: "بلوكات التخفيف", duration: "10 دق", status: "available", icon: Layers, videoId: "qM5liah_6QI", content: "Mitigation Block منطقة يُخفف فيها الضغط السعري. غالباً تكون قرب Order Block قديم." },
      { id: "ict-7", title: "Liquidity Pools", description: "تجمعات السيولة", duration: "15 دق", status: "available", icon: BarChart3, videoId: "ClMZRAyjFis", content: "Liquidity Pools تجمعات الأوامر فوق القمم وتحت القيعان. السوق يتحرك نحوها ثم ينعكس." },
      { id: "ict-8", title: "Market Structure", description: "بنية السوق", duration: "12 دق", status: "available", icon: CandlestickChart, videoId: "qM5liah_6QI", content: "بنية السوق تتكون من Higher Highs/Lows (صاعد) أو Lower Highs/Lows (هابط)." },
      { id: "ict-9", title: "Displacement", description: "الإزاحة السعرية", duration: "11 دق", status: "available", icon: Star, videoId: "ClMZRAyjFis", content: "Displacement هي حركة سعرية قوية وسريعة تدل على دخول المؤسسات للسوق." },
      { id: "ict-10", title: "Time & Price Theory", description: "نظرية الوقت والسعر", duration: "18 دق", status: "available", icon: Award, videoId: "qM5liah_6QI", content: "نظرية الوقت والسعر تربط بين الأوقات المحددة والمستويات السعرية لتحديد الدخول." },
    ],
  },
  {
    id: "classic",
    name: "المدرسة الكلاسيكية",
    description: "أساسيات التحليل الفني الكلاسيكي",
    icon: GraduationCap,
    color: "#3b82f6",
    lessons: [
      { id: "cls-1", title: "مقدمة التحليل الفني", description: "أساسيات التحليل الفني للمبتدئين", duration: "10 دق", status: "available", icon: BookOpen, videoId: "nuVv0ZWUfs4", content: "التحليل الفني هو دراسة حركة السعر التاريخية للتنبؤ بالاتجاهات المستقبلية." },
      { id: "cls-2", title: "Support & Resistance", description: "مستويات الدعم والمقاومة", duration: "14 دق", status: "available", icon: Shield, videoId: "nuVv0ZWUfs4", content: "الدعم هو مستوى يصعب على السعر كسره للأسفل. المقاومة مستوى يصعب اختراقه للأعلى." },
      { id: "cls-3", title: "Trend Lines", description: "خطوط الاتجاه وكيفية رسمها", duration: "12 دق", status: "available", icon: TrendingUp, videoId: "FON9FujCv3s", content: "خط الاتجاه يربط بين القمم أو القيعان. اتجاه صاعد يربط قيعان، وهابط يربط قمم." },
      { id: "cls-4", title: "Candlestick Patterns", description: "أنماط الشموع اليابانية", duration: "16 دق", status: "available", icon: CandlestickChart, videoId: "nuVv0ZWUfs4", content: "أنماط الشموع مثل: Engulfing, Hammer, Doji, Morning Star. تعطي إشارات انعكاس أو استمرار." },
      { id: "cls-5", title: "Chart Patterns", description: "نماذج الرسم البياني", duration: "15 دق", status: "available", icon: BarChart3, videoId: "FON9FujCv3s", content: "نماذج مثل: Head & Shoulders, Double Top/Bottom, Triangles, Flags. نماذج انعكاس أو استمرار." },
      { id: "cls-6", title: "Moving Averages", description: "المتوسطات المتحركة", duration: "13 دق", status: "available", icon: Layers, videoId: "nuVv0ZWUfs4", content: "EMA و SMA تساعد على تحديد الاتجاه. EMA 200 للاتجاه العام، EMA 50 للمتوسط." },
      { id: "cls-7", title: "Fibonacci", description: "أدوات فيبوناتشي", duration: "14 دق", status: "available", icon: Star, videoId: "FON9FujCv3s", content: "مستويات فيبوناتشي: 0.382, 0.5, 0.618, 0.786. تستخدم للتصحيحات والأهداف." },
      { id: "cls-8", title: "RSI & MACD", description: "مؤشر القوة النسبية والماكد", duration: "15 دق", status: "available", icon: Zap, videoId: "nuVv0ZWUfs4", content: "RSI يقيس الزخم (فوق 70 = تشبع شرائي، تحت 30 = تشبع بيعي). MACD يتابع الاتجاه والزخم." },
      { id: "cls-9", title: "Risk Management", description: "إدارة المخاطر ورأس المال", duration: "18 دق", status: "available", icon: Target, videoId: "FON9FujCv3s", content: "Risk per trade: 1-2% فقط. Risk/Reward: 1:2 على الأقل. Stop Loss دائماً متحدد." },
      { id: "cls-10", title: "Trading Psychology", description: "علم نفس المتداول", duration: "20 دق", status: "available", icon: Award, videoId: "nuVv0ZWUfs4", content: "الانضباط والصبر هما المفتاح. لا تنتقم من السوق. خطة واضحة واتباعها بدون عاطفة." },
    ],
  },
]

export default function EducationTab() {
  const [selectedSchool, setSelectedSchool] = useState<SchoolId>("smc")
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null)
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set())

  const currentSchool = schools.find(s => s.id === selectedSchool)!

  const toggleComplete = (lessonId: string) => {
    setCompletedLessons(prev => {
      const next = new Set(prev)
      if (next.has(lessonId)) next.delete(lessonId)
      else next.add(lessonId)
      return next
    })
  }

  const progress = Math.round(
    (completedLessons.size / currentSchool.lessons.length) * 100
  )

  return (
    <div className="px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 mb-0.5">
            <GraduationCap size={16} className="text-[#d4a843] sm:hidden" />
            <GraduationCap size={18} className="text-[#d4a843] hidden sm:block" />
            Trading Schools
          </h2>
          <p className="text-[11px] sm:text-xs text-[#666666]">30 video lessons across 3 professional methodologies</p>
        </div>
        <div className="flex items-center gap-2 bg-[#141414] border border-[#1f1f1f] rounded-xl px-3 py-2">
          <span className="text-[10px] text-[#666666]">{currentSchool.name.split("-")[0]}</span>
          <div className="w-20 h-1.5 bg-[#1f1f1f] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: currentSchool.color }} />
          </div>
          <span className="text-[10px] font-bold" style={{ color: currentSchool.color }}>{progress}%</span>
        </div>
      </div>

      {/* School Selector */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
        {schools.map(school => {
          const isActive = selectedSchool === school.id
          return (
            <button
              key={school.id}
              onClick={() => { setSelectedSchool(school.id); setExpandedLesson(null) }}
              className={`relative rounded-xl p-3 sm:p-4 text-left transition-all border ${
                isActive ? "border-opacity-40 bg-opacity-10" : "border-[#1f1f1f] bg-[#0d0d0d] hover:bg-[#141414]"
              }`}
              style={{ borderColor: isActive ? school.color : undefined, backgroundColor: isActive ? school.color + "10" : undefined }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: school.color + "15" }}>
                  <school.icon size={14} className="sm:hidden" style={{ color: school.color }} />
                  <school.icon size={16} className="hidden sm:block" style={{ color: school.color }} />
                </div>
                <span className={`text-[10px] sm:text-xs font-bold ${isActive ? "text-white" : "text-[#a0a0a0]"}`}>
                  {school.name.split("-")[0]}
                </span>
              </div>
              <p className="text-[8px] sm:text-[9px] text-[#666666] line-clamp-2 leading-relaxed">{school.description}</p>
              {isActive && <div className="mt-2 h-0.5 rounded-full" style={{ backgroundColor: school.color, opacity: 0.4 }} />}
            </button>
          )
        })}
      </div>

      {/* Lessons List */}
      <div className="space-y-2">
        {currentSchool.lessons.map((lesson, index) => {
          const isExpanded = expandedLesson === lesson.id
          const isCompleted = completedLessons.has(lesson.id)

          return (
            <motion.div
              key={lesson.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-[#0d0d0d] border rounded-xl overflow-hidden transition-all ${
                isCompleted ? "border-[#22c55e]/20" : isExpanded ? "border-[#d4a843]/20" : "border-[#1f1f1f]"
              }`}
            >
              <div
                className={`flex items-center gap-3 p-3 sm:p-4 cursor-pointer transition-all ${isExpanded ? "bg-[#141414]" : "hover:bg-[#141414]"}`}
                onClick={() => setExpandedLesson(isExpanded ? null : lesson.id)}
              >
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#22c55e]/10 flex items-center justify-center">
                      <CheckCircle size={16} className="text-[#22c55e] sm:hidden" />
                      <CheckCircle size={18} className="text-[#22c55e] hidden sm:block" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: currentSchool.color + "12" }}>
                      <lesson.icon size={14} style={{ color: currentSchool.color }} className="sm:hidden" />
                      <lesson.icon size={16} style={{ color: currentSchool.color }} className="hidden sm:block" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-[#666666] font-mono">{String(index + 1).padStart(2, "0")}</span>
                    <span className={`text-xs sm:text-sm font-bold ${isCompleted ? "text-[#22c55e]" : "text-white"}`}>{lesson.title}</span>
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-[#666666] mt-0.5 truncate">{lesson.description}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[8px] sm:text-[9px] text-[#666666] bg-[#141414] px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Clock size={8} /> {lesson.duration}
                  </span>
                  {isExpanded ? <ChevronUp size={14} className="text-[#666666]" /> : <ChevronDown size={14} className="text-[#666666]" />}
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-[#1f1f1f]">
                      <div className="pt-3 space-y-3">
                        {/* YouTube Video */}
                        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden">
                          <div className="relative pt-[56.25%]">
                            <iframe
                              className="absolute inset-0 w-full h-full"
                              src={`https://www.youtube.com/embed/${lesson.videoId}`}
                              title={lesson.title}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        </div>

                        {/* Lesson Content */}
                        <div className="bg-[#141414] rounded-xl p-3 sm:p-4">
                          <h4 className="text-xs sm:text-sm font-bold text-white mb-2">Lesson Overview</h4>
                          <p className="text-[10px] sm:text-xs text-[#a0a0a0] leading-relaxed">{lesson.content}</p>
                        </div>

                        {/* Key Points */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {["Key concept explanation", "Real chart examples", "Practice exercises", "Quiz at the end"].map((point, i) => (
                            <div key={i} className="flex items-center gap-2 bg-[#141414] rounded-lg p-2">
                              <ArrowRight size={10} style={{ color: currentSchool.color }} />
                              <span className="text-[9px] sm:text-[10px] text-[#a0a0a0]">{point}</span>
                            </div>
                          ))}
                        </div>

                        {/* Mark Complete */}
                        <button onClick={() => toggleComplete(lesson.id)}
                          className={`w-full py-2.5 sm:py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                            isCompleted
                              ? "bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] hover:bg-[#22c55e]/20"
                              : "bg-[#141414] border border-[#1f1f1f] text-[#a0a0a0] hover:border-[#22c55e]/30 hover:text-[#22c55e]"
                          }`}
                        >
                          {isCompleted ? <><CheckCircle size={14} /> Completed</> : <><CheckCircle size={14} /> Mark as Complete</>}
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

      {/* Overall Progress */}
      <div className="mt-5 bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs sm:text-sm font-bold">Overall Progress</span>
          <span className="text-xs font-bold" style={{ color: currentSchool.color }}>{progress}%</span>
        </div>
        <div className="h-2 bg-[#141414] rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full rounded-full" style={{ backgroundColor: currentSchool.color }} />
        </div>
        <p className="text-[9px] sm:text-[10px] text-[#666666] mt-2">{completedLessons.size} of {currentSchool.lessons.length} lessons completed</p>
      </div>
    </div>
  )
}
