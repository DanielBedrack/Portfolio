import { profile } from '../../content/profile'
import { Container } from './Container'
import styles from '../../styles/pages.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <Container className={styles.footerInner}>
        <p>© {new Date().getFullYear()} {profile.name}</p>
        <p>Automation systems, technical delivery and thoughtful software.</p>
      </Container>
    </footer>
  )
}
