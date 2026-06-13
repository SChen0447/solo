import React, { useRef, useEffect } from 'react';
import { BambooData, SlotData, FragmentData } from '../../types/scroll';
import Fragment from './Fragment';
import './Scroll.scss';

interface ScrollProps {
  bamboos: BambooData[];
  isUnrolled: boolean;
  activeMeaning: {
    bambooIndex: number;
    slotIndex: number;
    text: string;
  } | null;
  wrongSlot: { bambooIndex: number; slotIndex: number } | null;
  onSlotDrop: (slotIndex: number, fragment: FragmentData) => void;
  onSlotDragOver: (e: React.DragEvent) => void;
}

const Scroll: React.FC<ScrollProps> = ({
  bamboos,
  isUnrolled,
  activeMeaning,
  wrongSlot,
  onSlotDrop,
  onSlotDragOver
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const renderSlot = (slot: SlotData, bambooIndex: number) => {
    const isWrong = wrongSlot && 
      wrongSlot.bambooIndex === bambooIndex && 
      wrongSlot.slotIndex === slot.index;
    
    const hasMeaning = activeMeaning && 
      activeMeaning.bambooIndex === bambooIndex && 
      activeMeaning.slotIndex === slot.index;

    return (
      <div
        key={slot.index}
        className={`slot ${slot.isFilled ? 'slot--filled' : ''} ${isWrong ? 'slot--wrong' : ''}`}
        onDragOver={onSlotDragOver}
        onDrop={(e) => {
          e.preventDefault();
          const fragmentId = e.dataTransfer.getData('fragmentId');
          const fragmentData = e.dataTransfer.getData('fragmentData');
          if (fragmentId && fragmentData) {
            onSlotDrop(slot.index, JSON.parse(fragmentData));
          }
        }}
        data-slot-index={slot.index}
      >
        {!slot.isFilled ? (
          <div className="slot__placeholder">
            <span className="slot__placeholder-text">字</span>
          </div>
        ) : (
          <div className="slot__character">
            <canvas
              className="slot__canvas"
              width={25}
              height={25}
              ref={(canvas) => {
                if (canvas && slot.character) {
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.clearRect(0, 0, 25, 25);
                    ctx.font = 'bold 22px "KaiTi", "STKaiti", "楷体", serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#1a1a1a';
                    ctx.shadowColor = 'rgba(0,0,0,0.2)';
                    ctx.shadowBlur = 0.5;
                    ctx.fillText(slot.character, 12.5, 13.5);
                  }
                }
              }}
            />
          </div>
        )}
        {hasMeaning && (
          <div className="slot__meaning">
            <div className="slot__meaning-text">{activeMeaning!.text}</div>
            <div className="slot__meaning-arrow"></div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={scrollRef}
      className={`scroll ${isUnrolled ? 'scroll--unrolled' : ''}`}
    >
      <div className="scroll__rod scroll__rod--left">
        <div className="scroll__rod-cap"></div>
      </div>

      <div className="scroll__bamboos">
        {bamboos.map((bamboo, bambooIndex) => (
          <div
            key={bamboo.index}
            className={`bamboo ${bamboo.isGlowing ? 'bamboo--glowing' : ''}`}
            style={{
              '--bamboo-index': bambooIndex,
              '--bamboo-total': bamboos.length
            }}
          >
            <div className="bamboo__texture"></div>
            <div className="bamboo__grain"></div>
            <div className="bamboo__knot bamboo__knot--top"></div>
            <div className="bamboo__knot bamboo__knot--bottom"></div>
            <div className="bamboo__slots">
              {bamboo.slots.map(slot => renderSlot(slot, bambooIndex))}
            </div>
            <div className="bamboo__edge bamboo__edge--left"></div>
            <div className="bamboo__edge bamboo__edge--right"></div>
          </div>
        ))}
      </div>

      <div className="scroll__rod scroll__rod--right">
        <div className="scroll__rod-cap"></div>
      </div>

      {isUnrolled && (
        <div className="scroll__seal">
          <div className="seal">
            <span className="seal__text">解</span>
          </div>
          <div className="scroll__seal-caption">典籍复原完成</div>
        </div>
      )}
    </div>
  );
};

export default Scroll;
