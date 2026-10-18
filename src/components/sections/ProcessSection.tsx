import { profile } from '../../content/profile'
import { Container } from '../layout/Container'
import { SectionHeading } from '../ui/SectionHeading'
import styles from '../../styles/pages.module.css'

export function ProcessSection() {
  return (
    <section className={`${styles.section} ${styles.inkSection}`} aria-label="How I work">
      <Container>
        <div id="process-heading">
          <SectionHeading eyebrow="End-to-end ownership">How I work</SectionHeading>
        </div>
        <ol className={styles.processFlow}>
          {profile.process.map((step) => <li key={step}>{step}</li>)}
        </ol>
        <div className={styles.processDetails}>
          {profile.howIWork.map((section) => (
            <article key={section.heading}>
              <h3>{section.heading}</h3>
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}
