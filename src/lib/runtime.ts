export const isProductionBuild = import.meta.env.PROD;
export const allowUnsafeLocalFallbacks = !isProductionBuild;
