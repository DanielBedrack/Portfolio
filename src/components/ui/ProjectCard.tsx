import { Link } from 'react-router-dom'
import type { Project } from '../../content/types'
import styles from '../../styles/components.module.css'

interface ProjectCardProps {
  readonly project: Project
  readonly featured?: boolean
}

export function ProjectCard({ project, featured = false }: ProjectCardProps) {
  const status = project.status === 'work-in-progress' ? 'Work in progress' : 'Completed'

  return (
    <article className={`${styles.card} ${featured ? styles.featured : ''}`.trim()}>
      <div className={styles.cardHeader}>
        <span className={styles.status}>{status}</span>
        {project.clientDisplayName && <span>{project.clientDisplayName}</span>}
      </div>
      {project.image && <img src={project.image.src} alt={project.image.alt} />}
      <h3 className={styles.cardTitle}>{project.title}</h3>
      <p className={styles.cardSummary}>{project.summary}</p>
      <Link
        className={styles.cardLink}
        to={`/projects/${project.slug}`}
        aria-label={`Read case study: ${project.title}`}
      >
        Read case study <span aria-hidden="true">→</span>
      </Link>
    </article>
  )
}
