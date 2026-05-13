// Analytics & Tracking Setup
// Facebook Pixel + Google Analytics + Open Graph

type FbqFunction = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
  push?: FbqFunction;
};

declare global {
  interface Window {
    fbq?: FbqFunction;
    _fbq?: FbqFunction;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function initFacebookPixel(pixelId: string) {
  if (!pixelId || import.meta.env.DEV) return;

  if (!window.fbq) {
    const fbq: FbqFunction = (...args: unknown[]) => {
      if (fbq.callMethod) {
        fbq.callMethod(...args);
      } else {
        fbq.queue?.push(args);
      }
    };

    fbq.queue = [];
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    window.fbq = fbq;
    window._fbq = fbq;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }

  window.fbq("init", pixelId);
  window.fbq("track", "PageView");
}

export function fbTrack(event: string, params?: Record<string, unknown>) {
  if (typeof window.fbq === "function") {
    window.fbq("track", event, params);
  }
}

export function initGoogleAnalytics(gaId: string) {
  if (!gaId || import.meta.env.DEV) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = (...args: unknown[]) => {
    window.dataLayer?.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", gaId);
}

export function gaTrack(event: string, params?: Record<string, unknown>) {
  if (typeof window.gtag === "function") {
    window.gtag("event", event, params);
  }
}

export function trackVIPSubscribe(plan: string, value: number) {
  fbTrack("Subscribe", { content_name: plan, value, currency: "USD" });
  gaTrack("vip_subscribe", { plan, value });
}

export function trackVIPLogin() {
  fbTrack("CompleteRegistration");
  gaTrack("vip_login");
}

export function trackPaymentSubmit(amount: string) {
  fbTrack("InitiateCheckout", { value: parseFloat(amount.replace("$", "")), currency: "USD" });
  gaTrack("payment_submit", { amount });
}

export function trackPageView(page: string) {
  fbTrack("PageView", { page });
  gaTrack("page_view", { page_title: page });
}
