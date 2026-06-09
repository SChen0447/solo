import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { eventBus, UIUpdatePayload } from '../core/EventBus';
import { Elemental, Skill, ElementType } from '../entities/Elemental';

interface SkillButtonProps {
  skill: Skill;
  onClick: () => void;
  disabled: boolean;
  element: ElementType;
}

interface CharacterCardProps {
  character: any;
  isActive: boolean;
}

const ElementIcon: React.FC<{ element: ElementType; size?: number }> = ({ element, size = 24 }) => {
  const colors: Record<ElementType, { bg: string; glow: string; symbol: string }> = {
    fire: { bg: '#ff6b35', glow: '0 0 10px #ff6b35, 0 0 20px #ff6b35', symbol: '🔥' },
    water: { bg: '#4fc3f7', glow: '0 0 10px #4fc3f7, 0 0 20px #4fc3f7', symbol: '💧' },
    wind: { bg: '#81c784', glow: '0 0 10px #81c784, 0 0 20px #81c784', symbol: '🌪️' }
  };
  const style = colors[element];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        background: style.bg,
        boxShadow: style.glow,
        fontSize: size * 0.6,
        lineHeight: 1
      }}
    >
      {style.symbol}
    </span>
  );
};

const SkillButton: React.FC<SkillButtonProps> = React.memo(({ skill, onClick, disabled, element }) => {
  const [hovered, setHovered] = useState(false);
  const skillColor = skill.element ? Elemental.getElementColor(skill.element) : '#8b5cf6';

  const buttonStyle: React.CSSProperties = useMemo(() => ({
    background: disabled ? '#2a1a4a' : '#3a1a5e',
    border: `2px solid ${disabled ? '#4a3a6a' : skillColor}`,
    borderRadius: '12px',
    padding: '12px 20px',
    color: disabled ? '#6a5a8a' : '#e0d4f7',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 'clamp(12px, 1.2vw, 16px)',
    fontWeight: 'bold',
    fontFamily: '"Segoe UI", "PingFang SC", sans-serif',
    transition: 'all 0.2s ease',
    transform: hovered && !disabled ? 'scale(1.1)' : 'scale(1)',
    boxShadow: hovered && !disabled ? `0 0 20px ${skillColor}80` : 'none',
    opacity: disabled ? 0.5 : 1,
    minWidth: '140px',
    position: 'relative'
  }), [disabled, hovered, skillColor]);

  return (
    <div style={{ position: 'relative' }}>
      <button
        style={buttonStyle}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        disabled={disabled}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
          {skill.element && <ElementIcon element={skill.element} size={18} />}
          <span>{skill.name}</span>
        </div>
        {skill.currentCooldown > 0 && (
          <div style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            background: '#ef4444',
            color: 'white',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {skill.currentCooldown}
          </div>
        )}
        {skill.isAoe && (
          <div style={{
            position: 'absolute',
            bottom: '-6px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#8b5cf6',
            color: 'white',
            borderRadius: '8px',
            padding: '2px 8px',
            fontSize: '10px',
            fontWeight: 'bold'
          }}>
            全体
          </div>
        )}
      </button>
      {hovered && !disabled && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 12px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(26, 10, 46, 0.95)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #8b5cf6',
          borderRadius: '8px',
          padding: '10px 14px',
          color: '#e0d4f7',
          fontSize: '13px',
          whiteSpace: 'nowrap',
          zIndex: 100,
          boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px', color: skillColor }}>
            {skill.name}
          </div>
          <div style={{ color: '#b0a4c7' }}>
            {skill.description}
          </div>
          {skill.damage > 0 && (
            <div style={{ marginTop: '4px', color: '#fbbf24' }}>
              伤害: {skill.damage}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

SkillButton.displayName = 'SkillButton';

const CharacterCard: React.FC<CharacterCardProps> = React.memo(({ character, isActive }) => {
  const hpColor = character.hpPercentage > 0.6 ? '#4ade80' : character.hpPercentage > 0.3 ? '#fbbf24' : '#f87171';
  const elementColor = Elemental.getElementColor(character.element);

  const cardStyle: React.CSSProperties = useMemo(() => ({
    background: 'rgba(58, 26, 94, 0.6)',
    backdropFilter: 'blur(8px)',
    border: isActive ? `2px solid ${elementColor}` : '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '12px',
    padding: '12px 16px',
    minWidth: '160px',
    boxShadow: isActive ? `0 0 20px ${elementColor}60` : '0 4px 12px rgba(0, 0, 0, 0.3)',
    opacity: character.isAlive ? 1 : 0.4,
    transition: 'all 0.3s ease'
  }), [character.isAlive, isActive, elementColor]);

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <ElementIcon element={character.element} size={28} />
        <div>
          <div style={{
            color: '#e0d4f7',
            fontSize: 'clamp(12px, 1.2vw, 15px)',
            fontWeight: 'bold'
          }}>
            {character.name}
          </div>
          <div style={{
            color: '#8b7aab',
            fontSize: 'clamp(10px, 0.9vw, 12px)'
          }}>
            ATK: {character.attack} | SPD: {character.speed}
          </div>
        </div>
      </div>
      <div style={{
        background: '#1a0a2e',
        borderRadius: '6px',
        height: '10px',
        overflow: 'hidden',
        border: '1px solid rgba(139, 92, 246, 0.3)'
      }}>
        <div style={{
          height: '100%',
          width: `${character.hpPercentage * 100}%`,
          background: `linear-gradient(90deg, ${hpColor}cc, ${hpColor})`,
          transition: 'width 0.5s ease',
          boxShadow: `0 0 8px ${hpColor}80`
        }} />
      </div>
      <div style={{
        marginTop: '4px',
        color: hpColor,
        fontSize: 'clamp(10px, 0.9vw, 12px)',
        textAlign: 'center',
        fontWeight: 'bold'
      }}>
        {character.currentHp} / {character.maxHp}
      </div>
      {character.isDefending && (
        <div style={{
          marginTop: '4px',
          color: '#60a5fa',
          fontSize: '11px',
          textAlign: 'center'
        }}>
          🛡️ 防御中
        </div>
      )}
    </div>
  );
});

CharacterCard.displayName = 'CharacterCard';

export const GameUI: React.FC = () => {
  const [gameState, setGameState] = useState<UIUpdatePayload>({
    playerTeam: [],
    enemyTeam: [],
    currentTurn: 1,
    currentActorId: null,
    comboCount: 0,
    turnPhase: 'selecting',
    battleMessage: '战斗开始！'
  });
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  useEffect(() => {
    let lastUpdate = 0;
    const throttleMs = 33;

    const handleUIUpdate = (payload: UIUpdatePayload) => {
      const now = Date.now();
      if (now - lastUpdate < throttleMs) return;
      lastUpdate = now;
      setGameState(payload);
      setSelectedSkill(null);
    };

    eventBus.on('ui:update', handleUIUpdate);
    return () => eventBus.off('ui:update', handleUIUpdate);
  }, []);

  const handleSkillClick = useCallback((skill: Skill) => {
    if (gameState.turnPhase !== 'selecting') return;
    if (skill.currentCooldown > 0) return;

    if (skill.isAoe || skill.type === 'defense') {
      eventBus.emit('skill:selected', { skill, targetId: null });
    } else {
      setSelectedSkill(skill);
    }
  }, [gameState.turnPhase]);

  const currentActor = useMemo(() => {
    if (!gameState.currentActorId) return null;
    return [...gameState.playerTeam, ...gameState.enemyTeam].find(c => c.id === gameState.currentActorId);
  }, [gameState.currentActorId, gameState.playerTeam, gameState.enemyTeam]);

  const isPlayerTurn = useMemo(() => {
    return currentActor?.team === 'player';
  }, [currentActor]);

  const playerAlive = useMemo(() => gameState.playerTeam.filter(c => c.isAlive), [gameState.playerTeam]);
  const enemyAlive = useMemo(() => gameState.enemyTeam.filter(c => c.isAlive), [gameState.enemyTeam]);

  const comboStyle: React.CSSProperties = useMemo(() => ({
    fontSize: 'clamp(24px, 3vw, 42px)',
    fontWeight: 'bold',
    fontFamily: '"Segoe UI", "PingFang SC", sans-serif',
    background: 'linear-gradient(180deg, #ffd700, #ff8c00, #ffd700)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    textShadow: '0 0 30px rgba(255, 215, 0, 0.5)',
    display: gameState.comboCount >= 2 ? 'block' : 'none'
  }), [gameState.comboCount]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: 'clamp(10px, 2vh, 24px)',
      pointerEvents: 'none'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        pointerEvents: 'auto'
      }}>
        <div style={{
          background: 'rgba(26, 10, 46, 0.8)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(139, 92, 246, 0.4)',
          borderRadius: '12px',
          padding: '12px 24px',
          color: '#e0d4f7'
        }}>
          <div style={{ fontSize: 'clamp(14px, 1.5vw, 20px)', fontWeight: 'bold' }}>
            第 {gameState.currentTurn} 回合
          </div>
          <div style={{ fontSize: 'clamp(12px, 1.1vw, 14px)', color: '#8b7aab', marginTop: '4px' }}>
            {isPlayerTurn ? '🎮 玩家行动' : '🤖 AI行动'}
            {currentActor && ` - ${currentActor.name}`}
          </div>
        </div>

        <div style={comboStyle}>
          ⚡ {gameState.comboCount} 连击!
        </div>

        <div style={{
          background: 'rgba(26, 10, 46, 0.8)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(139, 92, 246, 0.4)',
          borderRadius: '12px',
          padding: '12px 24px',
          color: '#e0d4f7',
          textAlign: 'right'
        }}>
          <div style={{ fontSize: 'clamp(11px, 1vw, 13px)', color: '#8b7aab' }}>存活角色</div>
          <div style={{ fontSize: 'clamp(14px, 1.3vw, 18px)', fontWeight: 'bold', marginTop: '4px' }}>
            <span style={{ color: '#4ade80' }}>{playerAlive.length}</span>
            {' : '}
            <span style={{ color: '#f87171' }}>{enemyAlive.length}</span>
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 'clamp(10px, 2vw, 30px)',
        pointerEvents: 'auto',
        paddingTop: 'clamp(120px, 18vh, 180px)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          maxWidth: '45%'
        }}>
          {gameState.playerTeam.map(char => (
            <CharacterCard
              key={char.id}
              character={char}
              isActive={char.id === gameState.currentActorId}
            />
          ))}
        </div>

        <div style={{
          color: '#8b5cf6',
          fontSize: 'clamp(20px, 2vw, 32px)',
          fontWeight: 'bold',
          textShadow: '0 0 20px rgba(139, 92, 246, 0.5)'
        }}>
          ⚔️ VS ⚔️
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          maxWidth: '45%'
        }}>
          {gameState.enemyTeam.map(char => (
            <CharacterCard
              key={char.id}
              character={char}
              isActive={char.id === gameState.currentActorId}
            />
          ))}
        </div>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        pointerEvents: 'auto'
      }}>
        <div style={{
          background: 'rgba(26, 10, 46, 0.8)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: '10px',
          padding: '10px 20px',
          textAlign: 'center',
          color: '#e0d4f7',
          fontSize: 'clamp(13px, 1.1vw, 16px)',
          minHeight: '24px'
        }}>
          {selectedSkill
            ? `已选择【${selectedSkill.name}】- 点击敌方目标进行攻击（再次点击技能取消）`
            : gameState.battleMessage}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 'clamp(10px, 1.5vw, 24px)',
          flexWrap: 'wrap'
        }}>
          {isPlayerTurn && currentActor && currentActor.skills.map((skill: Skill) => (
            <SkillButton
              key={skill.id}
              skill={skill}
              element={currentActor.element}
              disabled={!isPlayerTurn || gameState.turnPhase !== 'selecting' || skill.currentCooldown > 0}
              onClick={() => {
                if (selectedSkill?.id === skill.id) {
                  setSelectedSkill(null);
                } else {
                  handleSkillClick(skill);
                }
              }}
            />
          ))}
          {!isPlayerTurn && (
            <div style={{
              color: '#8b7aab',
              fontSize: '16px',
              padding: '20px'
            }}>
              AI正在思考...
            </div>
          )}
        </div>

        {gameState.turnPhase === 'ended' && (
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(26, 10, 46, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '2px solid #8b5cf6',
            borderRadius: '20px',
            padding: '40px 60px',
            textAlign: 'center',
            zIndex: 1000,
            boxShadow: '0 0 60px rgba(139, 92, 246, 0.5)'
          }}>
            <div style={{
              fontSize: 'clamp(28px, 4vw, 48px)',
              fontWeight: 'bold',
              color: playerAlive.length > 0 ? '#4ade80' : '#f87171',
              marginBottom: '16px'
            }}>
              {playerAlive.length > 0 ? '🏆 胜利！' : '💀 失败...'}
            </div>
            <div style={{
              color: '#b0a4c7',
              fontSize: 'clamp(14px, 1.2vw, 18px)',
              marginBottom: '24px'
            }}>
              共进行了 {gameState.currentTurn} 回合
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #6b3fa0)',
                border: 'none',
                borderRadius: '10px',
                padding: '14px 40px',
                color: 'white',
                fontSize: 'clamp(14px, 1.3vw, 18px)',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)',
                transition: 'all 0.2s ease'
              }}
            >
              再来一局
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
