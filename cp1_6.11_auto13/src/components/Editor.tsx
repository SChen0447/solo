import { useState, useRef } from 'react';
import { useResume } from '../context/ResumeContext';
import { Section, SectionType } from '../types';
import './Editor.css';

export default function Editor() {
  const { data, reorderSections } = useResume();
  const [draggedId, setDraggedId] = useState<SectionType | null>(null);
  const [dragOverId, setDragOverId] = useState<SectionType | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const sortedSections = [...data.sections].sort((a, b) => a.order - b.order);

  const handleDragStart = (e: React.DragEvent, sectionId: SectionType) => {
    setDraggedId(sectionId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sectionId);
  };

  const handleDragOver = (e: React.DragEvent, sectionId: SectionType) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverId !== sectionId) {
      setDragOverId(sectionId);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: SectionType) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const newSections = [...sortedSections];
    const draggedIndex = newSections.findIndex((s) => s.id === draggedId);
    const targetIndex = newSections.findIndex((s) => s.id === targetId);

    const [removed] = newSections.splice(draggedIndex, 1);
    newSections.splice(targetIndex, 0, removed);

    const reordered = newSections.map((s, i) => ({ ...s, order: i }));
    reorderSections(reordered);

    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const renderSection = (section: Section) => {
    switch (section.id) {
      case 'basic':
        return <BasicInfoSection />;
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
    <div className="editor" ref={editorRef}>
      <div className="editor-header">
        <h2>编辑简历</h2>
        <p className="editor-subtitle">拖拽卡片调整顺序</p>
      </div>
      <div className="editor-sections">
        {sortedSections.map((section) => (
          <div
            key={section.id}
            className={`section-card ${draggedId === section.id ? 'dragging' : ''} ${
              dragOverId === section.id ? 'drag-over' : ''
            }`}
            draggable
            onDragStart={(e) => handleDragStart(e, section.id)}
            onDragOver={(e) => handleDragOver(e, section.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, section.id)}
            onDragEnd={handleDragEnd}
          >
            <div className="section-header">
              <div className="drag-handle">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <circle cx="9" cy="6" r="1.5" />
                  <circle cx="15" cy="6" r="1.5" />
                  <circle cx="9" cy="12" r="1.5" />
                  <circle cx="15" cy="12" r="1.5" />
                  <circle cx="9" cy="18" r="1.5" />
                  <circle cx="15" cy="18" r="1.5" />
                </svg>
              </div>
              <h3 className="section-title">{section.title}</h3>
            </div>
            <div className="section-content">{renderSection(section)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BasicInfoSection() {
  const { data, updateBasicInfo } = useResume();
  const { basicInfo } = data;
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (field: keyof typeof basicInfo, value: string) => {
    updateBasicInfo({ [field]: value });
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (summaryRef.current) {
      handleInputChange('summary', summaryRef.current.innerHTML);
    }
  };

  const handleSummaryInput = () => {
    if (summaryRef.current) {
      handleInputChange('summary', summaryRef.current.innerHTML);
    }
  };

  return (
    <div className="form-group">
      <div className="form-field">
        <label>姓名</label>
        <input
          type="text"
          value={basicInfo.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          onFocus={() => setFocusedField('name')}
          onBlur={() => setFocusedField(null)}
          className={focusedField === 'name' ? 'focused' : ''}
          placeholder="请输入姓名"
        />
      </div>
      <div className="form-field">
        <label>邮箱</label>
        <input
          type="email"
          value={basicInfo.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          onFocus={() => setFocusedField('email')}
          onBlur={() => setFocusedField(null)}
          className={focusedField === 'email' ? 'focused' : ''}
          placeholder="请输入邮箱"
        />
      </div>
      <div className="form-field">
        <label>电话</label>
        <input
          type="tel"
          value={basicInfo.phone}
          onChange={(e) => handleInputChange('phone', e.target.value)}
          onFocus={() => setFocusedField('phone')}
          onBlur={() => setFocusedField(null)}
          className={focusedField === 'phone' ? 'focused' : ''}
          placeholder="请输入电话"
        />
      </div>
      <div className="form-field">
        <label>个人简介</label>
        <div className="rich-toolbar">
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => execCommand('bold')}
            title="加粗"
          >
            <b>B</b>
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => execCommand('italic')}
            title="斜体"
          >
            <i>I</i>
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => execCommand('insertUnorderedList')}
            title="无序列表"
          >
            • 列表
          </button>
        </div>
        <div
          ref={summaryRef}
          contentEditable
          className={`rich-editor ${focusedField === 'summary' ? 'focused' : ''}`}
          onInput={handleSummaryInput}
          onFocus={() => setFocusedField('summary')}
          onBlur={() => setFocusedField(null)}
          dangerouslySetInnerHTML={{ __html: basicInfo.summary }}
        />
      </div>
    </div>
  );
}

function WorkSection() {
  const { data, addWorkExperience, updateWorkExperience, removeWorkExperience } = useResume();
  const { workExperiences } = data;
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  const handleRemove = (id: string) => {
    setRemovingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      removeWorkExperience(id);
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);
  };

  return (
    <div className="form-group">
      <div className="items-list">
        {workExperiences.map((exp, index) => (
          <div
            key={exp.id}
            className={`item-card ${removingIds.has(exp.id) ? 'removing' : ''} ${
              index === workExperiences.length - 1 && !removingIds.has(exp.id)
                ? 'new-item'
                : ''
            }`}
          >
            <div className="item-header">
              <span className="item-index">#{index + 1}</span>
              <button
                type="button"
                className="delete-btn"
                onClick={() => handleRemove(exp.id)}
              >
                删除
              </button>
            </div>
            <div className="form-field">
              <label>公司名称</label>
              <input
                type="text"
                value={exp.company}
                onChange={(e) => updateWorkExperience(exp.id, { company: e.target.value })}
                placeholder="请输入公司名称"
              />
            </div>
            <div className="form-field">
              <label>职位</label>
              <input
                type="text"
                value={exp.position}
                onChange={(e) => updateWorkExperience(exp.id, { position: e.target.value })}
                placeholder="请输入职位"
              />
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>开始时间</label>
                <input
                  type="text"
                  value={exp.startDate}
                  onChange={(e) => updateWorkExperience(exp.id, { startDate: e.target.value })}
                  placeholder="如：2021-03"
                />
              </div>
              <div className="form-field">
                <label>结束时间</label>
                <input
                  type="text"
                  value={exp.endDate}
                  onChange={(e) => updateWorkExperience(exp.id, { endDate: e.target.value })}
                  placeholder="如：至今"
                />
              </div>
            </div>
            <div className="form-field">
              <label>工作描述</label>
              <textarea
                value={exp.description}
                onChange={(e) => updateWorkExperience(exp.id, { description: e.target.value })}
                rows={3}
                placeholder="请描述工作内容和成果..."
              />
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="add-btn ripple-btn" onClick={addWorkExperience}>
        + 添加工作经历
      </button>
    </div>
  );
}

function EducationSection() {
  const { data, addEducation, updateEducation, removeEducation } = useResume();
  const { educations } = data;
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  const handleRemove = (id: string) => {
    setRemovingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      removeEducation(id);
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);
  };

  return (
    <div className="form-group">
      <div className="items-list">
        {educations.map((edu, index) => (
          <div
            key={edu.id}
            className={`item-card ${removingIds.has(edu.id) ? 'removing' : ''} ${
              index === educations.length - 1 && !removingIds.has(edu.id) ? 'new-item' : ''
            }`}
          >
            <div className="item-header">
              <span className="item-index">#{index + 1}</span>
              <button
                type="button"
                className="delete-btn"
                onClick={() => handleRemove(edu.id)}
              >
                删除
              </button>
            </div>
            <div className="form-field">
              <label>学校名称</label>
              <input
                type="text"
                value={edu.school}
                onChange={(e) => updateEducation(edu.id, { school: e.target.value })}
                placeholder="请输入学校名称"
              />
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>学历</label>
                <input
                  type="text"
                  value={edu.degree}
                  onChange={(e) => updateEducation(edu.id, { degree: e.target.value })}
                  placeholder="如：本科"
                />
              </div>
              <div className="form-field">
                <label>专业</label>
                <input
                  type="text"
                  value={edu.major}
                  onChange={(e) => updateEducation(edu.id, { major: e.target.value })}
                  placeholder="请输入专业"
                />
              </div>
            </div>
            <div className="form-field">
              <label>毕业时间</label>
              <input
                type="text"
                value={edu.graduationDate}
                onChange={(e) => updateEducation(edu.id, { graduationDate: e.target.value })}
                placeholder="如：2018-06"
              />
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="add-btn ripple-btn" onClick={addEducation}>
        + 添加教育背景
      </button>
    </div>
  );
}

function SkillsSection() {
  const { data, addSkill, updateSkill, removeSkill } = useResume();
  const { skills } = data;
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  const handleRemove = (id: string) => {
    setRemovingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      removeSkill(id);
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);
  };

  return (
    <div className="form-group">
      <div className="items-list">
        {skills.map((skill, index) => (
          <div
            key={skill.id}
            className={`item-card skill-item ${removingIds.has(skill.id) ? 'removing' : ''} ${
              index === skills.length - 1 && !removingIds.has(skill.id) ? 'new-item' : ''
            }`}
          >
            <div className="item-header">
              <span className="item-index">#{index + 1}</span>
              <button
                type="button"
                className="delete-btn"
                onClick={() => handleRemove(skill.id)}
              >
                删除
              </button>
            </div>
            <div className="form-row">
              <div className="form-field flex-2">
                <label>技能名称</label>
                <input
                  type="text"
                  value={skill.name}
                  onChange={(e) => updateSkill(skill.id, { name: e.target.value })}
                  placeholder="如：React"
                />
              </div>
              <div className="form-field flex-1">
                <label>熟练度 ({skill.level}%)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={skill.level}
                  onChange={(e) =>
                    updateSkill(skill.id, { level: Number(e.target.value) })
                  }
                  className="skill-range"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="add-btn ripple-btn" onClick={addSkill}>
        + 添加技能
      </button>
    </div>
  );
}
