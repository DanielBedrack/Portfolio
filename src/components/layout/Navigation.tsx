import { profile } from '../../content/profile'
import { Container } from './Container'
import styles from '../../styles/pages.module.css'

export function Navigation() {
  return (
    <header className={styles.siteHeader}>
      <Container>
        <nav className={styles.navigation} aria-label="Primary navigation">
          <a className={styles.brand} href="#top" aria-label="Daniel Bedrack, home">
            {profile.name}
          </a>
          <div className={styles.navLinks}>
            <a href="#work">Work</a>
            <a href="#experience">Experience</a>
            <a href="#contact">Contact</a>
          </div>
        </nav>
      </Container>
    </header>
  )
}
