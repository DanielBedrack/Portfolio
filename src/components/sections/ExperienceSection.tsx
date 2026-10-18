import { profile } from '../../content/profile'
import { Container } from '../layout/Container'
import { SectionHeading } from '../ui/SectionHeading'
import styles from '../../styles/pages.module.css'

export function ExperienceSection() {
  return (
    <section className={styles.section} id="experience" aria-labelledby="experience-heading">
      <Container>
        <div id="experience-heading">
          <SectionHeading eyebrow="Professional experience">Systems built around real work</SectionHeading>
        </div>
        <div className={styles.timeline}>
          {profile.experience.map((item) => (
            <article className={styles.timelineItem} key={`${item.company}-${item.role}`}>
              <div>
                <h3>{item.company}</h3>
                <p className={styles.role}>{item.role}</p>
              </div>
              <p className={styles.dates}>{item.start} — {item.end}</p>
              <p className={styles.timelineSummary}>{item.summary}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}
