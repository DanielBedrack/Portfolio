import { profile } from '../../content/profile'
import { Container } from '../layout/Container'
import { SectionHeading } from '../ui/SectionHeading'
import styles from '../../styles/pages.module.css'

export function SkillsSection() {
  return (
    <section className={styles.section} aria-labelledby="skills-heading">
      <Container className={styles.splitSection}>
        <div id="skills-heading">
          <SectionHeading eyebrow="Toolbox">Skills</SectionHeading>
        </div>
        <ul className={styles.skillList}>
          {profile.skills.map((skill) => <li key={skill}>{skill}</li>)}
        </ul>
      </Container>
    </section>
  )
}
