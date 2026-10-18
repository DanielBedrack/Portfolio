import { profile } from '../../content/profile'
import { Container } from '../layout/Container'
import { ButtonLink } from '../ui/ButtonLink'
import { SectionHeading } from '../ui/SectionHeading'
import styles from '../../styles/pages.module.css'

export function ContactSection() {
  const emailHref = `mailto:${profile.email}?subject=${encodeURIComponent('Full-time opportunity — Daniel Bedrack')}`

  return (
    <section className={`${styles.section} ${styles.contact}`} id="contact" aria-labelledby="contact-heading">
      <Container className={styles.contactInner}>
        <div id="contact-heading">
          <SectionHeading eyebrow="Open to full-time opportunities">Let’s build a system people trust.</SectionHeading>
        </div>
        <p>If your team needs someone who can understand the operation, build the automation and own delivery, I’d be glad to talk.</p>
        <div className={styles.heroActions}>
          <ButtonLink href={emailHref}>Email Daniel</ButtonLink>
          <ButtonLink href={profile.linkedIn} target="_blank" rel="noreferrer" variant="secondary">LinkedIn</ButtonLink>
          <ButtonLink href={profile.github} target="_blank" rel="noreferrer" variant="secondary">GitHub</ButtonLink>
        </div>
      </Container>
    </section>
  )
}
