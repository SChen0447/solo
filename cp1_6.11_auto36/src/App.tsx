import { useState, useEffect } from 'react'
import ModelViewer from './components/ModelViewer'
import StepPanel from './components/StepPanel'
import { totalSteps } from './data/steps'

export default function App() {
  const [currentStep, setCurrentStep] = useState(totalSteps)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleStepChange = (step: number) => {
    if (step >= 1 && step <= totalSteps) {
      setCurrentStep(step)
    }
  }

  return (
    <div style={styles.appContainer}>
      {isMobile ? (
        <div style={styles.mobileLayout}>
          <div style={styles.mobileTop}>
            <div style={styles.progressBarOverlay}>
              <MobileProgressBar 
                currentStep={currentStep} 
                onStepChange={handleStepChange}
                totalSteps={totalSteps}
              />
            </div>
            <ModelViewer currentStep={currentStep} />
          </div>
          <div style={styles.mobileBottom}>
            <StepPanel 
              currentStep={currentStep} 
              isMobile={isMobile}
            />
          </div>
        </div>
      ) : (
        <div style={styles.desktopLayout}>
          <div style={styles.modelSection}>
            <div style={styles.progressBarOverlay}>
              <DesktopProgressBar 
                currentStep={currentStep} 
                onStepChange={handleStepChange}
                totalSteps={totalSteps}
              />
            </div>
            <ModelViewer currentStep={currentStep} />
          </div>
          <div style={styles.panelSection}>
            <StepPanel 
              currentStep={currentStep} 
              isMobile={isMobile}
            />
          </div>
        </div>
      )}
    </div>
  )
}

interface ProgressBarProps {
  currentStep: number
  onStepChange: (step: number) => void
  totalSteps: number
}

function DesktopProgressBar({ currentStep, onStepChange, totalSteps }: ProgressBarProps) {
  const dots = Array.from({ length: totalSteps }, (_, i) => i + 1)
  
  const handlePrev = () => {
    if (currentStep > 1) onStepChange(currentStep - 1)
  }
  
  const handleNext = () => {
    if (currentStep < totalSteps) onStepChange(currentStep + 1)
  }

  return (
    <div style={desktopProgressStyles.container}>
      <button
        style={{
          ...desktopProgressStyles.navButton,
          ...(currentStep === 1 ? desktopProgressStyles.navButtonDisabled : {}),
        }}
        onClick={handlePrev}
        disabled={currentStep === 1}
        onMouseDown={(e) => {
          if (currentStep !== 1) e.currentTarget.style.transform = 'scale(0.95)'
        }}
        onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      
      <div style={desktopProgressStyles.dotsContainer}>
        {dots.map((stepNum) => (
          <button
            key={stepNum}
            style={{
              ...desktopProgressStyles.dot,
              ...(stepNum < currentStep ? desktopProgressStyles.dotCompleted : {}),
              ...(stepNum === currentStep ? desktopProgressStyles.dotCurrent : {}),
              ...(stepNum > currentStep ? desktopProgressStyles.dotPending : {}),
            }}
            onClick={() => onStepChange(stepNum)}
            title={`步骤 ${stepNum}`}
          />
        ))}
      </div>
      
      <button
        style={{
          ...desktopProgressStyles.navButton,
          ...(currentStep === totalSteps ? desktopProgressStyles.navButtonDisabled : {}),
        }}
        onClick={handleNext}
        disabled={currentStep === totalSteps}
        onMouseDown={(e) => {
          if (currentStep !== totalSteps) e.currentTarget.style.transform = 'scale(0.95)'
        }}
        onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>
  )
}

