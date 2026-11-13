import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Container } from '../layout/Container'
import styles from '../../styles/solarOperationsDemo.module.css'

type FlowState = 'sales' | 'operations' | 'finance' | 'review' | 'approved'
type DemoView = 'business' | 'automation'
type ScenarioState = 'idle' | 'paused' | 'approved'

const steps = [
  { id: 'sales', label: 'Sales intake' },
  { id: 'operations', label: 'Operations' },
  { id: 'finance', label: 'Finance' },
  { id: 'approval', label: 'Human approval' },
] as const

const stateContent: Record<FlowState, { owner: string; title: string; detail: string }> = {
  sales: {
    owner: 'Sales',
    title: 'New customer captured',
    detail: 'A fictional customer record is ready for the first cross-department handoff.',
  },
  operations: {
    owner: 'Operations',
    title: 'Operations handoff complete.',
    detail: 'The shared monday.com flow gives the operations team clear ownership of the next step.',
  },
  finance: {
    owner: 'Finance',
    title: 'Finance handoff complete.',
    detail: 'A sample invoice is ready for OCR, extraction and required-field validation.',
  },
  review: {
    owner: 'Finance reviewer',
    title: 'AI prepared a structured record for human review.',
    detail: 'The automation organizes extracted fields, but it cannot approve the consequential action.',
  },
  approved: {
    owner: 'Finance reviewer',
    title: 'Human approval recorded. Ready for Rivhit synchronization.',
    detail: 'The fictional record can now continue through the approved Make.com integration flow.',
  },
}

function activeStep(state: FlowState) {
  if (state === 'sales') return 0
  if (state === 'operations') return 1
  if (state === 'finance') return 2
  return 3
}

