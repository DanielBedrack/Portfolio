import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Container } from '../layout/Container'
import styles from '../../styles/crmEcosystemDemo.module.css'

type RoleId = 'service' | 'contracts' | 'property' | 'operations'
type SyncState = 'idle' | 'synced' | 'duplicate'

type Field = {
  label: string
  value: string
  restricted?: boolean
}

const roles: ReadonlyArray<{
  id: RoleId
  label: string
  description: string
  fields: readonly Field[]
}> = [
  {
    id: 'service',
    label: 'Customer Service',
    description: 'A focused customer view for managing apartment interest and contact activity.',
    fields: [
      { label: 'Apartment interest', value: 'North Residence · 4 rooms' },
      { label: 'Customer contact history', value: 'ManyChat · Follow-up requested' },
      { label: 'Contract stage', value: 'Not available for this role', restricted: true },
    ],
  },
  {
    id: 'contracts',
    label: 'Contracts',
    description: 'The contracts team sees the agreement workflow without unrelated service details.',
    fields: [
      { label: 'Contract stage', value: 'Draft under review' },
      { label: 'Apartment', value: 'North Residence · A-204' },
      { label: 'Customer contact history', value: 'Not available for this role', restricted: true },
    ],
  },
  {
    id: 'property',
    label: 'Property Manager',
    description: 'Property context stays connected to the customer and contract record.',
    fields: [
      { label: 'Property', value: 'North Residence' },
      { label: 'Apartment', value: 'A-204 · 4 rooms' },
      { label: 'Contract stage', value: 'Not available for this role', restricted: true },
    ],
  },
  {
    id: 'operations',
    label: 'VP Operations',
    description: 'Leadership visibility connects departments, synchronization and reporting.',
    fields: [
      { label: 'Workflow status', value: 'Contract review' },
      { label: 'Connected departments', value: 'Service · Contracts · Property' },
      { label: 'Sync health', value: 'Ready for simulation' },
    ],
  },
]

const syncMessage: Record<Exclude<SyncState, 'idle'>, string> = {
  synced: 'Fireberry CRM updated from Priority.',
  duplicate: 'Duplicate prevented. Existing record matched by unique ID.',
}

export function CrmEcosystemDemo() {
  const [role, setRole] = useState<RoleId>('service')
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const activeRole = roles.find((item) => item.id === role) ?? roles[0]

  function runSync() {
    setSyncState((current) => (current === 'idle' ? 'synced' : 'duplicate'))
  }

  return (
    <section className={styles.section} id="crm-demo" aria-labelledby="crm-demo-title">
      <Container>
        <div className={styles.headingRow}>
          <div>
            <span className={styles.eyebrow}>Interactive system demo</span>
            <h2 className={styles.title} id="crm-demo-title">Try the CRM ecosystem</h2>
            <p className={styles.lead}>
              Switch roles to see how one connected record becomes a focused workspace for each team,
              then run a simplified synchronization flow.
            </p>
          </div>
          <div className={styles.contextNote}>
            <p>Fictional data · Local simulation · No external services</p>
            <Link to="/projects/real-estate-company">Explore the full CRM case study</Link>
          </div>
        </div>

        <div className={styles.demo}>
          <header className={styles.appBar}>
            <div className={styles.brand}>
              <span className={styles.brandMark} aria-hidden="true">D</span>
              <div>
                <strong>Demo CRM</strong>
                <span>Role-aware customer workspace</span>
              </div>
            </div>
            <span className={styles.demoBadge}>SIMULATION</span>
          </header>

          <div className={styles.integrationPath} aria-label="Simplified integration path">
            <div><span>P</span><strong>Priority</strong></div>
            <i aria-hidden="true">→</i>
            <div><span>M</span><strong>Make.com</strong></div>
            <i aria-hidden="true">→</i>
            <div><span>F</span><strong>Fireberry CRM</strong></div>
          </div>

          <div className={styles.workspace}>
            <aside className={styles.roleRail}>
              <span className={styles.railLabel}>View as</span>
              <div className={styles.roleTabs} role="tablist" aria-label="CRM role view">
                {roles.map((item) => (
                  <button
                    key={item.id}
                    id={`crm-${item.id}-tab`}
                    type="button"
                    role="tab"
                    aria-selected={role === item.id}
                    aria-controls="crm-role-panel"
                    onClick={() => setRole(item.id)}
                  >
                    <span aria-hidden="true">{item.label.charAt(0)}</span>
                    {item.label}
                  </button>
                ))}
              </div>
              <div className={styles.permissionNote}>
                <strong>Permission model</strong>
                <span>Each role sees only the information needed for its work.</span>
              </div>
            </aside>

            <div
              className={styles.recordPanel}
              id="crm-role-panel"
              role="tabpanel"
              aria-labelledby={`crm-${role}-tab`}
            >
              <div className={styles.recordHeader}>
                <div>
                  <span className={styles.recordType}>Customer record</span>
                  <h3>Maya Levi</h3>
                  <span className={styles.recordId}>Unique ID · CRM-2048</span>
                </div>
                <span className={styles.roleBadge}>{activeRole.label}</span>
              </div>

              <p className={styles.roleDescription}>{activeRole.description}</p>

              <div className={styles.fieldGrid} aria-live="polite">
                {activeRole.fields.map((field) => (
                  <div
                    className={`${styles.field} ${field.restricted ? styles.restricted : ''}`}
                    data-access={field.restricted ? 'restricted' : 'available'}
                    key={field.label}
                  >
                    <span data-access={field.restricted ? 'restricted' : 'available'}>{field.label}</span>
                    <strong>{field.value}</strong>
                    {field.restricted ? <small>Restricted by role permissions</small> : null}
                  </div>
                ))}
              </div>
            </div>

            <aside className={styles.syncPanel} aria-label="Synchronization activity">
              <div>
                <span className={styles.railLabel}>Integration activity</span>
                <h3>Reliable record sync</h3>
                <p>One fictional record moves through the approved integration logic.</p>
              </div>

              <ol className={styles.syncSteps}>
                <li className={syncState !== 'idle' ? styles.complete : ''}>
                  <span>1</span><div><strong>Match unique ID</strong><small>CRM-2048</small></div>
                </li>
                <li className={syncState !== 'idle' ? styles.complete : ''}>
                  <span>2</span><div><strong>Update CRM record</strong><small>Preserve one source of truth</small></div>
                </li>
                <li className={syncState === 'duplicate' ? styles.complete : ''}>
                  <span>3</span><div><strong>Prevent duplicate</strong><small>Reuse the existing match</small></div>
                </li>
              </ol>

              {syncState !== 'idle' ? (
                <div className={styles.syncStatus} role="status">
                  <span aria-hidden="true">✓</span>
                  <p>{syncMessage[syncState]}</p>
                </div>
              ) : null}

              <button className={styles.syncButton} type="button" onClick={runSync}>
                {syncState === 'idle' ? 'Simulate sync' : 'Run same sync again'}
              </button>
              <button className={styles.resetButton} type="button" onClick={() => setSyncState('idle')}>
                Reset simulation
              </button>
            </aside>
          </div>
        </div>
      </Container>
    </section>
  )
}
