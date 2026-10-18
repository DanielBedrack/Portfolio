import { Link } from 'react-router-dom'
import { Container } from '../components/layout/Container'
import styles from '../styles/pages.module.css'

export function NotFoundPage() {
  return (
    <main className={styles.notFound}>
      <Container className={styles.notFoundInner}>
        <p className={styles.kicker}>404</p>
        <h1>Page not found</h1>
        <p>The page you requested does not exist, but the portfolio is still right here.</p>
        <div className={styles.heroActions}>
          <Link to="/">Return home</Link>
          <Link to="/#work">View projects</Link>
        </div>
      </Container>
    </main>
  )
}
