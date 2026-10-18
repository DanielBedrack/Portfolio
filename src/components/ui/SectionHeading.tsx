import type { PropsWithChildren } from 'react'
import styles from '../../styles/components.module.css'

interface SectionHeadingProps extends PropsWithChildren {
  readonly level?: 2 | 3
  readonly eyebrow?: string
}

export function SectionHeading({
  children,
  eyebrow,
  level = 2,
}: SectionHeadingProps) {
  const Heading = `h${level}` as const

  return (
    <div className={styles.sectionHeading}>
      {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
      <Heading className={styles.heading}>{children}</Heading>
    </div>
  )
}
