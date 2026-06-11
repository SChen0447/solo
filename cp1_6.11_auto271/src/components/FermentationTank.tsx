import React, { useState, useEffect, useRef } from 'react';
import { TeaState, FermentationParams, TeaVariety } from '../FermentationEngine';

interface FermentationTankProps {
  variety: TeaVariety;
  params: FermentationParams;
  state: TeaState;
  totalDays: number;
  isSwaying: boolean;
}

export const FermentationTank: React.FC<FermentationTankProps> = ({
  variety,
  params,
  state,
  totalDays,
  isSwaying
}) => {
  const liquidHeight = 30 + state.progress * 50;

  return (
    <div className={`tank-svg-wrapper ${isSwaying ? 'liquid-sway' : ''}`}>
      <svg
        className="tank-svg"
        viewBox="0 0 300 400"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="tankGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D7CCC8" />
            <stop offset="50%" stopColor="#EFEBE9" />
            <stop offset="100%" stopColor="#BCAAA4" />
          </linearGradient>
          <linearGradient id="teaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={state.colorHex} stopOpacity="0.9" />
            <stop offset="100%" stopColor={state.colorHex} stopOpacity="1" />
          </linearGradient>
          <linearGradient id="teaSoupGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={state.teaSoupColorHex} stopOpacity="0.7" />
            <stop offset="100%" stopColor={state.teaSoupColorHex} stopOpacity="1" />
          </linearGradient>
          <filter id="tankShadow" x="-20%" y="-10%" width="140%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#6D4C41" floodOpacity="0.3" />
          </filter>
          <clipPath id="tankClip">
            <path d="M80 60 Q150 40 220 60 L230 360 Q150 380 70 360 Z" />
          </clipPath>
        </defs>

        <path
          d="M80 60 Q150 40 220 60 L230 360 Q150 380 70 360 Z"
          fill="url(#tankGradient)"
          stroke="#8D6E63"
          strokeWidth="3"
          filter="url(#tankShadow)"
        />

        <g clipPath="url(#tankClip)" className="tank-liquid">
          <rect
            x="60"
            y={360 - liquidHeight}
            width="200"
            height={liquidHeight + 20}
            fill="url(#teaGradient)"
            style={{ transition: 'y 0.5s ease' }}
          />
          <ellipse
            cx="150"
            cy={360 - liquidHeight}
            rx="80"
            ry="12"
            fill={state.colorHex}
            opacity="0.6"
            style={{ transition: 'cy 0.5s ease' }}
          />
        </g>

        <path
          d="M80 60 Q150 40 220 60 L230 360 Q150 380 70 360 Z"
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="2"
          strokeDasharray="4 2"
        />

        <path
          d="M75 70 Q150 50 225 70"
          fill="none"
          stroke="#A1887F"
          strokeWidth="2"
        />
        <ellipse
          cx="150"
          cy="65"
          rx="75"
          ry="8"
          fill="none"
          stroke="#8D6E63"
          strokeWidth="2"
        />

        <g transform="translate(260, 120)">
          <rect
            x="0"
            y="0"
            width="20"
            height="150"
            rx="10"
            fill="#FFF8F0"
            stroke="#8D6E63"
            strokeWidth="2"
          />
          <rect
            x="4"
            y={140 - (params.temperature / 45) * 130}
            width="12"
            height={(params.temperature / 45) * 130}
            rx="6"
            fill="#E57373"
            style={{ transition: 'y 0.3s ease, height 0.3s ease' }}
          />
          <circle cx="10" cy="142" r="8" fill="#E57373" />
        </g>

        <g transform="translate(260, 150)">
          <circle cx="10" cy="40" r="12" fill="#FFF8F0" stroke="#8D6E63" strokeWidth="2" />
          <path
            d={`M10 40 L10 ${40 - 10} M10 40 L${10 + 10 * Math.sin((params.humidity / 100) * Math.PI)} ${40 - 10 * Math.cos((params.humidity / 100) * Math.PI)}`}
            stroke="#5D4037"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ transition: 'all 0.3s ease' }}
          />
        </g>
      </svg>

      <div className="tank-indicators">
        <div className="indicator">
          <div className="indicator-label">温度</div>
          <div className="indicator-value">{params.temperature.toFixed(1)}°C</div>
        </div>
        <div className="indicator">
          <div className="indicator-label">湿度</div>
          <div className="indicator-value">{params.humidity}%</div>
        </div>
        <div className="indicator">
          <div className="indicator-label">翻堆</div>
          <div className="indicator-value">每{params.turnFrequency}h</div>
        </div>
      </div>
    </div>
  );
};

export default FermentationTank;
