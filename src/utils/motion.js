// Shared motion helpers
export const motion = { first: true } // true until the first page intro has finished

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches