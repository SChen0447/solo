import { useState, useRef } from 'react';
import { useResume } from '../context/ResumeContext';
import { templates } from '../data/templates';
import { TemplateType } from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './TemplatePicker.css';

export default function TemplatePicker() {
  const { data, setTemplate } = useResume();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleTemplateChange = (templateId: TemplateType) => {
    setTemplate(templateId);
  };

  const createRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    button.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 600);
  };

  const handleExport = async (e: React.MouseEvent<HTMLButtonElement>) => {
    createRipple(e);
    if (isExporting) return;

    setIsExporting(true);
    setExportProgress(0);

    try {
      const resumeElement = document.getElementById('resume-content');
      if (!resumeElement) {
        throw new Error('找不到预览内容');
      }

      setExportProgress(20);

      const canvas = await html2canvas(resumeElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: null,
      });

      setExportProgress(60);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(
        imgData,
        'PNG',
        imgX,
        imgY,
        imgWidth * ratio,
        imgHeight * ratio
      );

      setExportProgress(85);

      const fileName = data.basicInfo.name
        ? `${data.basicInfo.name}_简历.pdf`
        : '简历.pdf';
      pdf.save(fileName);

      setExportProgress(100);

      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 500);
    } catch (error) {
      console.error('导出失败:', error);
      setIsExporting(false);
      setExportProgress(0);
      alert('导出失败，请重试');
    }
  };

  return (
    <div className="template-picker">
      <div className="picker-section">
        <h3 className="picker-title">选择模板</h3>
        <div className="template-list">
          {Object.values(templates).map((template) => (
            <button
              key={template.id}
              className={`template-card ${
                data.template === template.id ? 'active' : ''
              }`}
              onClick={() => handleTemplateChange(template.id)}
              style={{
                '--card-primary': template.primaryColor,
                '--card-secondary': template.secondaryColor,
                '--card-bg': template.backgroundColor,
                '--card-accent': template.accentColor,
              } as React.CSSProperties}
            >
              <div className="template-preview">
                <div className="template-preview-header" />
                <div className="template-preview-body">
                  <div className="template-line long" />
                  <div className="template-line short" />
                  <div className="template-line medium" />
                </div>
              </div>
              <span className="template-name">{template.name}</span>
              {data.template === template.id && (
                <div className="check-mark">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="picker-section">
        <h3 className="picker-title">导出简历</h3>
        <button
          ref={btnRef}
          className={`export-btn ${isExporting ? 'exporting' : ''}`}
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <>
              <span className="spinner" />
              <span className="export-text">
                {exportProgress < 100 ? '导出中...' : '导出完成!'}
              </span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
              </svg>
              <span className="export-text">导出 PDF</span>
            </>
          )}
        </button>
        {isExporting && (
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${exportProgress}%` }}
            />
          </div>
        )}
        <p className="export-hint">将生成 A4 尺寸的 PDF 文件</p>
      </div>
    </div>
  );
}
