import { useEffect } from 'react'
import { profile } from '../content/profile'
import type { RouteMeta } from '../app/routeMeta'

function upsertMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.append(element)
  }
  element.content = content
}

export function Seo({ meta }: { readonly meta: RouteMeta }) {
  useEffect(() => {
    const canonicalUrl = `${window.location.origin}${meta.canonicalPath}`
    document.title = meta.title
    upsertMeta('name', 'description', meta.description)
    upsertMeta('property', 'og:title', meta.title)
    upsertMeta('property', 'og:description', meta.description)
    upsertMeta('property', 'og:type', meta.type)
    upsertMeta('property', 'og:url', canonicalUrl)
    upsertMeta('property', 'og:image', `${window.location.origin}/Portfolio/og-default.png`)

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.append(canonical)
    }
    canonical.href = canonicalUrl

    let structuredData = document.head.querySelector<HTMLScriptElement>(
      'script[type="application/ld+json"]',
    )
    if (!structuredData) {
      structuredData = document.createElement('script')
      structuredData.type = 'application/ld+json'
      document.head.append(structuredData)
    }
    structuredData.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: profile.name,
      jobTitle: profile.title,
      email: `mailto:${profile.email}`,
      sameAs: [profile.linkedIn, profile.github],
      url: `${window.location.origin}/Portfolio/`,
    })
  }, [meta])

  return null
}
