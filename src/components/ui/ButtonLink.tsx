import type { AnchorHTMLAttributes, PropsWithChildren } from 'react'
import styles from '../../styles/components.module.css'

interface ButtonLinkProps
  extends PropsWithChildren<AnchorHTMLAttributes<HTMLAnchorElement>> {
  readonly variant?: 'primary' | 'secondary'
}

export function ButtonLink({
  children,
  className = '',
  variant = 'primary',
  ...props
}: ButtonLinkProps) {
  return (
    <a
      className={`${styles.buttonLink} ${styles[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </a>
  )
}
