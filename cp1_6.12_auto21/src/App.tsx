import React, { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ResumeForm from './components/ResumeForm';
import ResumePreview from './components/ResumePreview';
import ExportButton from './components/ExportButton';
import type { ResumeData, TemplateType, WorkExperience, Education } from './types';
import { saveResume } from './services/mockApi';

const STORAGE_KEY = 'resume-generator-data';
const AUTO_SAVE_INTERVAL = 30000;

const defaultResumeData: ResumeData = {
  personalInfo: {
    name: '',
    email: '',
    phone: '',
    address: '',
  },
  workExperiences: [],
  educations: [],
  skills: [],
};

const App: React.FC = () => {
  const [resumeData, setResumeData] = useState<ResumeData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : defaultResumeData;
    } catch {
      return defaultResumeData;
    }
  });
  const [template, setTemplate] = useState<TemplateType>('classic');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const lastSaveRef = useRef<number>(Date.now());

  const handleUpdatePersonalInfo = useCallback((field: keyof ResumeData['personalInfo'], value: string) => {
    setResumeData((prev) => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [field]: value },
    }));
  }, []);

  const handleAddWorkExperience = useCallback(() => {
    const newExp: WorkExperience = {
      id: uuidv4(),
      company: '',
      position: '',
      startDate: '',
      endDate: '',
      description: '',
    };
    setResumeData((prev) => ({
      ...prev,
      workExperiences: [...prev.workExperiences, newExp],
    }));
  }, []);

  const handleUpdateWorkExperience = useCallback((id: string, field: keyof WorkExperience, value: string) => {
    setResumeData((prev) => ({
      ...prev,
      workExperiences: prev.workExperiences.map((exp) =>
        exp.id === id ? { ...exp, [field]: value } : exp
      ),
    }));
  }, []);

  const handleRemoveWorkExperience = useCallback((id: string) => {
    setResumeData((prev) => ({
      ...prev,
      workExperiences: prev.workExperiences.filter((exp) => exp.id !== id),
    }));
  }, []);

  const handleAddEducation = useCallback(() => {
    const newEdu: Education = {
      id: uuidv4(),
      school: '',
      major: '',
      startDate: '',
      endDate: '',
      description: '',
    };
    setResumeData((prev) => ({
      ...prev,
      educations: [...prev.educations, newEdu],
    }));
  }, []);

  const handleUpdateEducation = useCallback((id: string, field: keyof Education, value: string) => {
    setResumeData((prev) => ({
      ...prev,
      educations: prev.educations.map((edu) =>
        edu.id === id ? { ...edu, [field]: value } : edu
      ),
    }));
  }, []);

  const handleRemoveEducation = useCallback((id: string) => {
    setResumeData((prev) => ({
      ...prev,
      educations: prev.educations.filter((edu) => edu.id !== id),
    }));
  }, []);

  const handleAddSkill = useCallback((skill: string) => {
    if (skill.trim() && !resumeData.skills.includes(skill.trim())) {
      setResumeData((prev) => ({
        ...prev,
        skills: [...prev.skills, skill.trim()],
      }));
    }
  }, [resumeData.skills]);

  const handleRemoveSkill = useCallback((index: number) => {
    setResumeData((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }));
  }, []);

  const handleClearAll = useCallback(() => {
    setResumeData(defaultResumeData);
    localStorage.removeItem(STORAGE_KEY);
    setShowClearConfirm(false);
  }, []);

  const performAutoSave = useCallback(async () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(resumeData));
      setSaveStatus('saving');
      await saveResume(resumeData);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('idle');
    }
  }, [resumeData]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastSaveRef.current >= AUTO_SAVE_INTERVAL) {
        lastSaveRef.current = Date.now();
        performAutoSave();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [performAutoSave]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resumeData));
  }, [resumeData]);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">简历生成器</h1>
          <div className="save-status">
            {saveStatus === 'saving' && <span className="status-saving">保存中...</span>}
            {saveStatus === 'saved' && <span className="status-saved">已自动保存</span>}
          </div>
        </div>
        <div className="header-right">
          <div className="template-selector">
            <label htmlFor="template-select">模板：</label>
            <select
              id="template-select"
              value={template}
              onChange={(e) => setTemplate(e.target.value as TemplateType)}
              className="template-dropdown"
            >
              <option value="classic">经典</option>
              <option value="modern">现代</option>
              <option value="minimal">简约</option>
            </select>
          </div>
          <button
            className="clear-btn"
            onClick={() => setShowClearConfirm(true)}
          >
            清除所有数据
          </button>
          <ExportButton resumeData={resumeData} template={template} />
        </div>
      </header>

      <main className="app-main">
        <div className="form-section">
          <ResumeForm
            resumeData={resumeData}
            onUpdatePersonalInfo={handleUpdatePersonalInfo}
            onAddWorkExperience={handleAddWorkExperience}
            onUpdateWorkExperience={handleUpdateWorkExperience}
            onRemoveWorkExperience={handleRemoveWorkExperience}
            onAddEducation={handleAddEducation}
            onUpdateEducation={handleUpdateEducation}
            onRemoveEducation={handleRemoveEducation}
            onAddSkill={handleAddSkill}
            onRemoveSkill={handleRemoveSkill}
          />
        </div>
        <div className="preview-section">
          <ResumePreview resumeData={resumeData} template={template} />
        </div>
      </main>

      {showClearConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>确认清除</h3>
            <p>确定要清除所有数据吗？此操作不可撤销。</p>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setShowClearConfirm(false)}>
                取消
              </button>
              <button className="modal-confirm" onClick={handleClearAll}>
                确认清除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
