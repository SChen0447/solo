interface CounterProps {
  count: number;
}

function Counter({ count }: CounterProps) {
  return (
    <div className="pick-counter">
      <span className="counter-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="#2C2C2C">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      </span>
      <span className="counter-text">今日剩余 <strong>{count}</strong> 次</span>
    </div>
  );
}

export default Counter;
