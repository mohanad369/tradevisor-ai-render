import type { LocalizedText } from "./features";

export interface PricingPlan {
  name: LocalizedText;
  originalPrice: string;
  salePrice: string;
  discount: string;
  period: LocalizedText;
  features: LocalizedText[];
  cta: LocalizedText;
  premium?: boolean;
}

export const pricingPlans: PricingPlan[] = [
  {
    name: { en: "TradeVisor VIP 3 Days", ar: "تريدفايزر VIP 3 أيام" },
    originalPrice: "$49",
    salePrice: "$25",
    discount: "TEST ACCESS",
    period: { en: "3-day VIP access for payment testing", ar: "دخول VIP لمدة 3 أيام لتجربة الدفع" },
    features: [
      { en: "Full VIP dashboard access for 3 days", ar: "دخول كامل للوحة VIP لمدة 3 أيام" },
      { en: "AI chart analyzer and agent workflow", ar: "محلل الشارت ووكلاء الذكاء الاصطناعي" },
      { en: "Crypto payment flow test", ar: "اختبار مسار الدفع بالكريبتو" },
    ],
    cta: { en: "Test VIP Payment", ar: "اختبار دفع VIP" },
  },
  {
    name: { en: "TradeVisor Monthly", ar: "تريدفايزر شهري" },
    originalPrice: "$99",
    salePrice: "$69",
    discount: "30% OFF",
    period: { en: "Monthly subscription - Cancel anytime", ar: "اشتراك شهري - إلغاء في أي وقت" },
    features: [
      { en: "AI-powered BUY & SELL signals", ar: "إشارات شراء وبيع بالذكاء الاصطناعي" },
      { en: "Advanced AI-powered market analysis", ar: "تحليل سوق متقدم بالذكاء الاصطناعي" },
      { en: "TradingView premium indicator integration", ar: "تكامل مؤشرات TradingView المميزة" },
      { en: "Multi-timeframe market analysis", ar: "تحليل السوق على عدة أطر زمنية" },
      { en: "24/7 automated market monitoring", ar: "مراقبة آلية للسوق 24/7" },
      { en: "Risk management & stop-loss alerts", ar: "إدارة مخاطر وتنبيهات وقف الخسارة" },
      { en: "Custom indicator settings & optimization", ar: "إعدادات مؤشرات مخصصة وتحسينها" },
      { en: "Mobile & desktop notifications", ar: "تنبيهات للموبايل والكمبيوتر" },
    ],
    cta: { en: "Get Monthly Access", ar: "احصل على الوصول الشهري" },
  },
  {
    name: { en: "TradeVisor Yearly", ar: "تريدفايزر سنوي" },
    originalPrice: "$1,200",
    salePrice: "$669",
    discount: "44% OFF",
    period: { en: "Yearly subscription - Save $531", ar: "اشتراك سنوي - وفر $531" },
    features: [
      { en: "AI-powered BUY & SELL signals", ar: "إشارات شراء وبيع بالذكاء الاصطناعي" },
      { en: "Advanced AI-powered market analysis", ar: "تحليل سوق متقدم بالذكاء الاصطناعي" },
      { en: "TradingView premium indicator integration", ar: "تكامل مؤشرات TradingView المميزة" },
      { en: "Multi-timeframe market analysis", ar: "تحليل السوق على عدة أطر زمنية" },
      { en: "24/7 automated market monitoring", ar: "مراقبة آلية للسوق 24/7" },
      { en: "Risk management & stop-loss alerts", ar: "إدارة مخاطر وتنبيهات وقف الخسارة" },
      { en: "Custom indicator settings & optimization", ar: "إعدادات مؤشرات مخصصة وتحسينها" },
      { en: "Mobile & desktop notifications", ar: "تنبيهات للموبايل والكمبيوتر" },
      { en: "Priority VIP support", ar: "دعم VIP أولوية" },
      { en: "Exclusive market insights", ar: "رؤى سوق حصرية" },
    ],
    cta: { en: "Get Yearly Access", ar: "احصل على الوصول السنوي" },
    premium: true,
  },
];
