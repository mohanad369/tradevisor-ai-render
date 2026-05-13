export interface LocalizedText {
  en: string;
  ar: string;
}

export interface FeatureData {
  icon: string;
  title: LocalizedText;
  description: LocalizedText;
  bullets: LocalizedText[];
  footer: LocalizedText;
}

export const featuresData: FeatureData[] = [
  {
    icon: "Target",
    title: { en: "AI-Powered Entry & Exit Signals", ar: "إشارات دخول وخروج بالذكاء الاصطناعي" },
    description: {
      en: "Know exactly when to BUY and when to SELL. Our AI analyzes 200+ indicators with confidence scores.",
      ar: "اعرف متى تشتري ومتى تبيع بدقة. يحلل الذكاء الاصطناعي أكثر من 200 مؤشر مع درجة ثقة.",
    },
    bullets: [
      { en: "200+ indicators analyzed", ar: "تحليل أكثر من 200 مؤشر" },
      { en: "Confidence scoring", ar: "درجات ثقة واضحة" },
      { en: "Risk assessment", ar: "تقييم المخاطر" },
    ],
    footer: { en: "Remove emotion from trading", ar: "أخرج العاطفة من التداول" },
  },
  {
    icon: "Zap",
    title: { en: "Neural Network Momentum Engine", ar: "محرك زخم بالشبكات العصبية" },
    description: {
      en: "Predict momentum shifts before they happen. Trained on 15+ years of market data, our ML engine spots trend reversals with precision.",
      ar: "يتوقع تغيرات الزخم قبل حدوثها، مدرب على أكثر من 15 سنة من بيانات السوق لرصد انعكاسات الاتجاه بدقة.",
    },
    bullets: [
      { en: "15+ years training data", ar: "بيانات تدريب لأكثر من 15 سنة" },
      { en: "Trend reversal detection", ar: "اكتشاف انعكاس الاتجاه" },
      { en: "Order flow analysis", ar: "تحليل تدفق الأوامر" },
    ],
    footer: { en: "Stay ahead of the market", ar: "ابق متقدما على السوق" },
  },
  {
    icon: "TrendingUp",
    title: { en: "Quantum Trend Analysis", ar: "تحليل اتجاه متعدد الأطر" },
    description: {
      en: "Multi-timeframe trend detection analyzing 50+ variables. Auto-adjusts sensitivity for market conditions with fewer false signals.",
      ar: "اكتشاف الاتجاه عبر عدة أطر زمنية وتحليل أكثر من 50 متغيرا مع تقليل الإشارات الخاطئة.",
    },
    bullets: [
      { en: "Multi-timeframe analysis", ar: "تحليل متعدد الأطر" },
      { en: "Auto-adjusting sensitivity", ar: "حساسية تتكيف تلقائيا" },
      { en: "Market breadth tracking", ar: "تتبع اتساع السوق" },
    ],
    footer: { en: "Trade with the trend", ar: "تداول مع الاتجاه" },
  },
  {
    icon: "BarChart3",
    title: { en: "Algorithmic Entry Optimization", ar: "تحسين الدخول بالخوارزميات" },
    description: {
      en: "Perfect entries every time. Our AI factors in volatility, order flow, and support/resistance to maximize your risk-reward ratio.",
      ar: "دخول أدق عبر احتساب التقلب، تدفق الأوامر، والدعم والمقاومة لتحسين نسبة العائد إلى المخاطرة.",
    },
    bullets: [
      { en: "Slippage minimization", ar: "تقليل الانزلاق السعري" },
      { en: "R:R optimization", ar: "تحسين العائد إلى المخاطرة" },
      { en: "Scaling recommendations", ar: "توصيات تقسيم الصفقة" },
    ],
    footer: { en: "Maximize your profits", ar: "عظّم أرباحك" },
  },
  {
    icon: "Fish",
    title: { en: "Smart Money Breakout Detection", ar: "اكتشاف اختراقات الأموال الذكية" },
    description: {
      en: "Follow the whales. Track institutional flows, dark pool activity, and unusual options to catch breakouts before the crowd.",
      ar: "تابع حركة المؤسسات والسيولة غير المعتادة لالتقاط الاختراقات قبل الجمهور.",
    },
    bullets: [
      { en: "Dark pool monitoring", ar: "مراقبة السيولة الكبيرة" },
      { en: "Options flow analysis", ar: "تحليل تدفق الخيارات" },
      { en: "Pattern matching", ar: "مطابقة النماذج" },
    ],
    footer: { en: "Trade like the pros", ar: "تداول مثل المحترفين" },
  },
  {
    icon: "Globe",
    title: { en: "Multi-Asset Correlation Matrix", ar: "مصفوفة ترابط متعددة الأصول" },
    description: {
      en: "Cross-market intelligence. Correlate forex, crypto, commodities, and indices to identify leading indicators early.",
      ar: "ذكاء عبر الأسواق يربط الفوركس والكريبتو والسلع والمؤشرات لاكتشاف الإشارات المبكرة.",
    },
    bullets: [
      { en: "Leading indicator detection", ar: "اكتشاف المؤشرات القائدة" },
      { en: "Regime adaptation", ar: "التكيف مع ظروف السوق" },
      { en: "Pairs trading support", ar: "دعم تداول الأزواج" },
    ],
    footer: { en: "See the bigger picture", ar: "شاهد الصورة الكاملة" },
  },
];
