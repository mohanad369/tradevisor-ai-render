import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Language = "en" | "ar";

type Dictionary = Record<string, { en: string; ar: string }>;

const dictionary: Dictionary = {
  "nav.subtitle": { en: "Smart Trading Insights", ar: "رؤى تداول ذكية" },
  "nav.aiAgents": { en: "AI Agents", ar: "الوكلاء" },
  "nav.analyzer": { en: "Analyzer", ar: "المحلل" },
  "nav.wins": { en: "Wins", ar: "النتائج" },
  "nav.features": { en: "Features", ar: "المزايا" },
  "nav.testimonials": { en: "Testimonials", ar: "آراء العملاء" },
  "nav.pricing": { en: "Pricing", ar: "الأسعار" },
  "nav.candle": { en: "Candle AI", ar: "شموع AI" },
  "nav.vip": { en: "VIP", ar: "VIP" },
  "language.label": { en: "Language", ar: "اللغة" },
  "language.english": { en: "English", ar: "الإنجليزية" },
  "language.arabic": { en: "Arabic", ar: "العربية" },

  "hero.totalProfits": { en: "Total Profits", ar: "إجمالي الأرباح" },
  "hero.todayProfit": { en: "+$12,700 today", ar: "+$12,700 اليوم" },
  "hero.winRate": { en: "Win Rate", ar: "نسبة الفوز" },
  "hero.activeSignals": { en: "Active Signals", ar: "إشارات نشطة" },
  "hero.thisHour": { en: "+3 this hour", ar: "+3 هذا الساعة" },
  "hero.last30": { en: "Last 30 days", ar: "آخر 30 يوم" },
  "hero.profitToday": { en: "Profit Today", ar: "ربح اليوم" },
  "hero.assets": { en: "Assets", ar: "الأصول" },
  "hero.assetsList": { en: "XAU, EUR, BTC...", ar: "ذهب، يورو، بتكوين..." },
  "hero.liveSignals": { en: "Live Signals", ar: "إشارات مباشرة" },
  "hero.realTime": { en: "Real-time", ar: "مباشر" },
  "hero.tradingAssets": { en: "Trading Assets", ar: "أصول التداول" },

  "agents.eyebrow": { en: "AI Agent Network", ar: "شبكة وكلاء الذكاء" },
  "agents.title": { en: "Artificial Intelligence Agents", ar: "وكلاء الذكاء الاصطناعي" },
  "agents.subtitle": {
    en: "Every trade moves through linked agents: news, bank policy, validation, momentum, chart logic, supervision, and risk management before the final decision appears.",
    ar: "الصفقة تمر داخل الموقع عبر ستة وكلاء مترابطين: خبر، تحقق، زخم، شارت، مراقبة، ثم ادارة مخاطر قبل ظهور القرار النهائي.",
  },
  "agents.flowTitle": { en: "How the trade moves inside the system", ar: "حركة الصفقة داخل النظام" },
  "agents.statusLabel": { en: "Network status", ar: "حالة الشبكة" },
  "agents.statusValue": { en: "All agents linked", ar: "كل الوكلاء متصلون" },
  "agents.next": { en: "next signal", ar: "الإشارة التالية" },

  "analyzer.eyebrow": { en: "AI-Powered Chart Analysis", ar: "تحليل شارت بالذكاء الاصطناعي" },
  "analyzer.title": { en: "AI Detects Your Entry, SL & Targets", ar: "الذكاء الاصطناعي يحدد الدخول والستوب والأهداف" },
  "analyzer.subtitle": {
    en: "Upload any chart. Our AI reads price action, detects patterns, and automatically generates Entry, Stop Loss, and 3 Take Profit levels with professional risk management.",
    ar: "ارفع أي شارت. يقرأ الذكاء الاصطناعي حركة السعر، يكتشف النماذج، ويولد الدخول والستوب وثلاثة أهداف مع إدارة مخاطر احترافية.",
  },
  "analyzer.currentPrice": { en: "Current Price from Your Chart:", ar: "السعر الحالي من الشارت:" },
  "analyzer.tipPrice": { en: "Tip: Enter the exact price shown on your chart above for 100% accurate alignment. Leaving empty uses the live market price.", ar: "نصيحة: أدخل السعر الظاهر على الشارت للحصول على توافق أدق. تركه فارغا يستخدم السعر المباشر." },
  "analyzer.timeframe": { en: "Timeframe:", ar: "الإطار الزمني:" },
  "analyzer.analyze": { en: "Analyze Chart with AI - Auto Detect Entry/SL/TP", ar: "حلل الشارت بالذكاء الاصطناعي - تحديد دخول/ستوب/أهداف" },
  "analyzer.reanalyze": { en: "Re-Analyze with AI", ar: "إعادة التحليل بالذكاء الاصطناعي" },
  "analyzer.unlock": { en: "Unlock Unlimited Analysis - Subscribe to VIP", ar: "افتح تحليلات غير محدودة - اشترك VIP" },
  "analyzer.uploadTitle": { en: "Upload Your Chart", ar: "ارفع الشارت" },
  "analyzer.readyTitle": { en: "Ready for AI Analysis", ar: "جاهز لتحليل الذكاء الاصطناعي" },
  "analyzer.uploadText": { en: "Upload a chart screenshot for professional AI technical analysis with auto-detected price levels.", ar: "ارفع لقطة شاشة للشارت للحصول على تحليل فني احترافي مع مستويات سعرية مكتشفة تلقائيا." },
  "analyzer.readyText": { en: "Click 'Analyze Chart with AI' and our AI will automatically detect Entry, Stop Loss, and Take Profit levels.", ar: "اضغط تحليل الشارت وسيحدد الذكاء الاصطناعي الدخول والستوب والأهداف تلقائيا." },
  "analyzer.analyzing": { en: "AI Analyzing Your Chart...", ar: "الذكاء الاصطناعي يحلل الشارت..." },
  "analyzer.analyzingSteps": { en: "Reading price action - Detecting patterns - Calculating levels", ar: "قراءة حركة السعر - اكتشاف النماذج - حساب المستويات" },

  "wins.kicker1": { en: "[ ADVANCED_FEATURES ]", ar: "[ مزايا متقدمة ]" },
  "wins.kicker2": { en: "[ AI_FEATURES ]", ar: "[ مزايا الذكاء ]" },
  "wins.titleA": { en: "Real", ar: "نتائج" },
  "wins.titleB": { en: "Wins", ar: "حقيقية" },
  "wins.titleC": { en: "from our members", ar: "من أعضائنا" },
  "wins.subtitle": { en: "Trading wins shared by members using our AI signals", ar: "نتائج تداول شاركها الأعضاء باستخدام إشاراتنا الذكية" },
  "wins.viewMore": { en: "View More", ar: "عرض المزيد" },
  "wins.cta": { en: "Ready to trade with the same AI signals behind these member wins?", ar: "جاهز للتداول بنفس إشارات الذكاء وراء هذه النتائج؟" },

  "features.title": { en: "AI-Powered Trading Tools", ar: "أدوات تداول مدعومة بالذكاء الاصطناعي" },
  "features.subtitle": { en: "Stop guessing. Start winning. Our AI analyzes millions of data points per second to give you unfair advantages in the market.", ar: "توقف عن التخمين وابدأ التداول بوضوح. يحلل الذكاء الاصطناعي ملايين نقاط البيانات ليمنحك أفضلية في السوق." },
  "features.winRate": { en: "Win Rate", ar: "نسبة الفوز" },
  "features.return": { en: "Average Return", ar: "متوسط العائد" },
  "features.speed": { en: "Alert Speed", ar: "سرعة التنبيه" },
  "features.last90": { en: "Last 90 days", ar: "آخر 90 يوم" },
  "features.gain": { en: "34x gain", ar: "ربح 34x" },
  "features.fast": { en: "Lightning fast", ar: "سريع جدا" },

  "pricing.sale": { en: "Sakura Spring Sale: Lock in current pricing before it ends.", ar: "عرض الربيع: ثبّت السعر الحالي قبل انتهاء العرض." },
  "pricing.title": { en: "Start Trading Smarter Today", ar: "ابدأ التداول بذكاء اليوم" },
  "pricing.cancel": { en: "Cancel anytime.", ar: "إلغاء في أي وقت." },
  "pricing.choose": { en: "[ CHOOSE_YOUR_PATH ]", ar: "[ اختر خطتك ]" },
  "pricing.subtitle": { en: "Select the perfect plan to accelerate your trading journey.", ar: "اختر الخطة المناسبة لتسريع رحلتك في التداول." },
  "pricing.premium": { en: "Premium", ar: "مميز" },
  "pricing.spring": { en: "Sakura Spring Sale", ar: "عرض الربيع" },
  "pricing.payUsdt": { en: "Pay with USDT (TRC20)", ar: "ادفع عبر USDT (TRC20)" },

  "testimonials.kicker": { en: "CUSTOMER_TESTIMONIALS", ar: "آراء العملاء" },
  "testimonials.title": { en: "Real results from real community members", ar: "نتائج حقيقية من أعضاء حقيقيين" },
  "testimonials.rating": { en: "5.0 on Whop", ar: "5.0 على Whop" },
  "testimonials.live": { en: "Live community results", ar: "نتائج مباشرة من المجتمع" },

  "lead.badge": { en: "VIP Early Access", ar: "وصول VIP مبكر" },
  "lead.title": { en: "Get Trading Signals First", ar: "احصل على إشارات التداول أولا" },
  "lead.subtitle": { en: "Join our exclusive list and receive AI-powered trading signals, market analysis, and early access to new features.", ar: "انضم إلى قائمتنا الخاصة واستلم إشارات تداول ذكية وتحليل سوق ووصول مبكر للمزايا الجديدة." },
  "lead.placeholder": { en: "Enter your email...", ar: "أدخل بريدك الإلكتروني..." },
  "lead.join": { en: "Join Now", ar: "انضم الآن" },
  "lead.joining": { en: "Joining...", ar: "جار الانضمام..." },
  "lead.done": { en: "You're on the list!", ar: "تمت إضافتك إلى القائمة!" },
  "lead.doneText": { en: "Check your email for confirmation.", ar: "تحقق من بريدك للتأكيد." },
  "lead.noSpam": { en: "No spam. Unsubscribe anytime. Your data is protected.", ar: "لا رسائل مزعجة. يمكنك الإلغاء في أي وقت. بياناتك محمية." },

  "footer.tools": { en: "Premium AI Trading Tools", ar: "أدوات تداول ذكية مميزة" },
  "footer.privacy": { en: "Privacy Policy", ar: "سياسة الخصوصية" },
  "footer.rights": { en: "All rights reserved.", ar: "جميع الحقوق محفوظة." },
  "social.title": { en: "Stay Connected", ar: "ابق على تواصل" },
  "social.subtitle": { en: "Follow us for daily signals, analysis & trading tips", ar: "تابعنا للحصول على إشارات يومية وتحليلات ونصائح تداول" },
  "social.powered": { en: "AI-Powered Trading", ar: "تداول مدعوم بالذكاء الاصطناعي" },
  "social.privacy": { en: "Privacy", ar: "الخصوصية" },
  "social.terms": { en: "Terms", ar: "الشروط" },

  // ── Execution Plan agent (11th) ──
  "exec.title": { en: "Execution Plan", ar: "خطة التنفيذ" },
  "exec.subtitle": { en: "11th agent · concrete order plan from the analysis + agents + debate", ar: "الوكيل الحادي عشر · خطة دخول واضحة من التحليل والوكلاء والمناظرة" },
  "exec.loading": { en: "Building your execution plan…", ar: "جاري بناء خطة التنفيذ…" },
  "exec.consensus": { en: "Agent consensus", ar: "إجماع الوكلاء" },
  "exec.agentsAgree": { en: "agents agree", ar: "وكلاء متفقين" },
  "exec.orderType": { en: "Order type", ar: "نوع الأمر" },
  "exec.entry": { en: "Entry", ar: "الدخول" },
  "exec.stopLoss": { en: "Stop loss", ar: "وقف الخسارة" },
  "exec.targets": { en: "Targets", ar: "الأهداف" },
  "exec.instructions": { en: "Instructions", ar: "التعليمات" },
  "exec.cancelIf": { en: "Cancel order if", ar: "ألغِ الأمر إذا" },
  "exec.waitTitle": { en: "Wait — don't enter", ar: "انتظر — لا تدخل" },
  "exec.errorTitle": { en: "Plan unavailable", ar: "الخطة غير متاحة" },
  "exec.buyLimit": { en: "Buy Limit", ar: "أمر شراء معلّق" },
  "exec.sellLimit": { en: "Sell Limit", ar: "أمر بيع معلّق" },
  "exec.buyMarket": { en: "Buy at Market", ar: "شراء سوقي" },
  "exec.sellMarket": { en: "Sell at Market", ar: "بيع سوقي" },
  "exec.disclaimer": { en: "AI-generated execution plan — not financial advice. Trading carries real risk.", ar: "خطة تنفيذ مولّدة بالذكاء الاصطناعي — ليست نصيحة مالية. التداول ينطوي على مخاطر حقيقية." },
};

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("tradevisor_language");
    return saved === "ar" || saved === "en" ? saved : "en";
  });

  const dir = language === "ar" ? "rtl" : "ltr";

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    localStorage.setItem("tradevisor_language", nextLanguage);
  };

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }, [dir, language]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage,
    toggleLanguage: () => setLanguage(language === "en" ? "ar" : "en"),
    t: (key: string) => dictionary[key]?.[language] ?? key,
    dir,
  }), [dir, language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
