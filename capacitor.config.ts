import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.tradevisor.ai",
  appName: "Tradevisor AI",
  webDir: "dist",
  bundledWebRuntime: false,
  server: {
    url: "https://tradevisortrading.com",
    cleartext: false,
    allowNavigation: ["tradevisortrading.com", "www.tradevisortrading.com"],
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
  },
};

export default config;
