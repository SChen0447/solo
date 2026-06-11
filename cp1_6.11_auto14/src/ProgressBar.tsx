interface ProgressBarProps {
  currentIndex: number;
  total: number;
}

const ProgressBar = ({ currentIndex, total }: ProgressBarProps) => {
  const percentage = total === 0 ? 0 : Math.min((currentIndex / total) * 100, 100);

  return (
    <div className="progress-container">
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="progress-percentage">
        {Math.round(percentage)}%
      </div>
    </div>
  );
};

export default ProgressBar;
