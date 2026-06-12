import React, { useState, useRef, useCallback, useEffect, KeyboardEvent } from 'react';
import type { ResumeData, WorkExperience, Education } from '../types';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState<string>(defaultOpen ? '5000px' : '0px');

  useEffect(() => {
    if (contentRef.current) {
      setMaxHeight(isOpen ? `${contentRef.current.scrollHeight}px` : '0px');
    }
  }, [isOpen, children]);

  return (
    <div className="collapsible-section">
      <button
        type="button"
        className="section-header"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="section-title">{title}</h3>
        <span className={`chevron ${isOpen ? 'chevron-open' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </span>
      </button>
      <div
        className="section-content-wrapper"
        style={{ maxHeight, transition: 'max-height 0.3s ease-in-out, opacity 0.3s ease-in-out', opacity: isOpen ? 1 : 0 }}
      >
        <div ref={contentRef} className="section-content">
          {children}
        </div>
      </div>
    </div>
  );
};

function useDebouncedCallback<T extends (...args: any[]) => void>(callback: T, delay: number): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;
}

interface ResumeFormProps {
  resumeData: ResumeData;
  onUpdatePersonalInfo: (field: keyof ResumeData['personalInfo'], value: string) => void;
  onAddWorkExperience: () => void;
  onUpdateWorkExperience: (id: string, field: keyof WorkExperience, value: string) => void;
  onRemoveWorkExperience: (id: string) => void;
  onAddEducation: () => void;
  onUpdateEducation: (id: string, field: keyof Education, value: string) => void;
  onRemoveEducation: (id: string) => void;
  onAddSkill: (skill: string) => void;
  onRemoveSkill: (index: number) => void;
}

const ResumeForm: React.FC<ResumeFormProps> = ({
  resumeData,
  onUpdatePersonalInfo,
  onAddWorkExperience,
  onUpdateWorkExperience,
  onRemoveWorkExperience,
  onAddEducation,
  onUpdateEducation,
  onRemoveEducation,
  onAddSkill,
  onRemoveSkill,
}) => {
  const [skillInput, setSkillInput] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const debouncedUpdatePersonal = useDebouncedCallback(
    (field: keyof ResumeData['personalInfo'], value: string) => {
      onUpdatePersonalInfo(field, value);
    },
    50
  );

  const debouncedUpdateWork = useDebouncedCallback(
    (id: string, field: keyof WorkExperience, value: string) => {
      onUpdateWorkExperience(id, field, value);
    },
    50
  );

  const debouncedUpdateEdu = useDebouncedCallback(
    (id: string, field: keyof Education, value: string) => {
      onUpdateEducation(id, field, value);
    },
    50
  );

  const handleSkillKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (skillInput.trim()) {
        onAddSkill(skillInput);
        setSkillInput('');
      }
    }
  };

  return (
    <form className="resume-form" ref={formRef} onSubmit={(e) => e.preventDefault()}>
      <CollapsibleSection title="个人信息">
        <div className="form-grid">
          <div className="form-item">
            <label htmlFor="name">姓名</label>
            <input
              id="name"
              type="text"
              placeholder="请输入姓名"
              defaultValue={resumeData.personalInfo.name}
              onChange={(e) => debouncedUpdatePersonal('name', e.target.value)}
            />
          </div>
          <div className="form-item">
            <label htmlFor="email">邮箱</label>
            <input
              id="email"
              type="email"
              placeholder="请输入邮箱"
              defaultValue={resumeData.personalInfo.email}
              onChange={(e) => debouncedUpdatePersonal('email', e.target.value)}
            />
          </div>
          <div className="form-item">
            <label htmlFor="phone">电话</label>
            <input
              id="phone"
              type="tel"
              placeholder="请输入电话"
              defaultValue={resumeData.personalInfo.phone}
              onChange={(e) => debouncedUpdatePersonal('phone', e.target.value)}
            />
          </div>
          <div className="form-item">
            <label htmlFor="address">地址</label>
            <input
              id="address"
              type="text"
              placeholder="请输入地址"
              defaultValue={resumeData.personalInfo.address}
              onChange={(e) => debouncedUpdatePersonal('address', e.target.value)}
            />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="工作经历">
        {resumeData.workExperiences.length === 0 && (
          <div className="empty-hint">暂无工作经历，点击下方按钮添加</div>
        )}
        {resumeData.workExperiences.map((exp, index) => (
          <div key={exp.id} className="experience-card">
            <div className="experience-header">
              <span className="experience-index">经历 {index + 1}</span>
              <button
                type="button"
                className="remove-btn"
                onClick={() => onRemoveWorkExperience(exp.id)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="form-grid">
              <div className="form-item">
                <label>公司名称</label>
                <input
                  type="text"
                  placeholder="公司名称"
                  defaultValue={exp.company}
                  onChange={(e) => debouncedUpdateWork(exp.id, 'company', e.target.value)}
                />
              </div>
              <div className="form-item">
                <label>职位</label>
                <input
                  type="text"
                  placeholder="职位"
                  defaultValue={exp.position}
                  onChange={(e) => debouncedUpdateWork(exp.id, 'position', e.target.value)}
                />
              </div>
              <div className="form-item">
                <label>开始日期</label>
                <input
                  type="text"
                  placeholder="如：2020-01"
                  defaultValue={exp.startDate}
                  onChange={(e) => debouncedUpdateWork(exp.id, 'startDate', e.target.value)}
                />
              </div>
              <div className="form-item">
                <label>结束日期</label>
                <input
                  type="text"
                  placeholder="如：至今 / 2023-06"
                  defaultValue={exp.endDate}
                  onChange={(e) => debouncedUpdateWork(exp.id, 'endDate', e.target.value)}
                />
              </div>
              <div className="form-item form-item-full">
                <label>工作描述</label>
                <textarea
                  placeholder="描述您的工作内容和成就..."
                  rows={3}
                  defaultValue={exp.description}
                  onChange={(e) => debouncedUpdateWork(exp.id, 'description', e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
        <button type="button" className="add-btn" onClick={onAddWorkExperience}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          添加工作经历
        </button>
      </CollapsibleSection>

      <CollapsibleSection title="教育背景">
        {resumeData.educations.length === 0 && (
          <div className="empty-hint">暂无教育背景，点击下方按钮添加</div>
        )}
        {resumeData.educations.map((edu, index) => (
          <div key={edu.id} className="experience-card">
            <div className="experience-header">
              <span className="experience-index">教育 {index + 1}</span>
              <button
                type="button"
                className="remove-btn"
                onClick={() => onRemoveEducation(edu.id)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="form-grid">
              <div className="form-item">
                <label>学校名称</label>
                <input
                  type="text"
                  placeholder="学校名称"
                  defaultValue={edu.school}
                  onChange={(e) => debouncedUpdateEdu(edu.id, 'school', e.target.value)}
                />
              </div>
              <div className="form-item">
                <label>专业</label>
                <input
                  type="text"
                  placeholder="专业"
                  defaultValue={edu.major}
                  onChange={(e) => debouncedUpdateEdu(edu.id, 'major', e.target.value)}
                />
              </div>
              <div className="form-item">
                <label>开始日期</label>
                <input
                  type="text"
                  placeholder="如：2016-09"
                  defaultValue={edu.startDate}
                  onChange={(e) => debouncedUpdateEdu(edu.id, 'startDate', e.target.value)}
                />
              </div>
              <div className="form-item">
                <label>结束日期</label>
                <input
                  type="text"
                  placeholder="如：2020-06"
                  defaultValue={edu.endDate}
                  onChange={(e) => debouncedUpdateEdu(edu.id, 'endDate', e.target.value)}
                />
              </div>
              <div className="form-item form-item-full">
                <label>描述（可选）</label>
                <textarea
                  placeholder="主修课程、荣誉、活动等..."
                  rows={2}
                  defaultValue={edu.description}
                  onChange={(e) => debouncedUpdateEdu(edu.id, 'description', e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
        <button type="button" className="add-btn" onClick={onAddEducation}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          添加教育背景
        </button>
      </CollapsibleSection>

      <CollapsibleSection title="技能标签">
        <div className="form-item">
          <label>添加技能</label>
          <input
            type="text"
            placeholder="输入技能后按回车添加，如：JavaScript"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={handleSkillKeyDown}
          />
        </div>
        {resumeData.skills.length > 0 ? (
          <div className="skills-container">
            {resumeData.skills.map((skill, index) => (
              <span key={index} className="skill-tag">
                {skill}
                <button
                  type="button"
                  className="skill-remove"
                  onClick={() => onRemoveSkill(index)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : (
          <div className="empty-hint">暂无技能标签</div>
        )}
      </CollapsibleSection>
    </form>
  );
};

export default ResumeForm;
