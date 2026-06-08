import { useState } from 'react';
import { Book, Bookmark } from './types';

interface BookDetailProps {
  book: Book;
  onBack: () => void;
  onUpdateProgress: (bookId: string, chapter: number) => void;
  onAddBookmark: (bookId: string, chapter: number, note: string, tags: string[]) => void;
  onDeleteBookmark: (bookId: string, bookmarkId: string) => void;
}

export default function BookDetail({
  book,
  onBack,
  onUpdateProgress,
  onAddBookmark,
  onDeleteBookmark
}: BookDetailProps) {
  const [showBookmarkForm, setShowBookmarkForm] = useState(false);
  const [bookmarkChapter, setBookmarkChapter] = useState(book.currentChapter || 1);
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [bookmarkTags, setBookmarkTags] = useState('');
  const [activeTab, setActiveTab] = useState<'chapters' | 'bookmarks'>('chapters');

  const progressPercent = Math.round((book.currentChapter / book.totalChapters) * 100);

  const handleAddBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = bookmarkTags
      .split(/[,，]/)
      .map(t => t.trim())
      .filter(t => t);
    onAddBookmark(book.id, bookmarkChapter, bookmarkNote, tags);
    setBookmarkNote('');
    setBookmarkTags('');
    setShowBookmarkForm(false);
  };

  const handleChapterClick = (chapter: number) => {
    onUpdateProgress(book.id, chapter);
  };

  const handlePrevChapter = () => {
    if (book.currentChapter > 0) {
      onUpdateProgress(book.id, book.currentChapter - 1);
    }
  };

  const handleNextChapter = () => {
    if (book.currentChapter < book.totalChapters) {
      onUpdateProgress(book.id, book.currentChapter + 1);
    }
  };

  const goToChapter = (chapter: number) => {
    onUpdateProgress(book.id, chapter);
    setActiveTab('chapters');
  };

  const sortedBookmarks = [...book.bookmarks].sort((a, b) => a.chapter - b.chapter);

  return (
    <div className="book-detail-container fade-in">
      <button className="btn-back" onClick={onBack}>
        ← 返回书架
      </button>

      <div className="book-header card">
        <div
          className="book-cover-large"
          style={{ backgroundColor: book.coverColor }}
        >
          <span className="book-cover-text-large">{book.title.charAt(0)}</span>
        </div>
        <div className="book-header-info">
          <h1 className="book-title-large">{book.title}</h1>
          <p className="book-author-large">{book.author}</p>
          <div className="progress-detail">
            <div className="progress-bar-large">
              <div
                className="progress-fill-large"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="progress-text-large">{progressPercent}%</span>
          </div>
          <p className="book-chapters-large">
            第 {book.currentChapter} / {book.totalChapters} 章
          </p>
        </div>
      </div>

      <div className="progress-controls card">
        <h3>阅读进度</h3>
        <div className="progress-buttons">
          <button
            className="btn-secondary"
            onClick={handlePrevChapter}
            disabled={book.currentChapter === 0}
          >
            上一章
          </button>
          <button
            className="btn-primary btn-large"
            onClick={handleNextChapter}
            disabled={book.currentChapter === book.totalChapters}
          >
            {book.currentChapter === 0 ? '开始阅读' : '读完一章'}
          </button>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'chapters' ? 'active' : ''}`}
          onClick={() => setActiveTab('chapters')}
        >
          章节列表
        </button>
        <button
          className={`tab-btn ${activeTab === 'bookmarks' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookmarks')}
        >
          书签笔记 ({book.bookmarks.length})
        </button>
      </div>

      {activeTab === 'chapters' && (
        <div className="chapters-section card fade-in">
          <h3>章节目录</h3>
          <div className="chapters-grid">
            {Array.from({ length: book.totalChapters }, (_, i) => i + 1).map((chapter) => (
              <button
                key={chapter}
                className={`chapter-item ${chapter === book.currentChapter ? 'current' : ''} ${chapter < book.currentChapter ? 'read' : ''}`}
                onClick={() => handleChapterClick(chapter)}
              >
                第{chapter}章
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'bookmarks' && (
        <div className="bookmarks-section card fade-in">
          <div className="bookmarks-header">
            <h3>书签与笔记</h3>
            <button
              className="btn-primary"
              onClick={() => setShowBookmarkForm(!showBookmarkForm)}
            >
              {showBookmarkForm ? '取消' : '+ 添加书签'}
            </button>
          </div>

          {showBookmarkForm && (
            <form className="bookmark-form fade-in" onSubmit={handleAddBookmark}>
              <div className="form-row">
                <div className="form-group">
                  <label>章节</label>
                  <input
                    type="number"
                    value={bookmarkChapter}
                    onChange={(e) => setBookmarkChapter(parseInt(e.target.value) || 1)}
                    min={1}
                    max={book.totalChapters}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>笔记内容</label>
                <textarea
                  value={bookmarkNote}
                  onChange={(e) => setBookmarkNote(e.target.value)}
                  placeholder="记录你的想法..."
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>标签（用逗号分隔）</label>
                <input
                  type="text"
                  value={bookmarkTags}
                  onChange={(e) => setBookmarkTags(e.target.value)}
                  placeholder="例如：精彩情节, 复习, 重点"
                />
              </div>
              <button type="submit" className="btn-primary btn-full">
                保存书签
              </button>
            </form>
          )}

          {sortedBookmarks.length === 0 ? (
            <div className="empty-state">
              <p>还没有书签，点击上方按钮添加第一个书签吧！</p>
            </div>
          ) : (
            <div className="bookmarks-list">
              {sortedBookmarks.map((bookmark) => (
                <div key={bookmark.id} className="bookmark-item fade-in">
                  <div className="bookmark-header">
                    <span
                      className="bookmark-chapter"
                      onClick={() => goToChapter(bookmark.chapter)}
                    >
                      第 {bookmark.chapter} 章
                    </span>
                    <button
                      className="btn-delete"
                      onClick={() => onDeleteBookmark(book.id, bookmark.id)}
                    >
                      删除
                    </button>
                  </div>
                  {bookmark.note && (
                    <p className="bookmark-note">{bookmark.note}</p>
                  )}
                  {bookmark.tags.length > 0 && (
                    <div className="bookmark-tags">
                      {bookmark.tags.map((tag, index) => (
                        <span key={index} className="tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
