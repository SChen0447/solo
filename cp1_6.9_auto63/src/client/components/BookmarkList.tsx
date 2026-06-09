import React from 'react';
import { Bookmark, BookmarkWithUser } from '../types';
import { BookmarkCard } from './BookmarkCard';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import './BookmarkList.css';

interface Props {
  bookmarks: (Bookmark | BookmarkWithUser)[];
  hasMore: boolean;
  loadMore: () => Promise<void>;
  searchKeyword?: string;
  showDelete?: boolean;
  onDelete?: (id: string) => void;
  emptyText?: string;
}

export const BookmarkList: React.FC<Props> = ({
  bookmarks,
  hasMore,
  loadMore,
  searchKeyword = '',
  showDelete = false,
  onDelete,
  emptyText = '暂无书签'
}) => {
  const { sentinelRef, isLoading } = useInfiniteScroll(loadMore, hasMore);

  if (bookmarks.length === 0 && !isLoading) {
    return (
      <div className="bookmark-list-empty">
        <p>{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="bookmark-list">
      <div className="bookmark-grid">
        {bookmarks.map((bookmark, index) => {
          const b = bookmark as BookmarkWithUser;
          return (
            <BookmarkCard
              key={bookmark.id}
              bookmark={bookmark}
              user={b.user}
              searchKeyword={searchKeyword}
              index={index}
              showDelete={showDelete}
              onDelete={onDelete}
            />
          );
        })}
      </div>
      {hasMore && (
        <div ref={sentinelRef} className="bookmark-list-loading">
          {isLoading && (
            <div className="loading-spinner">
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
