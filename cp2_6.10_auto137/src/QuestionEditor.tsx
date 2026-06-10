import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Question, QuestionType } from './types';

interface QuestionEditorProps {
  questions: Question[];
  onQuestionsChange: (questions: Question[]) => void;
  onPreview: () => void;
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({
  questions,
  onQuestionsChange,
  onPreview
}) => {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const createQuestion = (type: QuestionType): Question => {
    const baseOptions = type !== 'rating'
      ? [{ id: uuidv4(), text: '选项1' }, { id: uuidv4(), text: '选项2' }]
      : [];

    return {
      id: uuidv4(),
      title: '',
      type,
      options: baseOptions,
      required: type === 'single' || type === 'rating'
    };
  };

  const handleToolboxDragStart = useCallback((e: React.DragEvent, type: QuestionType) => {
    e.dataTransfer.setData('questionType', type);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const handleEditorAreaDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleEditorAreaDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('questionType') as QuestionType;
    if (type) {
      const newQuestion = createQuestion(type);
      onQuestionsChange([...questions, newQuestion]);
    }
    setDragOverIndex(null);
  }, [questions, onQuestionsChange]);

  const handleQuestionDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggingIndex(index);
    e.dataTransfer.setData('questionIndex', String(index));
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleQuestionDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleQuestionDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndexStr = e.dataTransfer.getData('questionIndex');
    const questionType = e.dataTransfer.getData('questionType') as QuestionType;

    if (questionType) {
      const newQuestion = createQuestion(questionType);
      const newQuestions = [...questions];
      newQuestions.splice(dropIndex, 0, newQuestion);
      onQuestionsChange(newQuestions);
    } else if (dragIndexStr !== '') {
      const dragIndex = parseInt(dragIndexStr, 10);
      if (!isNaN(dragIndex) && dragIndex !== dropIndex) {
        const newQuestions = [...questions];
        const [removed] = newQuestions.splice(dragIndex, 1);
        const insertIndex = dragIndex < dropIndex ? dropIndex - 1 : dropIndex;
        newQuestions.splice(insertIndex, 0, removed);
        onQuestionsChange(newQuestions);
      }
    }

    setDraggingIndex(null);
    setDragOverIndex(null);
  }, [questions, onQuestionsChange]);

  const handleQuestionDragEnd = useCallback(() => {
    setDraggingIndex(null);
    setDragOverIndex(null);
  }, []);

  const updateQuestionTitle = useCallback((index: number, title: string) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], title };
    onQuestionsChange(newQuestions);
  }, [questions, onQuestionsChange]);

  const addOption = useCallback((questionIndex: number) => {
    const newQuestions = [...questions];
    const question = newQuestions[questionIndex];
    question.options = [
      ...question.options,
      { id: uuidv4(), text: '' }
    ];
    onQuestionsChange(newQuestions);
  }, [questions, onQuestionsChange]);

  const updateOptionText = useCallback((questionIndex: number, optionIndex: number, text: string) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options[optionIndex] = {
      ...newQuestions[questionIndex].options[optionIndex],
      text
    };
    onQuestionsChange(newQuestions);
  }, [questions, onQuestionsChange]);

  const removeOption = useCallback((questionIndex: number, optionIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options = newQuestions[questionIndex].options.filter(
      (_, i) => i !== optionIndex
    );
    onQuestionsChange(newQuestions);
  }, [questions, onQuestionsChange]);

  const removeQuestion = useCallback((index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    onQuestionsChange(newQuestions);
  }, [questions, onQuestionsChange]);

  const getQuestionTypeLabel = (type: QuestionType): string => {
    switch (type) {
      case 'single': return '单选题';
      case 'multiple': return '多选题';
      case 'rating': return '评分题';
    }
  };

  const getQuestionTypeIcon = (type: QuestionType): string => {
    switch (type) {
      case 'single': return '◉';
      case 'multiple': return '☑';
      case 'rating': return '★';
    }
  };

  return (
    <div className="editor-container">
      <div className="toolbox">
        <h3 className="toolbox-title">题目类型</h3>
        <div className="toolbox-items">
          <div
            className="toolbox-item"
            draggable
            onDragStart={(e) => handleToolboxDragStart(e, 'single')}
          >
            <span className="toolbox-icon single">◉</span>
            <span className="toolbox-label">单选题</span>
          </div>
          <div
            className="toolbox-item"
            draggable
            onDragStart={(e) => handleToolboxDragStart(e, 'multiple')}
          >
            <span className="toolbox-icon multiple">☑</span>
            <span className="toolbox-label">多选题</span>
          </div>
          <div
            className="toolbox-item"
            draggable
            onDragStart={(e) => handleToolboxDragStart(e, 'rating')}
          >
            <span className="toolbox-icon rating">★</span>
            <span className="toolbox-label">评分题</span>
          </div>
        </div>
      </div>

      <div
        className="editor-area"
        onDragOver={handleEditorAreaDragOver}
        onDrop={handleEditorAreaDrop}
      >
        {questions.length === 0 ? (
          <div className="editor-empty">
            <div className="editor-empty-icon">📋</div>
            <div className="editor-empty-text">拖拽左侧题目类型到此处开始创建问卷</div>
            <div className="editor-empty-hint">支持单选题、多选题和评分题（1-5星）</div>
          </div>
        ) : (
          <>
            {questions.map((question, index) => (
              <div
                key={question.id}
                className={`question-card ${draggingIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
                draggable
                onDragStart={(e) => handleQuestionDragStart(e, index)}
                onDragOver={(e) => handleQuestionDragOver(e, index)}
                onDrop={(e) => handleQuestionDrop(e, index)}
                onDragEnd={handleQuestionDragEnd}
              >
                <button
                  className="question-delete"
                  onClick={() => removeQuestion(index)}
                  title="删除题目"
                >
                  ×
                </button>
                <span className={`question-type-badge ${question.type}`}>
                  {getQuestionTypeIcon(question.type)} {getQuestionTypeLabel(question.type)}
                </span>
                <input
                  type="text"
                  className="question-title-input"
                  placeholder="请输入题目标题..."
                  value={question.title}
                  onChange={(e) => updateQuestionTitle(index, e.target.value)}
                />

                {question.type === 'rating' ? (
                  <div className="rating-preview">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`rating-preview-star ${star <= 3 ? 'active' : ''}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="option-list">
                    {question.options.map((option, optIndex) => (
                      <div key={option.id} className="option-item">
                        <span style={{ color: '#95a5a6', fontSize: '14px', width: '20px' }}>
                          {question.type === 'single' ? '○' : '☐'}
                        </span>
                        <input
                          type="text"
                          className="option-input"
                          placeholder={`选项${optIndex + 1}`}
                          value={option.text}
                          onChange={(e) => updateOptionText(index, optIndex, e.target.value)}
                        />
                        {optIndex === question.options.length - 1 && question.options.length > 1 && (
                          <button
                            className="option-delete"
                            onClick={() => removeOption(index, optIndex)}
                            title="删除选项"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      className="add-option-btn"
                      onClick={() => addOption(index)}
                    >
                      + 添加选项
                    </button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {questions.length > 0 && (
        <div className="editor-actions">
          <button className="float-btn primary" onClick={onPreview}>
            预览问卷
          </button>
        </div>
      )}
    </div>
  );
};

export default QuestionEditor;
