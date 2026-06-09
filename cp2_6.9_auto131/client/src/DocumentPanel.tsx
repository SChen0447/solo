import { useEffect, useRef } from 'react';
import './DocumentPanel.css';

interface DocumentPanelProps {
  text: string;
  sentences: string[];
  highlightedIndex: number | null;
}

function DocumentPanel({ text, sentences, highlightedIndex }: DocumentPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sentenceRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    if (highlightedIndex !== null && sentenceRefs.current[highlightedIndex]) {
      const element = sentenceRefs.current[highlightedIndex];
      if (element && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const offsetTop = elementRect.top - containerRect.top + containerRef.current.scrollTop - 100;
        containerRef.current.scrollTo({
          top: offsetTop,
          behavior: 'smooth'
        });
      }
    }
  }, [highlightedIndex]);

  const renderDocument = () => {
    if (sentences.length === 0) {
      return <p className="doc-text">{text}</p>;
    }

    let remainingText = text;
    const elements: JSX.Element[] = [];
    let keyIndex = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const idx = remainingText.indexOf(sentence);

      if (idx === -1) {
        if (i === 0) {
          elements.push(
            <span key={`text-${keyIndex++}`} className="doc-text">
              {remainingText}
            </span>
          );
        }
        break;
      }

      if (idx > 0) {
        elements.push(
          <span key={`text-${keyIndex++}`} className="doc-text">
            {remainingText.slice(0, idx)}
          </span>
        );
      }

      const isHighlighted = highlightedIndex === i;
      elements.push(
        <span
          key={`sentence-${i}`}
          ref={(el) => { sentenceRefs.current[i] = el; }}
          className={`doc-sentence ${isHighlighted ? 'highlighted' : ''}`}
          data-sentence-index={i}
        >
          {sentence}
        </span>
      );

      remainingText = remainingText.slice(idx + sentence.length);
    }

    if (remainingText.length > 0) {
      elements.push(
        <span key={`text-${keyIndex++}`} className="doc-text">
          {remainingText}
        </span>
      );
    }

    return elements;
  };

  return (
    <div className="document-panel">
      <div className="panel-header">
        <h2 className="panel-title">📖 原始文档</h2>
      </div>
      <div className="panel-content" ref={containerRef}>
        <div className="document-content">
          {renderDocument()}
        </div>
      </div>
    </div>
  );
}

export default DocumentPanel;
