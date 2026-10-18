import { Link, useParams } from 'react-router-dom'
import { Footer } from '../components/layout/Footer'
import { Container } from '../components/layout/Container'
import { ButtonLink } from '../components/ui/ButtonLink'
import { ExternalLink } from '../components/ui/ExternalLink'
import { getRouteMeta } from '../app/routeMeta'
import { getProjectBySlug } from '../content/projects'
import type { Project } from '../content/types'
import styles from '../styles/pages.module.css'
import { NotFoundPage } from './NotFoundPage'
import { Seo } from '../seo/Seo'

interface ProjectPageProps {
  readonly project?: Project
}

export function ProjectPage({ project: suppliedProject }: ProjectPageProps = {}) {
  const { slug } = useParams()
  const project = suppliedProject ?? (slug ? getProjectBySlug(slug) : undefined)

  if (!project) return <NotFoundPage />

  const status = project.status === 'work-in-progress' ? 'Work in Progress' : 'Completed project'

  return (
    <>
      <Seo meta={getRouteMeta(`/projects/${project.slug}`)} />
      <main>
        <header className={styles.caseHero}>
          <Container className={styles.caseHeroInner}>
            <Link className={styles.backLink} to="/#work" aria-label="Back to all projects">
              <span aria-hidden="true">← </span>Back to all projects
            </Link>
            <p className={styles.kicker}>{status}</p>
            <h1 className={styles.caseTitle}>{project.title}</h1>
            <p className={styles.caseSummary}>{project.summary}</p>
            {project.image && <img src={project.image.src} alt={project.image.alt} />}
          </Container>
        </header>

        <Container className={styles.caseBody}>
          <section>
            <h2>{project.context.heading}</h2>
            {project.context.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>
          <section>
            <h2>My role</h2>
            <p>{project.role}</p>
            {project.collaboration && <p>{project.collaboration}</p>}
          </section>
          <section>
            <h2>{project.constraints.heading}</h2>
            {project.constraints.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>
          <section>
            <h2>System flow</h2>
            <ol className={styles.flowList}>
              {project.flow.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </section>
          <section>
            <h2>Key challenge</h2>
            <p>{project.challenge}</p>
          </section>
          <section>
            <h2>{project.solution.heading}</h2>
            {project.solution.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>
          <section>
            <h2>Technologies</h2>
            <ul className={styles.skillList}>
              {project.technologies.map((technology) => <li key={technology}>{technology}</li>)}
            </ul>
          </section>
          <section>
            <h2>Outcome</h2>
            <p>{project.outcome}</p>
          </section>
          {project.verificationLimits && (
            <section className={styles.limitations}>
              <h2>Verification limits</h2>
              <ul>
                {project.verificationLimits.map((limit) => <li key={limit}>{limit}</li>)}
              </ul>
            </section>
          )}
          {project.links && (
            <section>
              <h2>Related links</h2>
              {project.links.map((link) => (
                <ExternalLink key={link.href} href={link.href} className={`${styles.externalButton} ${styles.secondaryButton}`}>
                  {link.label}
                </ExternalLink>
              ))}
            </section>
          )}
        </Container>

        <section className={styles.caseContact} aria-label="Contact Daniel">
          <Container>
            <h2>Have a process that needs a reliable system?</h2>
            <ButtonLink href="/Portfolio/#contact">Contact Me</ButtonLink>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  )
}
