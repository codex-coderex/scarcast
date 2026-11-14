import type { PropsWithChildren } from 'react'
import { domAnimation, LazyMotion, MotionConfig, useReducedMotion } from 'framer-motion'

export default function DashboardMotion({ children }: PropsWithChildren) {
  const reduceMotion = useReducedMotion()
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user" transition={{ duration: reduceMotion ? 0 : 0.16, ease: 'easeOut' }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  )
}
