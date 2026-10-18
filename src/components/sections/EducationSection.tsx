import { profile } from '../../content/profile'
import { Container } from '../layout/Container'
import { SectionHeading } from '../ui/SectionHeading'
import styles from '../../styles/pages.module.css'

export function EducationSection() {
  return (
    <section className={styles.section} aria-labelledby="education-heading">
      <Container>
        <div id="education-heading">
          <SectionHeading eyebrow="Foundation">Education</SectionHeading>
        </div>
        <div className={styles.educationGrid}>
          {profile.education.map((item) => (
            <article key={item.program}>
              <h3>{item.program}</h3>
              <p>{item.institution}</p>
              <p className={styles.dates}>{item.start} — {item.end}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}
