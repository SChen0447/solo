import { useState } from 'react';

interface TastingFormProps {
  onSubmit: (data: {
    coffeeName: string;
    roastLevel: string;
    flavors: {
      acidity: number;
      bitterness: number;
      sweetness: number;
      body: number;
      cleanliness: number;
    };
  }) => void;
  onCancel?: () => void;
}

const SLIDERS = [
  { key: 'acidity', label: '酸度', color: '#E74C3C', gradient: 'linear-gradient(90deg, #FADBD8, #E74C3C)' },
  { key: 'bitterness', label: '苦度', color: '#8B4513', gradient: 'linear-gradient(90deg, #E8D5C4, #8B4513)' },
  { key: 'sweetness', label: '甜度', color: '#F39C12', gradient: 'linear-gradient(90deg, #FDEBD0, #F39C12)' },
  { key: 'body', label: '醇厚度', color: '#D4A574', gradient: 'linear-gradient(90deg, #F5E6D3, #D4A574)' },
  { key: 'cleanliness', label: '干净度', color: '#27AE60', gradient: 'linear-gradient(90deg, #D5F5E3, #27AE60)' }
] as const;

type FlavorKey = typeof SLIDERS[number]['key'];

export default function TastingForm({ onSubmit, onCancel }: TastingFormProps) {
  const [coffeeName, setCoffeeName] = useState('');
  const [roastLevel, setRoastLevel] = useState('中度烘焙');
  const [flavors, setFlavors] = useState<Record<FlavorKey, number>>({
    acidity: 5,
    bitterness: 5,
    sweetness: 5,
    body: 5,
    cleanliness: 5
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coffeeName.trim()) return;

    onSubmit({
      coffeeName: coffeeName.trim(),
      roastLevel,
      flavors
    });

    setCoffeeName('');
    setRoastLevel('中度烘焙');
    setFlavors({
      acidity: 5,
      bitterness: 5,
      sweetness: 5,
      body: 5,
      cleanliness: 5
    });
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.formGroup}>
        <label style={styles.label}>咖啡名称</label>
        <input
          type="text"
          value={coffeeName}
          onChange={(e) => setCoffeeName(e.target.value)}
          placeholder="例如：埃塞俄比亚 耶加雪菲"
          style={styles.input}
          required
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>烘焙度</label>
        <select
          value={roastLevel}
          onChange={(e) => setRoastLevel(e.target.value)}
          style={styles.select}
        >
          <option value="浅度烘焙">浅度烘焙</option>
          <option value="中浅烘焙">中浅烘焙</option>
          <option value="中度烘焙">中度烘焙</option>
          <option value="中深烘焙">中深烘焙</option>
          <option value="深度烘焙">深度烘焙</option>
        </select>
      </div>

      <div style={{ marginTop: 16 }}>
        <p style={{ ...styles.label, marginBottom: 12 }}>风味评分（0-10）</p>
        {SLIDERS.map((slider) => (
          <div key={slider.key} style={styles.sliderContainer}>
            <div style={styles.sliderHeader}>
              <span style={{ ...styles.sliderLabel, color: slider.color }}>{slider.label}</span>
              <span style={{ ...styles.sliderValue, color: slider.color }}>{flavors[slider.key]}</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={flavors[slider.key]}
              onChange={(e) =>
                setFlavors((prev) => ({
                  ...prev,
                  [slider.key]: parseInt(e.target.value, 10)
                }))
              }
              style={{
                ...styles.slider,
                background: slider.gradient
              }}
            />
          </div>
        ))}
      </div>

      <div style={styles.buttonGroup}>
        <button type="submit" style={styles.submitButton} className="submit-button">
          保存品鉴记录
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} style={styles.cancelButton} className="cancel-button">
            取消
          </button>
        )}
      </div>

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8B5E3C, #C68E4A);
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 2px 6px rgba(139, 94, 60, 0.4);
          transition: transform 0.15s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8B5E3C, #C68E4A);
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 2px 6px rgba(139, 94, 60, 0.4);
        }
      `}</style>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0
  },
  formGroup: {
    marginBottom: 16
  },
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    color: '#8B5E3C',
    marginBottom: 6
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    fontSize: 14,
    border: '2px solid #D4A57440',
    borderRadius: 8,
    backgroundColor: '#FFFBF5',
    color: '#5D4037',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box'
  },
  select: {
    width: '100%',
    padding: '10px 14px',
    fontSize: 14,
    border: '2px solid #D4A57440',
    borderRadius: 8,
    backgroundColor: '#FFFBF5',
    color: '#5D4037',
    outline: 'none',
    cursor: 'pointer',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box'
  },
  sliderContainer: {
    marginBottom: 14
  },
  sliderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  sliderLabel: {
    fontSize: 13,
    fontWeight: 600
  },
  sliderValue: {
    fontSize: 15,
    fontWeight: 700
  },
  slider: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    outline: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
    cursor: 'pointer'
  },
  buttonGroup: {
    display: 'flex',
    gap: 12,
    marginTop: 20
  },
  submitButton: {
    flex: 1,
    padding: '12px 20px',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#8B5E3C',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  cancelButton: {
    padding: '12px 20px',
    fontSize: 14,
    fontWeight: 600,
    color: '#8B5E3C',
    backgroundColor: '#FFFBF5',
    border: '2px solid #D4A574',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }
};
