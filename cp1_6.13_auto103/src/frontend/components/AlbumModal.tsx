import React, { useEffect, useRef, useState } from 'react';
import type { AlbumDetail, Genre, Sticker } from '../types';
import VinylPlayer from './VinylPlayer';
import StickerBadge from './StickerBadge';
import '../styles/album-modal.scss';

interface Props {
  album: AlbumDetail | null;
  open: boolean;
  onClose: () => void;
  onSubmitGuess: (genre: Genre) => Promise<{
    correct: boolean;
    correctGenre: Genre;
    scoreChange: number;
    sticker: Sticker | null;
  }>;
}

type Phase = 'reveal' | 'listen' | 'guess' | 'result';

function AlbumModal({ album, open, onClose, onSubmitGuess }: Props): JSX.Element | null {
  const [phase, setPhase] = useState<Phase>('reveal');
  const [coverRevealed, setCoverRevealed] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<Genre | null>(null);
  const [guessResult, setGuessResult] = useState<{
    correct: boolean;
    correctGenre: Genre;
    scoreChange: number;
    sticker: Sticker | null;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setPhase('reveal');
    setCoverRevealed(false);
    setSelectedGenre(null);
    setGuessResult(null);
    setSubmitting(false);
    const revealTimer = setTimeout(() => setCoverRevealed(true), 50);
    const listenTimer = setTimeout(() => setPhase('listen'), 1600);
    return () => {
      clearTimeout(revealTimer);
      clearTimeout(listenTimer);
    };
  }, [open, album?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, submitting]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !submitting) onClose();
  };

  const handleAudioFinished = () => {
    if (phase === 'listen') setPhase('guess');
  };

  const handleSelectGenre = (genre: Genre) => {
    if (phase !== 'guess' || submitting) return;
    setSelectedGenre(genre);
  };

  const handleConfirm = async () => {
    if (!selectedGenre || !album || submitting) return;
    setSubmitting(true);
    const correct = selectedGenre === album.correctGenre;
    try {
      const result = await onSubmitGuess(selectedGenre);
      setGuessResult(result);
      void correct;
      setPhase('result');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !album) return null;

  const [c1] = album.coverColors;

  return (
    <div
      className="modal-backdrop"
      onClick={handleBackdropClick}
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="album-modal-title"
    >
      <div className="album-modal">
        <button
          type="button"
          className="album-modal__close"
          onClick={onClose}
          disabled={submitting}
          aria-label="关闭"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="album-modal__cover-area" style={{ borderColor: `${c1}55` }}>
          <div className="cover-full__container">
            <div className={`cover-full cover-full--${coverRevealed ? 'revealed' : 'hidden'}`}>
              <img src={album.coverUrl} alt={album.title} draggable={false} />
              <div className="cover-full__shine" />
            </div>
          </div>
          <VinylPlayer
            audioUrl={album.audioUrl}
            duration={album.audioDuration}
            colors={album.coverColors}
            playing={phase === 'listen' || phase === 'guess' || phase === 'result'}
            onFinished={handleAudioFinished}
          />
        </div>

        <div className="album-modal__content">
          {phase === 'result' ? (
            <div className="result-section">
              <div className={`result-section__header ${guessResult?.correct ? 'is-correct' : 'is-wrong'}`}>
                <div className="result-icon">
                  {guessResult?.correct ? (
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  )}
                </div>
                <div className="result-text">
                  <h3>{guessResult?.correct ? '耳朵真棒！猜对了 🎉' : '再接再厉！'}</h3>
                  <p>
                    正确风格：
                    <span className="genre-tag">{guessResult?.correctGenre}</span>
                  </p>
                </div>
                <div className={`score-change ${guessResult && guessResult.scoreChange > 0 ? 'score-change--up' : 'score-change--down'}`}>
                  {guessResult && guessResult.scoreChange > 0
                    ? `+${guessResult.scoreChange}`
                    : guessResult?.scoreChange}
                  <span>积分</span>
                </div>
              </div>

              {guessResult?.sticker && (
                <div className="sticker-unlock">
                  <p className="sticker-unlock__title">🏷️ 解锁标签贴纸</p>
                  <div className="sticker-unlock__badge">
                    <StickerBadge sticker={guessResult.sticker} size="lg" />
                  </div>
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn-primary" onClick={onClose}>
                  继续探索
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 id="album-modal-title" className="album-modal__title">
                ??? <span className="title-year">· {album.year}</span>
              </h2>
              <p className="album-modal__artist">未知艺术家 · {album.description}</p>

              <div className="phase-indicator">
                <div className={`phase-step ${phase === 'reveal' ? 'is-active' : phase === 'listen' || phase === 'guess' ? 'is-done' : ''}`}>
                  <span>封面显现</span>
                </div>
                <div className="phase-line" />
                <div className={`phase-step ${phase === 'listen' ? 'is-active' : phase === 'guess' ? 'is-done' : ''}`}>
                  <span>仔细聆听</span>
                </div>
                <div className="phase-line" />
                <div className={`phase-step ${phase === 'guess' ? 'is-active' : ''}`}>
                  <span>选择风格</span>
                </div>
              </div>

              <div className="guess-options">
                <p className="guess-options__hint">
                  {phase === 'reveal'
                    ? '封面正在显现…'
                    : phase === 'listen'
                    ? '🎧 请聆听 30 秒片段，选择你认为的风格'
                    : '请选择你猜测的音乐风格'}
                </p>
                <div className="options-grid">
                  {album.options.map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={`genre-option ${selectedGenre === g ? 'is-selected' : ''} ${phase !== 'guess' ? 'is-disabled' : ''}`}
                      onClick={() => handleSelectGenre(g)}
                      disabled={phase !== 'guess'}
                    >
                      <span className="genre-option__emoji">
                        {g === '爵士' && '🎷'}
                        {g === '电子' && '🎛️'}
                        {g === '民谣' && '🎸'}
                        {g === '古典' && '🎻'}
                        {g === '摇滚' && '🎸'}
                      </span>
                      <span className="genre-option__text">{g}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleConfirm}
                  disabled={!selectedGenre || phase !== 'guess' || submitting}
                >
                  {submitting ? '提交中…' : '确认猜测'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AlbumModal;
