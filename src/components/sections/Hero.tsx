import { profile } from '../../content/profile'
import { Container } from '../layout/Container'
import { ButtonLink } from '../ui/ButtonLink'
import styles from '../../styles/pages.module.css'

export function Hero() {
  return (
    <section className={styles.hero} id="top" aria-labelledby="hero-title">
      <Container className={styles.heroInner}>
        <div className={`${styles.heroCopy} motion-enter`}>
          <p className={styles.kicker}>{profile.name}</p>
          <h1 id="hero-title" className={styles.heroTitle}>{profile.title}</h1>
          <p className={styles.heroLead}>{profile.valueProposition}</p>
          <p className={styles.availability}>{profile.availability}</p>
          <div className={styles.heroActions}>
            <ButtonLink href="#work">View My Work</ButtonLink>
            <ButtonLink
              href="/portfolio/Daniel-Bedrack-CV-2026.pdf"
              variant="secondary"
            >
              Download Resume
            </ButtonLink>
            <ButtonLink href="#contact" variant="secondary">Contact Me</ButtonLink>
          </div>
        </div>
        <aside className={`${styles.heroNote} motion-enter`} aria-label="What I bring">
          <span className={styles.noteNumber}>01</span>
          <p>Hands-on development with ownership from process discovery to rollout and support.</p>
        </aside>
      </Container>
    </section>
  )
}