function MobileProgressBar({ currentStep, onStepChange, totalSteps }: ProgressBarProps) {
  const dots = Array.from({ length: totalSteps }, (_, i) => i + 1)
  
  const handlePrev = () => {
    if (currentStep > 1) onStepChange(currentStep - 1)
  }
  
  const handleNext = () => {
    if (currentStep < totalSteps) onStepChange(currentStep + 1)
  }

  return (
    <div style={mobileProgressStyles.container}>
      <button
        style={{
          ...mobileProgressStyles.navButton,
          ...(currentStep === 1 ? mobileProgressStyles.navButtonDisabled : {}),
        }}
        onClick={handlePrev}
        disabled={currentStep === 1}
        onTouchStart={(e) => {
          if (currentStep !== 1) e.currentTarget.style.transform = 'scale(0.95)'
        }}
        onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      
      <div style={mobileProgressStyles.dotsContainer}>
        {dots.map((stepNum) => (
          <button
            key={stepNum}
            style={{
              ...mobileProgressStyles.dot,
              ...(stepNum < currentStep ? mobileProgressStyles.dotCompleted : {}),
              ...(stepNum === currentStep ? mobileProgressStyles.dotCurrent : {}),
              ...(stepNum > currentStep ? mobileProgressStyles.dotPending : {}),
            }}
            onClick={() => onStepChange(stepNum)}
          />
        ))}
      </div>
      
      <button
        style={{
          ...mobileProgressStyles.navButton,
          ...(currentStep === totalSteps ? mobileProgressStyles.navButtonDisabled : {}),
        }}
        onClick={handleNext}
        disabled={currentStep === totalSteps}
        onTouchStart={(e) => {
          if (currentStep !== totalSteps) e.currentTarget.style.transform = 'scale(0.95)'
        }}
        onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, #0a0a2e 0%, #1a0a2e 100%)',
  },
  desktopLayout: {
    display: 'flex',
    width: '100%',
    height: '100%',
  },
  modelSection: {
    width: '70%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  panelSection: {
    width: '30%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '20px',
    boxSizing: 'border-box',
  },
  mobileLayout: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
  },
  mobileTop: {
    height: '60%',
    position: 'relative',
    overflow: 'hidden',
  },
  mobileBottom: {
    height: '40%',
    display: 'flex',
    flexDirection: 'column',
  },
  progressBarOverlay: {
    position: 'absolute',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10,
    width: '90%',
    maxWidth: '500px',
  },
}

const desktopProgressStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '50px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  },
  dotsContainer: {
    display: 'flex',
    gap: '6px',
    flex: 1,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  dot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    transition: 'all 0.3s ease',
  },
  dotCompleted: {
    backgroundColor: '#66ff99',
    boxShadow: '0 0 6px rgba(102, 255, 153, 0.6)',
  },
  dotCurrent: {
    backgroundColor: '#7b2ff7',
    boxShadow: '0 0 12px rgba(123, 47, 247, 0.8)',
  },
  dotPending: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  navButton: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    background: 'linear-gradient(135deg, #4a9eff 0%, #7b2ff7 100%)',
    transition: 'all 0.1s ease',
    boxShadow: '0 2px 10px rgba(74, 158, 255, 0.3)',
    flexShrink: 0,
  },
  navButtonDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
    background: 'rgba(255, 255, 255, 0.1)',
  },
}

const mobileProgressStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    borderRadius: '40px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  dotsContainer: {
    display: 'flex',
    gap: '4px',
    flex: 1,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    transition: 'all 0.3s ease',
    minWidth: '10px',
  },
  dotCompleted: {
    backgroundColor: '#66ff99',
  },
  dotCurrent: {
    backgroundColor: '#7b2ff7',
    boxShadow: '0 0 10px rgba(123, 47, 247, 0.8)',
  },
  dotPending: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  navButton: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    background: 'linear-gradient(135deg, #4a9eff 0%, #7b2ff7 100%)',
    transition: 'all 0.1s ease',
    flexShrink: 0,
    padding: 0,
  },
  navButtonDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
    background: 'rgba(255, 255, 255, 0.1)',
  },
}

const pulseStyleSheet = document.createElement('style')
pulseStyleSheet.textContent = `
  @keyframes pulseDot {
    0%, 100% {
      box-shadow: 0 0 12px rgba(123, 47, 247, 0.8), 0 0 20px rgba(74, 158, 255, 0.4);
      transform: scale(1);
    }
    50% {
      box-shadow: 0 0 20px rgba(123, 47, 247, 1), 0 0 35px rgba(74, 158, 255, 0.6);
      transform: scale(1.2);
    }
  }
`
document.head.appendChild(pulseStyleSheet)
