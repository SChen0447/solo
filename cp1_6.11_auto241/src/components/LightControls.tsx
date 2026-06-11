import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { LightParams } from '../utils/projection';

interface LightControlsProps {
  light: LightParams;
  onChange: (light: LightParams) => void;
}

const LightControls: React.FC<LightControlsProps> = ({ light, onChange }) => {
  const handleAltitudeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...light, altitude: Number(e.target.value) });
    },
    [light, onChange]
  );

  const handleAzimuthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...light, azimuth: Number(e.target.value) });
    },
    [light, onChange]
  );

  const triggerVibration = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, []);

  const trackStyle: React.CSSProperties = {
    width: '100%',
    height: 6,
    borderRadius: 3,
    background: 'rgba(255, 248, 231, 0.15)',
    position: 'relative',
    outline: 'none',
  };

  const thumbStyle = {
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: '#fff8e7',
    border: '2px solid #3d3d3d',
    cursor: 'grab',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 24,
        padding: 24,
        background: 'rgba(255, 248, 231, 0.15)',
        borderRadius: 16,
        border: '1px solid rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(10px)',
        width: 200,
      }}
    >
      <div
        style={{
          color: '#fff8e7',
          fontFamily: 'Georgia, serif',
          fontSize: 14,
          letterSpacing: 2,
          textTransform: 'uppercase',
          textAlign: 'center',
          opacity: 0.9,
        }}
      >
        光源控制
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <label
            style={{
              color: '#fff8e7',
              fontFamily: 'Georgia, serif',
              fontSize: 12,
              opacity: 0.85,
            }}
          >
            高度角
          </label>
          <motion.span
            key={light.altitude}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            style={{
              color: '#fff8e7',
              fontFamily: 'Georgia, serif',
              fontSize: 14,
              fontWeight: 'bold',
              fontVariantNumeric: 'tabular-nums',
              minWidth: 42,
              textAlign: 'right',
            }}
          >
            {light.altitude}°
          </motion.span>
        </div>
        <motion.div whileTap={{ scale: 0.99 }}>
          <input
            type="range"
            min={10}
            max={90}
            step={1}
            value={light.altitude}
            onChange={handleAltitudeChange}
            onInput={triggerVibration}
            style={{
              ...trackStyle,
              WebkitAppearance: 'none',
              appearance: 'none',
            }}
          />
        </motion.div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            color: '#fff8e7',
            fontSize: 10,
            opacity: 0.5,
            fontFamily: 'Georgia, serif',
          }}
        >
          <span>10°</span>
          <span>90°</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <label
            style={{
              color: '#fff8e7',
              fontFamily: 'Georgia, serif',
              fontSize: 12,
              opacity: 0.85,
            }}
          >
            方位角
          </label>
          <motion.span
            key={light.azimuth}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            style={{
              color: '#fff8e7',
              fontFamily: 'Georgia, serif',
              fontSize: 14,
              fontWeight: 'bold',
              fontVariantNumeric: 'tabular-nums',
              minWidth: 42,
              textAlign: 'right',
            }}
          >
            {light.azimuth}°
          </motion.span>
        </div>
        <motion.div whileTap={{ scale: 0.99 }}>
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={light.azimuth}
            onChange={handleAzimuthChange}
            onInput={triggerVibration}
            style={{
              ...trackStyle,
              WebkitAppearance: 'none',
              appearance: 'none',
            }}
          />
        </motion.div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            color: '#fff8e7',
            fontSize: 10,
            opacity: 0.5,
            fontFamily: 'Georgia, serif',
          }}
        >
          <span>0°</span>
          <span>360°</span>
        </div>
      </div>

      <div
        style={{
          width: 60,
          height: 60,
          alignSelf: 'center',
          position: 'relative',
          borderRadius: '50%',
          background: 'rgba(61, 61, 61, 0.5)',
          border: '1px solid rgba(255, 248, 231, 0.3)',
        }}
      >
        <motion.div
          animate={{
            rotate: light.azimuth,
          }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 4,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 6,
              height: 6 + (light.altitude - 10) * 0.25,
              borderRadius: 3,
              background: `linear-gradient(to bottom, #fff8e7, rgba(255, 248, 231, ${
                0.2 + (light.altitude - 10) * 0.01
              }))`,
              boxShadow: `0 0 ${4 + (light.altitude - 10) * 0.1}px #fff8e7`,
            }}
          />
        </motion.div>
      </div>
    </div>
  );
};

const sliderStyle = document.createElement('style');
sliderStyle.textContent = `
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff8e7;
    border: 2px solid #3d3d3d;
    cursor: grab;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    transition: transform 0.1s ease;
  }
  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }
  input[type="range"]::-webkit-slider-thumb:active {
    cursor: grabbing;
    transform: scale(1.15);
  }
  input[type="range"]::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff8e7;
    border: 2px solid #3d3d3d;
    cursor: grab;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  }
`;
if (typeof document !== 'undefined') {
  document.head.appendChild(sliderStyle);
}

export default React.memo(LightControls);
