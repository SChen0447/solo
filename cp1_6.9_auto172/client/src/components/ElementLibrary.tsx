import React from 'react';
import { RecipeElements } from '../types';

interface Props {
  onDragStart: (type: keyof RecipeElements) => void;
  elements: RecipeElements;
}

const ELEMENTS: { key: keyof RecipeElements; name: string; color: string; icon: string; desc: string }[] = [
  { key: 'stardust', name: '星屑', color: '#ffcc66', icon: '✨', desc: '温暖的金色光粒' },
  { key: 'lightdust', name: '光尘', color: '#66aaff', icon: '💫', desc: '柔和的冰蓝光晕' },
  { key: 'darkmatter', name: '暗物质', color: '#6633cc', icon: '🔮', desc: '神秘的紫色粒子团' }
];

export default function ElementLibrary({ onDragStart, elements }: Props) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 16,
      padding: 20,
      border: '1px solid rgba(255,255,255,0.08)',
      height: '100%',
      overflow: 'auto'
    }}>
      <h3 style={{
        fontSize: 15, color: 'var(--text-primary)',
        marginBottom: 18, textAlign: 'center',
        fontFamily: 'var(--font-display)',
        letterSpacing: '0.1em'
      }}>
        ⚗️ 元素库
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {ELEMENTS.map(el => (
          <div
            key={el.key}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('element-type', el.key);
              e.dataTransfer.effectAllowed = 'copy';
              onDragStart(el.key);
            }}
            style={{
              padding: 14,
              background: `linear-gradient(135deg, ${el.color}15, rgba(20,10,40,0.6))`,
              border: `1px solid ${el.color}40`,
              borderRadius: 12,
              cursor: 'grab',
              transition: 'all 0.25s var(--ease-out)',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateX(4px)';
              (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${el.color}44`;
              (e.currentTarget as HTMLElement).style.borderColor = `${el.color}80`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              (e.currentTarget as HTMLElement).style.borderColor = `${el.color}40`;
            }}
          >
            <div style={{
              position: 'absolute', right: 10, top: 10,
              width: 28, height: 28,
              borderRadius: '50%',
              background: el.color + '33',
              border: `1px solid ${el.color}66`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700,
              color: el.color
            }}>
              {elements[el.key]}
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6
            }}>
              <span style={{
                fontSize: 24,
                filter: `drop-shadow(0 0 8px ${el.color})`
              }}>{el.icon}</span>
              <span style={{
                fontSize: 15,
                fontWeight: 600,
                color: el.color,
                textShadow: `0 0 8px ${el.color}66`
              }}>{el.name}</span>
            </div>
            <div style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              paddingLeft: 34
            }}>{el.desc}</div>
            <div style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              marginTop: 8,
              fontStyle: 'italic'
            }}>拖拽到烧瓶中 →</div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 24, padding: 14,
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 10,
        border: '1px dashed rgba(255,255,255,0.1)'
      }}>
        <div style={{
          fontSize: 11, color: 'var(--text-muted)',
          textAlign: 'center', lineHeight: 1.6
        }}>
          💡 提示<br />
          平衡三种元素的配比<br />
          调整温度、压力和搅拌<br />
          以创造独特的星尘配方
        </div>
      </div>
    </div>
  );
}
