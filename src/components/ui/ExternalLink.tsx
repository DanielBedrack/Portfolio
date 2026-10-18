import type { AnchorHTMLAttributes, PropsWithChildren } from 'react'

type ExternalLinkProps = PropsWithChildren<
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'target' | 'rel'>
>

export function ExternalLink({ children, ...props }: ExternalLinkProps) {
  return (
    <a target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  )
}
