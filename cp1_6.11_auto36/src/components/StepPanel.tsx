import { steps, totalSteps } from '../data/steps'

interface StepPanelProps {
  currentStep: number
  isMobile: boolean
}

export default function StepPanel({ currentStep, isMobile }: StepPanelProps) {
  const currentStepData = steps[currentStep - 1]

  return (
    <div style={styles.container}>
      <div style={styles.stepInfoPanel}>
        <div style={styles.stepNumber} key={`num-${currentStep}`}>
          步骤 {currentStep} / {totalSteps}
        </div>
        <div style={styles.stepTitle} key={`title-${currentStep}`}>
          {currentStepData.title}
        </div>
        <div style={styles.stepDescription} key={`desc-${currentStep}`}>
          {currentStepData.description}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    padding: '16px',
    boxSizing: 'border-box',
    justifyContent: 'center',
  },
  stepInfoPanel: {
    width: '100%',
    height: '200px',
    minHeight: '200px',
    maxHeight: '200px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '16px',
    padding: '24px',
    boxSizing: 'border-box',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 0 30px rgba(123, 47, 247, 0.15), inset 0 0 20px rgba(74, 158, 255, 0.05)',
    overflowY: 'auto',
  },
  stepNumber: {
    fontSize: '14px',
    color: '#66ff99',
    fontWeight: '600',
    marginBottom: '10px',
    letterSpacing: '1px',
    animation: 'slideUp 0.3s ease-out',
  },
  stepTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: '14px',
    background: 'linear-gradient(90deg, #4a9eff, #7b2ff7)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    animation: 'slideUp 0.3s ease-out',
  },
  stepDescription: {
    fontSize: '15px',
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: '1.7',
    maxHeight: '100px',
    overflowY: 'auto',
    animation: 'slideUp 0.3s ease-out',
  },
}

const styleSheet = document.createElement('style')
styleSheet.textContent = `
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  ::-webkit-scrollbar {
    width: 6px;
  }
  
  ::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }
  
  ::-webkit-scrollbar-thumb {
    background: rgba(123, 47, 247, 0.5);
    border-radius: 3px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(123, 47, 247, 0.7);
  }
`
document.head.appendChild(styleSheet)
