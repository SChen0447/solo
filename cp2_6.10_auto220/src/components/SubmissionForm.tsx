import React, { useState } from 'react';

interface SubmissionFormProps {
  themeId: string;
  timeLeft: number;
  isLocked: boolean;
  onSubmit: (data: {
    themeId: string;
    recipeName: string;
    ingredients: string[];
    description: string;
  }) => void;
}

const SubmissionForm: React.FC<SubmissionFormProps> = ({ themeId, timeLeft, isLocked, onSubmit }) => {
  const [recipeName, setRecipeName] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked || !recipeName.trim() || !ingredients.trim() || !description.trim()) return;

    const ingredientList = ingredients
      .split(',')
      .map((i) => i.trim())
      .filter((i) => i.length > 0);

    onSubmit({
      themeId,
      recipeName: recipeName.trim(),
      ingredients: ingredientList,
      description: description.trim()
    });

    setRecipeName('');
    setIngredients('');
    setDescription('');
  };

  const isFormValid = recipeName.trim() && ingredients.trim() && description.trim() && !isLocked;

  const styles: Record<string, React.CSSProperties> = {
    form: {
      flex: 1,
      backgroundColor: '#fff0e0',
      borderRadius: 12,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      opacity: isLocked ? 0.6 : 1,
      pointerEvents: isLocked ? 'none' : 'auto',
      minWidth: 0
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4
    },
    title: {
      fontSize: 16,
      fontWeight: 600,
      color: '#3d2c1a'
    },
    timeBadge: {
      fontSize: 12,
      color: timeLeft <= 10 ? '#e63946' : '#3d5a80',
      fontWeight: 600,
      backgroundColor: timeLeft <= 10 ? 'rgba(230,57,70,0.1)' : 'rgba(61,90,128,0.1)',
      padding: '4px 10px',
      borderRadius: 12
    },
    label: {
      fontSize: 12,
      fontWeight: 500,
      color: '#6b5b4e',
      marginBottom: -4
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #d4a373',
      borderRadius: 8,
      backgroundColor: '#fff',
      fontSize: 14,
      color: '#3d2c1a',
      outline: 'none',
      fontFamily: 'inherit',
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
    },
    textarea: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #d4a373',
      borderRadius: 8,
      backgroundColor: '#fff',
      fontSize: 14,
      color: '#3d2c1a',
      outline: 'none',
      resize: 'none',
      fontFamily: 'inherit',
      minHeight: 60,
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
    },
    charCount: {
      fontSize: 11,
      color: description.length > 180 ? '#e63946' : '#999',
      textAlign: 'right',
      marginTop: -8
    },
    submitBtn: {
      backgroundColor: isFormValid ? '#3d5a80' : '#aaa',
      color: '#fff',
      border: 'none',
      padding: '12px',
      borderRadius: 8,
      fontSize: 14,
      fontWeight: 600,
      cursor: isFormValid ? 'pointer' : 'not-allowed',
      transition: 'all 0.2s ease',
      marginTop: 4
    }
  };

  return (
    <form style={styles.form} onSubmit={handleSubmit}>
      <div style={styles.header}>
        <h3 style={styles.title}>📝 提交你的烘焙创意</h3>
        <span style={styles.timeBadge}>⏱ {timeLeft}s</span>
      </div>

      <label style={styles.label}>配方名称</label>
      <input
        style={styles.input}
        type="text"
        placeholder="例如：海风柠檬泡芙"
        value={recipeName}
        onChange={(e) => setRecipeName(e.target.value)}
        maxLength={30}
        disabled={isLocked}
      />

      <label style={styles.label}>食材列表（逗号分隔）</label>
      <input
        style={styles.input}
        type="text"
        placeholder="例如：面粉,鸡蛋,黄油,柠檬,海盐"
        value={ingredients}
        onChange={(e) => setIngredients(e.target.value)}
        disabled={isLocked}
      />

      <label style={styles.label}>创意说明（最多200字）</label>
      <textarea
        style={styles.textarea}
        placeholder="描述你的创意灵感、风味搭配和制作亮点..."
        value={description}
        onChange={(e) => setDescription(e.target.value.slice(0, 200))}
        disabled={isLocked}
      />
      <span style={styles.charCount}>{description.length}/200</span>

      <button
        type="submit"
        style={styles.submitBtn}
        disabled={!isFormValid}
        onMouseEnter={(e) => {
          if (isFormValid) {
            (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
            (e.target as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(61,90,128,0.4)';
          }
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
          (e.target as HTMLButtonElement).style.boxShadow = 'none';
        }}
      >
        {isLocked ? '🔒 提交已锁定' : '✨ 提交创意'}
      </button>
    </form>
  );
};

export default SubmissionForm;
