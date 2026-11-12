import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Container } from '../layout/Container'
import styles from '../../styles/remindmeDemo.module.css'

const categories = {
  supermarket: { label: 'Supermarket', nearbyLabel: 'a supermarket' },
  pharmacy: { label: 'Pharmacy', nearbyLabel: 'a pharmacy' },
  hardware: { label: 'Hardware store', nearbyLabel: 'a hardware store' },
} as const

type Category = keyof typeof categories

interface Reminder {
  readonly item: string
  readonly category: Category
}

export function RemindMeDemo() {
  const [draft, setDraft] = useState('')
  const [category, setCategory] = useState<Category>('supermarket')
  const [reminder, setReminder] = useState<Reminder | null>(null)
  const [isNearby, setIsNearby] = useState(false)

  function addReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const item = draft.trim()
    if (!item) return
    setReminder({ item, category })
    setIsNearby(false)
  }

  function resetDemo() {
    setDraft('')
    setCategory('supermarket')
    setReminder(null)
    setIsNearby(false)
  }

  return (
    <section className={styles.section} id="demo" aria-labelledby="remindme-demo-title">
      <Container className={styles.layout}>
        <div className={styles.intro}>
          <h2 className={styles.title} id="remindme-demo-title">Try RemindMe</h2>
          <p className={styles.lead}>
            Experience a small part of the product flow: save something easy to forget,
            then simulate arriving near the right kind of store.
          </p>
          <div className={styles.explanation}>
            <p>
              This interactive example uses fictional data and runs only in your browser.
              Nothing is stored or sent anywhere.
            </p>
            <Link className={styles.caseLink} to="/projects/remindme">
              Explore the full RemindMe case study
            </Link>
          </div>
        </div>

        <div className={styles.demo} aria-label="RemindMe interactive demo">
          <header className={styles.demoHeader}>
            <div className={styles.productName}>
              <span className={styles.productMark} aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M12 21s6-5.1 6-11A6 6 0 0 0 6 10c0 5.9 6 11 6 11Z" />
                  <circle cx="12" cy="10" r="2.2" />
                </svg>
              </span>
              <div>
                <strong>RemindMe</strong>
                <span>Location-aware shopping assistant</span>
              </div>
            </div>
            <span className={styles.demoBadge}>Demo mode</span>
          </header>

          <form className={styles.form} onSubmit={addReminder}>
            <div className={styles.field}>
              <label htmlFor="remindme-demo-item">Item to remember</label>
              <input
                id="remindme-demo-item"
                value={draft}
                maxLength={60}
                placeholder="e.g. Milk"
                onChange={(event) => setDraft(event.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="remindme-demo-category">Store category</label>
              <select
                id="remindme-demo-category"
                value={category}
                onChange={(event) => setCategory(event.target.value as Category)}
              >
                {Object.entries(categories).map(([value, option]) => (
                  <option key={value} value={value}>{option.label}</option>
                ))}
              </select>
            </div>
            <button className={styles.addButton} type="submit" disabled={!draft.trim()}>
              Add reminder
            </button>
          </form>

          <div className={styles.reminderArea}>
            <div>
              <span className={styles.areaLabel}>Your reminder</span>
              {reminder ? (
                <p className={styles.reminderValue}>
                  <strong>{reminder.item}</strong>
                  <span>{categories[reminder.category].label}</span>
                </p>
              ) : (
                <p className={styles.empty}>No reminder added yet</p>
              )}
            </div>
            <svg
              className={`${styles.proximityGraphic} ${reminder ? styles.proximityReady : ''}`}
              viewBox="0 0 64 64"
              aria-hidden="true"
            >
              <circle className={styles.proximityRing} cx="32" cy="32" r="24" />
              <circle className={styles.proximityRing} cx="32" cy="32" r="15" />
              <circle className={styles.proximityPoint} cx="32" cy="32" r="4" />
            </svg>
          </div>

          <div
            className={`${styles.map} ${isNearby ? styles.mapNearby : ''}`}
            role="img"
            aria-label={
              isNearby && reminder
                ? `Map showing your location near ${categories[reminder.category].nearbyLabel}`
                : 'Map showing your location away from the selected store'
            }
          >
            <svg className={styles.mapCanvas} viewBox="0 0 560 220" aria-hidden="true">
              <path className={styles.mapBlock} d="M-18 18 158-16l38 88L28 118Z" />
              <path className={styles.mapBlock} d="m236-10 150 26-24 86-156-22Z" />
              <path className={styles.mapBlock} d="m436 22 150 8-12 78-160-7Z" />
              <path className={styles.mapBlock} d="m-18 164 170-34 30 106H-18Z" />
              <path className={styles.mapBlock} d="m223 118 147 12-2 112-168-13Z" />
              <path className={styles.mapBlock} d="m418 135 166-12v112H400Z" />
              <path className={styles.mapRoad} d="M-12 142C97 126 166 90 255 102s166 45 318 4" />
              <path className={styles.mapRoad} d="M194-20c-4 88 15 157 30 260" />
              <path className={styles.mapRoad} d="M402-20c1 91-10 164-20 260" />
              <path className={styles.route} d="M105 184c65-3 84-52 146-62s121 25 196-45" />
            </svg>

            <div className={styles.storeMarker} aria-hidden="true">
              <span className={styles.markerPin}>
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M5 9h14l-1.2-4H6.2L5 9Z" />
                  <path d="M7 9v10h10V9M9.5 19v-5h5v5" />
                </svg>
              </span>
              <span>{reminder ? categories[reminder.category].label : 'Selected store'}</span>
            </div>

            <div className={styles.userMarker} aria-hidden="true">
              <span className={styles.userPulse} />
              <span className={styles.userDot} />
              <span className={styles.userLabel}>You are here</span>
            </div>

            <span className={styles.mapCaption} aria-hidden="true">Fictional map · Demo only</span>
          </div>

          <div className={styles.simulationControls}>
            <button
              className={styles.simulateButton}
              type="button"
              disabled={!reminder}
              onClick={() => setIsNearby(true)}
            >
              Simulate nearby store
            </button>
            <button className={styles.resetButton} type="button" onClick={resetDemo}>
              Reset demo
            </button>
          </div>

          {reminder && isNearby ? (
            <div className={styles.notification} role="status">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM9.5 20h5" />
              </svg>
              <p>
                You're near {categories[reminder.category].nearbyLabel} — don't forget{' '}
                <strong>{reminder.item}</strong>.
              </p>
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  )
}
