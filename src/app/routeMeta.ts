import { getProjectBySlug } from '../content/projects'

export interface RouteMeta {
  readonly title: string
  readonly description: string
  readonly canonicalPath: string
  readonly type: 'profile' | 'article' | 'website'
}

const basePath = '/portfolio'

export function getRouteMeta(pathname: string): RouteMeta {
  const normalizedPath = pathname === '/' ? '/' : pathname.replace(/\/$/, '')

  if (normalizedPath === '/') {
    return {
      title: 'Daniel Bedrack | AI & Automation Developer',
      description:
        'Portfolio of Daniel Bedrack, an AI and automation developer and technical project manager based in Israel.',
      canonicalPath: `${basePath}/`,
      type: 'profile',
    }
  }

  const projectMatch = normalizedPath.match(/^\/projects\/([^/]+)$/)
  const project = projectMatch ? getProjectBySlug(projectMatch[1]) : undefined

  if (project) {
    return {
      title: `${project.shortTitle} | Daniel Bedrack`,
      description: project.summary,
      canonicalPath: `${basePath}/projects/${project.slug}`,
      type: 'article',
    }
  }

  return {
    title: 'Page not found | Daniel Bedrack',
    description: 'The requested page could not be found in Daniel Bedrack’s portfolio.',
    canonicalPath: `${basePath}${normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`}`,
    type: 'website',
  }
}
