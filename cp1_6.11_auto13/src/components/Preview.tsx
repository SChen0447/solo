import { useRef, useState } from 'react';
import { useResume } from '../context/ResumeContext';
import { templates } from '../data/templates';
import { Section } from '../types';
import './Preview.css';

export default function Preview() {
  const { data, setScale } = useResume();
  const previewRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const template = templates[data.template];

  const sortedSections = [...data.sections].sort((a, b) => a.order - b.order);

  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScale(Number(e.target.value));
  };

  const renderSection = (section: Section) => {
    switch (section.id) {
      case 'basic':
        return <BasicSection />;
      case 'work':
        return <WorkSection />;
      case 'education':
        return <EducationSection />;
      case 'skills':
        return <SkillsSection />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`preview-container ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="preview-header">
        <div className="scale-control">
          <span className="scale-label">缩放</span>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={data.scale}
            onChange={handleScaleChange}
            className="scale-slider"
          />
          <span className="scale-value">{(data.scale * 100).toFixed(0)}%</span>
        </div>
      </div>
      <div className="preview-scroll" ref={previewRef}>
        <div
          className="preview-wrapper"
          style={{ transform: `scale(${data.scale})` }}
        >
          <div
            className="resume-paper"
            id="resume-content"
            style={{
              '--template-primary': template.primaryColor,
              '--template-secondary': template.secondaryColor,
              '--template-bg': template.backgroundColor,
              '--template-text': template.textColor,
              '--template-accent': template.accentColor,
            } as React.CSSProperties}
          >
            <div className="resume-content">
              {sortedSections.map((section) => (
                <div key={section.id} className="resume-section">
                  {renderSection(section)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BasicSection() {
  const { data } = useResume();
  const { basicInfo } = data;

  return (
    <div className="section-basic">
      <h1 className="resume-name">{basicInfo.name || '姓名'}</h1>
      <div className="contact-info">
        {basicInfo.email && (
          <span className="contact-item">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
            </svg>
            {basicInfo.email}
          </span>
        )}
        {basicInfo.phone && (
          <span className="contact-item">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
            </svg>
            {basicInfo.phone}
          </span>
        )}
      </div>
      {basicInfo.summary && (
        <div
          className="summary-text"
          dangerouslySetInnerHTML={{ __html: basicInfo.summary }}
        />
      )}
    </div>
  );
}

function WorkSection() {
  const { data } = useResume();
  const { workExperiences } = data;

  if (workExperiences.length === 0) return null;

  return (
    <div>
      <h2 className="section-title">
        <span className="title-bar" />
        工作经历
      </h2>
      <div className="timeline">
        {workExperiences.map((exp) => (
          <div key={exp.id} className="timeline-item">
            <div className="timeline-dot" />
            <div className="timeline-content">
              <div className="item-header">
                <h3 className="item-title">{exp.company || '公司名称'}</h3>
                <span className="item-date">
                  {exp.startDate} - {exp.endDate}
                </span>
              </div>
              <div className="item-position">{exp.position || '职位'}</div>
              {exp.description && (
                <p className="item-desc">{exp.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EducationSection() {
  const { data } = useResume();
  const { educations } = data;

  if (educations.length === 0) return null;

  return (
    <div>
      <h2 className="section-title">
        <span className="title-bar" />
        教育背景
      </h2>
      <div className="timeline">
        {educations.map((edu) => (
          <div key={edu.id} className="timeline-item">
            <div className="timeline-dot" />
            <div className="timeline-content">
              <div className="item-header">
                <h3 className="item-title">{edu.school || '学校名称'}</h3>
                <span className="item-date">{edu.graduationDate}</span>
              </div>
              <div className="item-position">
                {edu.degree} · {edu.major}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkillsSection() {
  const { data } = useResume();
  const { skills } = data;

  if (skills.length === 0) return null;

  return (
    <div>
      <h2 className="section-title">
        <span className="title-bar" />
        专业技能
      </h2>
      <div className="skills-grid">
        {skills.map((skill) => (
          <div key={skill.id} className="skill-item">
            <div className="skill-header">
              <span className="skill-name">{skill.name || '技能名称'}</span>
              <span className="skill-level">{skill.level}%</span>
            </div>
            <div className="skill-bar">
              <div
                className="skill-bar-fill"
                style={{ width: `${skill.level}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
