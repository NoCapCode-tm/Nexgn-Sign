import { useLayoutEffect } from 'react'
import { gsap } from 'gsap'

export default function useNotFoundAnimations(rootRef) {
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return undefined

    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const img = root.querySelector('[data-nf="img"]')
      const textNodes = gsap.utils.toArray(root.querySelectorAll('[data-nf="text"]'))

      // Entrance animation
      gsap.fromTo(
        img,
        { autoAlpha: 0, y: 40, scale: 0.95 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 1.2, ease: 'expo.out' },
      )

      gsap.fromTo(
        textNodes,
        { autoAlpha: 0, y: 20 },
        { autoAlpha: 1, y: 0, duration: 1, stagger: 0.15, ease: 'power3.out', delay: 0.2 },
      )

      // Continuous gentle float for the illustration
      gsap.to(img, {
        y: -14,
        duration: 2.5,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: 1.2,
      })
    })

    return () => mm.revert()
  }, [rootRef])
}