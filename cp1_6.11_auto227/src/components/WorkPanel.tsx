import React from 'react';
import { Template } from '../types';
import { TEMPLATES } from '../utils/templates';

interface WorkPanelProps {
  selectedTemplate: Template | null;
  currentStep: number;
  onSelectTemplate: (template: Template) => void;
}

const WorkPanel: React.FC<WorkPanelProps> = ({
  selectedTemplate,
  currentStep,
  onSelectTemplate,
}) => {
  return (
    <div className="side-panel">
      <div className="panel-title">选择作品</div>
      {TEMPLATES.map((tpl) => (
        <button
          key={tpl.id}
          className={`template-btn ${selectedTemplate?.id === tpl.id ? 'active' : ''}`}
          onClick={() => onSelectTemplate(tpl)}
        >
          <div>{tpl.name}</div>
          <div className="name-en">{tpl.nameEn}</div>
        </button>
      ))}

      {selectedTemplate && (
        <div className="steps-guide">
          {selectedTemplate.steps.map((step) => (
            <div
              key={step.id}
              className={`step-item ${step.id === currentStep ? 'active' : ''}`}
            >
              <span className="step-num">{step.id}</span>
              {step.description}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkPanel;