export function SolarOperationsDemo() {
  const [flowState, setFlowState] = useState<FlowState>('sales')
  const [view, setView] = useState<DemoView>('business')
  const [scenarioState, setScenarioState] = useState<ScenarioState>('idle')
  const content = stateContent[flowState]
  const currentStep = activeStep(flowState)

  function advanceFlow() {
    const nextState: Record<Exclude<FlowState, 'approved'>, FlowState> = {
      sales: 'operations',
      operations: 'finance',
      finance: 'review',
      review: 'approved',
    }

    if (flowState !== 'approved') setFlowState(nextState[flowState])
  }

  const actionLabel: Record<Exclude<FlowState, 'approved'>, string> = {
    sales: 'Move to Operations',
    operations: 'Move to Finance',
    finance: 'Process sample invoice',
    review: 'Approve record',
  }

  return (
    <section className={styles.section} aria-labelledby="solar-demo-title">
      <Container>
        <div className={styles.headingRow}>
          <div>
            <h2 className={styles.title} id="solar-demo-title">Try the solar operations flow</h2>
            <p className={styles.lead}>
              Move one fictional customer through sales, operations and finance, then see where
              automation stops and human judgment begins.
            </p>
          </div>
          <div className={styles.contextNote}>
            <p>Local simulation · No client data · No external services</p>
            <Link to="/projects/financial-document-automation">Explore the full case study</Link>
          </div>
        </div>

        <div className={styles.demo} aria-label="Solar operations interactive demo">
          <div className={styles.viewTabs} role="tablist" aria-label="Solar demo view">
            <button
              id="solar-business-tab"
              type="button"
              role="tab"
              aria-selected={view === 'business'}
              aria-controls="solar-business-panel"
              onClick={() => setView('business')}
            >
              Business flow
            </button>
            <button
              id="solar-automation-tab"
              type="button"
              role="tab"
              aria-selected={view === 'automation'}
              aria-controls="solar-automation-panel"
              onClick={() => setView('automation')}
            >
              Automation scenario
            </button>
          </div>

          {view === 'business' ? (
            <div id="solar-business-panel" role="tabpanel" aria-labelledby="solar-business-tab">
          <ol className={styles.steps} aria-label="Customer operations workflow">
            {steps.map((step, index) => (
              <li
                className={`${styles.step} ${index < currentStep ? styles.stepComplete : ''} ${
                  index === currentStep ? styles.stepActive : ''
                }`}
                key={step.id}
              >
                <span className={styles.stepNumber} aria-hidden="true">
                  {index < currentStep ? (
                    <svg viewBox="0 0 20 20" focusable="false"><path d="m4 10 4 4 8-8" /></svg>
                  ) : index + 1}
                </span>
                <span aria-current={index === currentStep ? 'step' : undefined}>{step.label}</span>
              </li>
            ))}
          </ol>

          <div className={styles.workspace}>
            <div className={styles.record}>
              <div className={styles.recordHeader}>
                <div>
                  <span className={styles.recordLabel}>Fictional customer</span>
                  <strong>Solar installation · Demo 01</strong>
                </div>
                <span className={styles.owner}>{content.owner}</span>
              </div>

              <div className={styles.recordBody} aria-live="polite">
                <span className={styles.signal} aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
                    <circle cx="12" cy="12" r="3.5" />
                  </svg>
                </span>
                <div>
                  <h3>{content.title}</h3>
                  <p>{content.detail}</p>
                </div>
              </div>

              {flowState === 'review' ? (
                <div className={styles.reviewGate}>
                  <span className={styles.gateIcon} aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false">
                      <path d="M12 3 5 6v5c0 4.6 2.8 8.2 7 10 4.2-1.8 7-5.4 7-10V6l-7-3Z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </span>
                  <div>
                    <strong>Awaiting human approval</strong>
                    <span>Required fields validated · Consequential action locked</span>
                  </div>
                </div>
              ) : null}

              {flowState === 'approved' ? (
                <div className={styles.approvedNote} role="status">
                  Approval is the final gate before the integration continues.
                </div>
              ) : null}
            </div>

            <aside className={styles.automationLog} aria-label="Automation activity">
              <span className={styles.logTitle}>Automation activity</span>
              <ul>
                <li className={currentStep >= 0 ? styles.logComplete : ''}>Customer record created</li>
                <li className={currentStep >= 1 ? styles.logComplete : ''}>Department owner updated</li>
                <li className={currentStep >= 2 ? styles.logComplete : ''}>Finance queue reached</li>
                <li className={flowState === 'review' || flowState === 'approved' ? styles.logComplete : ''}>
                  OCR and AI extraction prepared
                </li>
                <li className={flowState === 'approved' ? styles.logComplete : ''}>Human approval recorded</li>
              </ul>
            </aside>
          </div>

          <div className={styles.controls}>
            {flowState !== 'approved' ? (
              <button className={styles.primaryAction} type="button" onClick={advanceFlow}>
                {actionLabel[flowState]}
              </button>
            ) : (
              <button className={styles.primaryAction} type="button" onClick={() => setFlowState('sales')}>
                Run another simulation
              </button>
            )}
            <button className={styles.resetAction} type="button" onClick={() => setFlowState('sales')}>
              Reset flow
            </button>
          </div>
            </div>
          ) : (
            <div
              className={styles.scenarioPanel}
              id="solar-automation-panel"
              role="tabpanel"
              aria-labelledby="solar-automation-tab"
            >
              <div className={styles.scenarioHeader}>
                <div>
                  <span className={styles.scenarioLabel}>Simplified scenario canvas</span>
                  <h3>Financial document preparation</h3>
                </div>
                <span className={styles.simulationBadge}>Make-style simulation</span>
              </div>

              <div
                className={`${styles.scenarioCanvas} ${
                  scenarioState !== 'idle' ? styles.scenarioRunning : ''
                }`}
              >
                <div className={styles.module} style={{ '--module-order': 0 } as CSSProperties}>
                  <span className={`${styles.moduleIcon} ${styles.gmailIcon}`} aria-hidden="true">G</span>
                  <strong>Gmail</strong>
                  <span>Watch financial email</span>
                </div>
                <span className={styles.connection} aria-hidden="true" />
                <div className={styles.module} style={{ '--module-order': 1 } as CSSProperties}>
                  <span className={`${styles.moduleIcon} ${styles.ocrIcon}`} aria-hidden="true">O</span>
                  <strong>OCR</strong>
                  <span>Read attachment</span>
                </div>
                <span className={styles.connection} aria-hidden="true" />
                <div className={styles.module} style={{ '--module-order': 2 } as CSSProperties}>
                  <span className={`${styles.moduleIcon} ${styles.aiIcon}`} aria-hidden="true">AI</span>
                  <strong>OpenAI</strong>
                  <span>Extract required fields</span>
                </div>
                <span className={styles.connection} aria-hidden="true" />
                <div className={styles.module} style={{ '--module-order': 3 } as CSSProperties}>
                  <span className={`${styles.moduleIcon} ${styles.validationIcon}`} aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false"><path d="m6 12 4 4 8-8" /></svg>
                  </span>
                  <strong>Validation</strong>
                  <span>Check required fields</span>
                </div>
                <span className={styles.connection} aria-hidden="true" />
                <div className={styles.module} style={{ '--module-order': 4 } as CSSProperties}>
                  <span className={`${styles.moduleIcon} ${styles.mondayIcon}`} aria-hidden="true">M</span>
                  <strong>monday.com</strong>
                  <span>Create review item</span>
                </div>
              </div>

              <div className={styles.scenarioGate}>
                <div className={styles.gateState}>
                  <span className={styles.gateStateIcon} aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false">
                      <path d="M12 3 5 6v5c0 4.6 2.8 8.2 7 10 4.2-1.8 7-5.4 7-10V6l-7-3Z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </span>
                  <div aria-live="polite">
                    <strong>
                      {scenarioState === 'idle' && 'Ready to run fictional data'}
                      {scenarioState === 'paused' && 'Scenario paused for human approval.'}
                      {scenarioState === 'approved' && 'Approved. Downstream Rivhit integration is ready.'}
                    </strong>
                    <span>
                      {scenarioState === 'approved'
                        ? 'Human decision recorded'
                        : 'Consequential action requires a person'}
                    </span>
                  </div>
                </div>
                <span className={`${styles.rivhitState} ${scenarioState === 'approved' ? styles.rivhitReady : ''}`}>
                  {scenarioState === 'approved' ? 'Rivhit integration ready' : 'Rivhit integration locked'}
                </span>
              </div>

              <div className={styles.scenarioControls}>
                {scenarioState === 'idle' ? (
                  <button className={styles.primaryAction} type="button" onClick={() => setScenarioState('paused')}>
                    Run scenario
                  </button>
                ) : null}
                {scenarioState === 'paused' ? (
                  <button className={styles.primaryAction} type="button" onClick={() => setScenarioState('approved')}>
                    Approve and continue
                  </button>
                ) : null}
                {scenarioState === 'approved' ? (
                  <button className={styles.primaryAction} type="button" onClick={() => setScenarioState('idle')}>
                    Run again
                  </button>
                ) : null}
                <button className={styles.resetAction} type="button" onClick={() => setScenarioState('idle')}>
                  Reset scenario
                </button>
              </div>
            </div>
          )}
        </div>
      </Container>
    </section>
  )
}
