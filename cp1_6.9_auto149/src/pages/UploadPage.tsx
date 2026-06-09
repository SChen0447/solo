import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User } from '../types';
import ParticlePreview from '../components/ParticlePreview';

interface UploadPageProps {
  user: User | null;
}

const colorPickerPresets = [
  '#8b5cf6', '#a78bfa', '#ec4899', '#f472b6', '#ef4444',
  '#f87171', '#f59e0b', '#fbbf24', '#10b981', '#34d399',
  '#3b82f6', '#60a5fa', '#06b6d4', '#22d3ee', '#a855f7'
];

const UploadPage: React.FC<UploadPageProps> = ({ user }) => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [story, setStory] = useState('');
  const [colors, setColors] = useState<string[]>(['#aa88ff', '#ff88aa', '#ffcc66']);
  const [startPrice, setStartPrice] = useState(100);
  const [activeColorPicker, setActiveColorPicker] = useState<number | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    }
  };

  const handleSubmit = () => {
    if (!user) return;
    if (!name.trim() || !story.trim()) {
      alert('请填写样本名称和故事');
      return;
    }
    setIsSubmitting(true);
    setSubmitProgress(0);

    const interval = setInterval(() => {
      setSubmitProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 40);

    setTimeout(async () => {
      const endTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      try {
        await axios.post('/api/samples', {
          name,
          story,
          colors,
          startPrice,
          endTime,
          ownerId: user.id,
          ownerName: user.username,
          ownerAvatar: user.avatar
        });
        clearInterval(interval);
        setSubmitProgress(100);
        setShowSuccess(true);
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } catch (err) {
        clearInterval(interval);
        setIsSubmitting(false);
        alert('上传失败');
      }
    }, 2000);
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 80px)',
        background: 'radial-gradient(ellipse at center, #1a0f30 0%, #0a0815 60%, #050210 100%)',
        padding: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}
    >
      {showSuccess && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'linear-gradient(135deg, #10b981, #34d399)',
            color: '#fff',
            padding: '20px 48px',
            borderRadius: '16px',
            fontSize: '18px',
            fontWeight: '700',
            zIndex: 2000,
            boxShadow: '0 0 60px #10b98188'
          }}
        >
          ✦ 星尘上传成功 ✦
        </div>
      )}

      <div
        style={{
          width: '500px',
          minHeight: '600px',
          borderRadius: '20px',
          background: '#0a0a1a',
          border: '1px solid #ffffff15',
          padding: '32px',
          color: '#ddddee',
          boxShadow: '0 0 60px #aa88ff22'
        }}
      >
        <h2
          style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#fff',
            textAlign: 'center',
            marginBottom: '24px',
            letterSpacing: '4px',
            textShadow: '0 0 30px #aa88ff66'
          }}
        >
          ✦ 上传星尘样本 ✦
        </h2>

        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          style={{
            width: '100%',
            height: '140px',
            border: '2px dashed #aa88ff66',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            marginBottom: '24px',
            overflow: 'hidden',
            position: 'relative',
            background: '#ffffff05',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#ff88aa';
            e.currentTarget.style.background = '#aa88ff11';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#aa88ff66';
            e.currentTarget.style.background = '#ffffff05';
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />
          {preview ? (
            <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>🌌</div>
              <div style={{ fontSize: '14px', color: '#aaaacc' }}>点击或拖拽上传灵感图</div>
            </div>
          )}
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', color: '#aa88ff', marginBottom: '12px', letterSpacing: '2px' }}>
            ◇ 选择星尘色彩
          </div>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            {colors.map((color, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <div
                  onClick={() => setActiveColorPicker(activeColorPicker === i ? null : i)}
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    background: color,
                    cursor: 'pointer',
                    border: activeColorPicker === i ? '2px solid #fff' : '2px solid #ffffff33',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    paddingBottom: '4px',
                    boxShadow: `0 0 20px ${color}88`,
                    transition: 'all 0.3s ease'
                  }}
                >
                  <span style={{ fontSize: '10px', color: '#fff', textShadow: '0 0 4px #000' }}>
                    {color}
                  </span>
                </div>
                {activeColorPicker === i && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '68px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#1a0f30',
                      border: '1px solid #aa88ff44',
                      borderRadius: '12px',
                      padding: '12px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gap: '8px',
                      zIndex: 100,
                      width: '220px'
                    }}
                  >
                    {colorPickerPresets.map((preset) => (
                      <div
                        key={preset}
                        onClick={() => {
                          const newColors = [...colors];
                          newColors[i] = preset;
                          setColors(newColors);
                        }}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: preset,
                          cursor: 'pointer',
                          border: color === preset ? '2px solid #fff' : '1px solid #ffffff22'
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ fontSize: '11px', color: '#666688', textAlign: 'center', marginTop: '8px' }}>
            主色 &nbsp; · &nbsp; 辅色 &nbsp; · &nbsp; 高亮色
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <div
            style={{
              borderRadius: '50%',
              padding: '3px',
              background: 'linear-gradient(135deg, #aa88ff44, #ff88aa44)'
            }}
          >
            <ParticlePreview colors={colors} size={100} particleCount={80} />
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="样本名称（最多30字符）"
            value={name}
            onChange={(e) => setName(e.target.value.substring(0, 30))}
            maxLength={30}
            style={{
              width: '100%',
              padding: '14px 18px',
              background: '#ffffff08',
              border: '1px solid #aa88ff44',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '14px',
              fontFamily: 'inherit',
              outline: 'none'
            }}
          />
          <div style={{ fontSize: '11px', color: '#666688', textAlign: 'right', marginTop: '4px' }}>
            {name.length}/30
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <textarea
            placeholder="星尘故事（最多300字符）"
            value={story}
            onChange={(e) => setStory(e.target.value.substring(0, 300))}
            maxLength={300}
            rows={4}
            style={{
              width: '100%',
              padding: '14px 18px',
              background: '#ffffff08',
              border: '1px solid #aa88ff44',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '14px',
              fontFamily: 'inherit',
              outline: 'none',
              resize: 'none'
            }}
          />
          <div style={{ fontSize: '11px', color: '#666688', textAlign: 'right', marginTop: '4px' }}>
            {story.length}/300
          </div>
        </div>

        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '14px', color: '#aa88ff' }}>起拍价:</span>
          <input
            type="number"
            value={startPrice}
            onChange={(e) => setStartPrice(Math.max(10, parseInt(e.target.value) || 10))}
            min={10}
            style={{
              padding: '8px 14px',
              background: '#ffffff08',
              border: '1px solid #aa88ff44',
              borderRadius: '10px',
              color: '#ffaa44',
              fontSize: '16px',
              fontFamily: 'inherit',
              fontWeight: '700',
              outline: 'none',
              width: '100px'
            }}
          />
          <span style={{ fontSize: '14px', color: '#ffaa44' }}>星币</span>
        </div>

        {isSubmitting ? (
          <div
            style={{
              width: '100%',
              height: '48px',
              background: '#ffffff08',
              borderRadius: '12px',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${submitProgress}%`,
                background: 'linear-gradient(90deg, #aa88ff, #ff88aa)',
                transition: 'width 0.05s linear',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span style={{ color: '#fff', fontSize: '14px', fontWeight: '700', letterSpacing: '2px' }}>
                {submitProgress}%
              </span>
            </div>
          </div>
        ) : (
          <button
            onClick={handleSubmit}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #aa88ff, #ff88aa)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '16px',
              fontWeight: '700',
              fontFamily: 'inherit',
              cursor: 'pointer',
              letterSpacing: '4px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 30px #aa88ff88, 0 0 60px #ff88aa44';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            ✦ 提交星尘 ✦
          </button>
        )}
      </div>
    </div>
  );
};

export default UploadPage;
