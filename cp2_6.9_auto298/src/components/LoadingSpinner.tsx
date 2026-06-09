function LoadingSpinner() {
  return (
    <div className="loading-spinner">
      <div className="ship-wheel">
        <svg viewBox="0 0 120 120" width="60" height="60">
          <circle cx="60" cy="60" r="55" fill="none" stroke="#8B6914" strokeWidth="4" />
          <circle cx="60" cy="60" r="48" fill="none" stroke="#8B6914" strokeWidth="2" opacity="0.5" />
          <circle cx="60" cy="60" r="15" fill="#8B6914" />
          <g stroke="#8B6914" strokeWidth="4" strokeLinecap="round">
            <line x1="60" y1="10" x2="60" y2="45" />
            <line x1="60" y1="75" x2="60" y2="110" />
            <line x1="10" y1="60" x2="45" y2="60" />
            <line x1="75" y1="60" x2="110" y2="60" />
            <line x1="25" y1="25" x2="49" y2="49" />
            <line x1="71" y1="71" x2="95" y2="95" />
            <line x1="95" y1="25" x2="71" y2="49" />
            <line x1="49" y1="71" x2="25" y2="95" />
          </g>
          <circle cx="60" cy="10" r="5" fill="#8B6914" />
          <circle cx="60" cy="110" r="5" fill="#8B6914" />
          <circle cx="10" cy="60" r="5" fill="#8B6914" />
          <circle cx="110" cy="60" r="5" fill="#8B6914" />
          <circle cx="25" cy="25" r="4" fill="#8B6914" />
          <circle cx="95" cy="25" r="4" fill="#8B6914" />
          <circle cx="25" cy="95" r="4" fill="#8B6914" />
          <circle cx="95" cy="95" r="4" fill="#8B6914" />
        </svg>
      </div>
      <p className="loading-text">正在打捞漂流瓶...</p>
    </div>
  );
}

export default LoadingSpinner;
