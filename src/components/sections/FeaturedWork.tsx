import { projects } from '../../content/projects'
import { Container } from '../layout/Container'
import { ProjectCard } from '../ui/ProjectCard'
import { SectionHeading } from '../ui/SectionHeading'
import styles from '../../styles/pages.module.css'

export function FeaturedWork() {
  return (
    <section className={styles.section} id="work" aria-label="Featured work">
      <Container>
        <div id="work-heading">
          <SectionHeading eyebrow="Selected systems">Featured work</SectionHeading>
        </div>
        <div className={styles.projectGrid}>
          {projects.map((project, index) => (
            <ProjectCard key={project.slug} project={project} featured={index === 0} />
          ))}
        </div>
      </Container>
    </section>
  )
}
