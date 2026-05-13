import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.tradevisor.ai",
  appName: "Tradevisor AI",
  webDir: "dist",
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false,
    captureInput: true,
  },
};

export default config;
