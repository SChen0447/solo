import { useState, useEffect, useRef } from 'react';
import type { Evaluation } from '../types';
import './Animation.css';

interface AnimationProps {
  trigger: number;
  lastEvaluation: Evaluation | null;
  targetName: string;
  isResetting: boolean;
}

function Animation({ trigger, lastEvaluation, targetName, isResetting }: AnimationProps) {
  const [showFlash, setShowFlash] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [cardLeaving, setCardLeaving] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (trigger === 0 || !lastEvaluation) return;

    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];

    setCardLeaving(false);
    setShowFlash(true);

    const flashTimer = setTimeout(() => {
      setShowFlash(false);
    }, 500);
    timersRef.current.push(flashTimer);

    const cardInTimer = setTimeout(() => {
      setShowCard(true);
    }, 300);
    timersRef.current.push(cardInTimer);

    const cardOutTimer = setTimeout(() => {
      setCardLeaving(true);
    }, 2000);
    timersRef.current.push(cardOutTimer);

    const cardHideTimer = setTimeout(() => {
      setShowCard(false);
      setCardLeaving(false);
    }, 2300);
    timersRef.current.push(cardHideTimer);

    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
    };
  }, [trigger, lastEvaluation]);

  useEffect(() => {
    if (isResetting) {
      setShowCard(false);
      setCardLeaving(false);
    }
  }, [isResetting]);

  if (!showFlash && !showCard) return null;

  return (
    <div className="animation-container">
      {showFlash && <div className="flash-overlay" />}

      {showCard && lastEvaluation && (
        <div className={`feedback-card ${cardLeaving ? 'leaving' : ''}`}>
          <div className="feedback-header">
            <span className="feedback-icon">✓</span>
            <span className="feedback-title">评价提交成功</span>
          </div>
          <div className="feedback-content">
            <p className="feedback-target">已对 <strong>{targetName}</strong> 提交评价</p>
            <div className="feedback-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`feedback-star ${star <= lastEvaluation.rating ? 'filled' : ''}`}
                >
                  ★
                </span>
              ))}
            </div>
            <div className="feedback-comment">
              <span className="comment-label">评语：</span>
              <span className="comment-text">{lastEvaluation.comment}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Animation;
