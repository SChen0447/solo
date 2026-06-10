import React, { useState, useCallback } from 'react';
import type { Question, Survey, VoteAnswer } from './types';

interface QuestionRendererProps {
  survey: Survey;
  onSubmit: (answers: VoteAnswer[]) => void;
  onClose: () => void;
}

const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  survey,
  onSubmit,
  onClose
}) => {
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({});
  const [hoveredRatings, setHoveredRatings] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Set<string>>(new Set());

  const handleSingleSelect = useCallback((questionId: string, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId
    }));
    setErrors((prev) => {
      const newErrors = new Set(prev);
      newErrors.delete(questionId);
      return newErrors;
    });
  }, []);

  const handleMultipleToggle = useCallback((questionId: string, optionId: string) => {
    setAnswers((prev) => {
      const current = (prev[questionId] as string[]) || [];
      const newVal = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return {
        ...prev,
        [questionId]: newVal
      };
    });
  }, []);

  const handleRatingSelect = useCallback((questionId: string, rating: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: rating
    }));
    setErrors((prev) => {
      const newErrors = new Set(prev);
      newErrors.delete(questionId);
      return newErrors;
    });
  }, []);

  const handleRatingHover = useCallback((questionId: string, rating: number | null) => {
    setHoveredRatings((prev) => {
      if (rating === null) {
        const newState = { ...prev };
        delete newState[questionId];
        return newState;
      }
      return { ...prev, [questionId]: rating };
    });
  }, []);

  const validateAndSubmit = useCallback(() => {
    const newErrors = new Set<string>();

    survey.questions.forEach((q) => {
      if (q.required) {
        const answer = answers[q.id];
        if (q.type === 'single') {
          if (!answer) newErrors.add(q.id);
        } else if (q.type === 'rating') {
          if (!answer) newErrors.add(q.id);
        }
      }
    });

    setErrors(newErrors);

    if (newErrors.size === 0) {
      const voteAnswers: VoteAnswer[] = Object.entries(answers).map(
        ([questionId, value]) => ({
          questionId,
          value
        })
      );
      onSubmit(voteAnswers);
    }
  }, [survey, answers, onSubmit]);

  const renderSingleQuestion = (question: Question) => {
    const selected = answers[question.id] as string | undefined;
    const hasError = errors.has(question.id);

    return (
      <div className={`vote-question ${hasError ? 'error' : ''}`} key={question.id}>
        <div className="vote-question-title">
          {question.title || '未命名题目'}
          {question.required && <span className="required-mark">*</span>}
        </div>
        <div className="single-option-list">
          {question.options.map((option) => (
            <div
              key={option.id}
              className={`single-option ${selected === option.id ? 'selected' : ''}`}
              onClick={() => handleSingleSelect(question.id, option.id)}
            >
              <span className="custom-radio">
                <span className="custom-radio-inner" />
              </span>
              <span className="option-text">{option.text || `选项`}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMultipleQuestion = (question: Question) => {
    const selected = (answers[question.id] as string[]) || [];
    const hasError = errors.has(question.id);

    return (
      <div className={`vote-question ${hasError ? 'error' : ''}`} key={question.id}>
        <div className="vote-question-title">
          {question.title || '未命名题目'}
          {question.required && <span className="required-mark">*</span>}
        </div>
        <div className="multiple-option-list">
          {question.options.map((option) => (
            <div
              key={option.id}
              className={`multiple-option ${selected.includes(option.id) ? 'selected' : ''}`}
              onClick={() => handleMultipleToggle(question.id, option.id)}
            >
              <span className="custom-checkbox">
                <span className="custom-checkbox-check">✓</span>
              </span>
              <span className="option-text">{option.text || `选项`}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderRatingQuestion = (question: Question) => {
    const selected = (answers[question.id] as number) || 0;
    const hovered = hoveredRatings[question.id] || 0;
    const displayValue = hovered || selected;
    const hasError = errors.has(question.id);

    return (
      <div className={`vote-question ${hasError ? 'error' : ''}`} key={question.id}>
        <div className="vote-question-title">
          {question.title || '未命名题目'}
          {question.required && <span className="required-mark">*</span>}
        </div>
        <div className="rating-stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`rating-star ${star <= displayValue ? 'selected' : ''} ${star <= hovered ? 'hovered' : ''}`}
              onMouseEnter={() => handleRatingHover(question.id, star)}
              onMouseLeave={() => handleRatingHover(question.id, null)}
              onClick={() => handleRatingSelect(question.id, star)}
            >
              ★
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{survey.name || '未命名问卷'}</h2>
            {survey.description && (
              <p style={{ color: '#7f8c8d', fontSize: '13px', marginTop: '4px' }}>
                {survey.description}
              </p>
            )}
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {survey.questions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#95a5a6' }}>
              该问卷暂无题目
            </div>
          ) : (
            survey.questions.map((question) => {
              switch (question.type) {
                case 'single':
                  return renderSingleQuestion(question);
                case 'multiple':
                  return renderMultipleQuestion(question);
                case 'rating':
                  return renderRatingQuestion(question);
                default:
                  return null;
              }
            })
          )}
        </div>
        {survey.questions.length > 0 && (
          <div className="submit-btn-container">
            <button className="submit-btn" onClick={validateAndSubmit}>
              提交投票
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionRenderer;
