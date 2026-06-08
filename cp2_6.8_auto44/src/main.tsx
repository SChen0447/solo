import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

const style = document.createElement('style');
style.textContent = `
  * {
    box-sizing: border-box;
  }
  
  body {
    margin: 0;
    padding: 0;
  }
  
  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    cursor: pointer;
  }
  
  input[type="range"]::-webkit-slider-runnable-track {
    background: #0f3460;
    height: 6px;
    border-radius: 3px;
  }
  
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    margin-top: -5px;
    background-color: #e94560;
    height: 16px;
    width: 16px;
    border-radius: 50%;
    transition: all 0.2s ease;
  }
  
  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 0 10px rgba(233, 69, 96, 0.5);
  }
  
  input[type="range"]::-moz-range-track {
    background: #0f3460;
    height: 6px;
    border-radius: 3px;
  }
  
  input[type="range"]::-moz-range-thumb {
    border: none;
    background-color: #e94560;
    height: 16px;
    width: 16px;
    border-radius: 50%;
  }
  
  button:hover {
    transform: translateY(-2px);
  }
  
  button:active {
    transform: translateY(0);
  }
  
  @media (max-width: 768px) {
    .container {
      flex-direction: column !important;
    }
    
    .leftPanel, .rightPanel {
      width: 100% !important;
    }
    
    .leftPanel {
      height: 60vh;
      overflow-y: auto;
    }
  }
`;
document.head.appendChild(style);
