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
    name: { en: "TradeVisor VIP 2 Weeks", ar: "تريدفايزر VIP أسبوعين" },
    originalPrice: "$49",
    salePrice: "$33",
    discount: "2-WEEK ACCESS",
    period: { en: "2-week VIP subscription", ar: "اشتراك VIP لمدة أسبوعين" },
    features: [
      { en: "Full VIP dashboard access for 2 weeks", ar: "دخول كامل للوحة VIP لمدة أسبوعين" },
      { en: "AI chart analyzer and agent workflow", ar: "محلل الشارت ووكلاء الذكاء الاصطناعي" },
      { en: "5 AI analyses per day", ar: "5 تحليلات بالذكاء الاصطناعي يومياً" },
    ],
    cta: { en: "Get 2-Week Access", ar: "احصل على اشتراك أسبوعين" },
  },
  {
    name: { en: "TradeVisor Monthly", ar: "تريدفايزر شهري" },
    originalPrice: "$100",
    salePrice: "$100",
    discount: "MONTHLY ACCESS",
    period: { en: "Monthly subscription - 5 analyses per day", ar: "اشتراك شهري - 5 تحليلات يومياً" },
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
    originalPrice: "$1,000",
    salePrice: "$1,000",
    discount: "YEARLY ACCESS",
    period: { en: "Yearly subscription - 5 analyses per day", ar: "اشتراك سنوي - 5 تحليلات يومياً" },
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
