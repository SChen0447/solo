import './BookCardSkeleton.css';

function BookCardSkeleton() {
  return (
    <div className="book-card-skeleton paper-texture">
      <div className="skeleton-cover" />
      <div className="skeleton-info">
        <div className="skeleton-line title" />
        <div className="skeleton-line author" />
        <div className="skeleton-line desc" />
        <div className="skeleton-line desc short" />
      </div>
    </div>
  );
}

export default BookCardSkeleton;
