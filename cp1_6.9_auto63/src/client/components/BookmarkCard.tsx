import React, { useState, useEffect } from 'react';
import { Heart, Share2, ExternalLink, Trash2 } from 'lucide-react';
import { Bookmark, PublicUser } from '../types';
import { api } from '../utils/api';
import { highlightText, copyToClipboard, getHostname, formatDate } from '../utils/helpers';
import { useUIStore } from '../store/uiStore';
import { UserAvatar } from './UserAvatar';
import './BookmarkCard.css';

interface Props {
  bookmark: Bookmark;
  user?: PublicUser;
  searchKeyword?: string;
  index?: number;
  showDelete?: boolean;
  onDelete?: (id: string) => void;
}

export const BookmarkCard: React.FC<Props> = ({
  bookmark,
  user,
  searchKeyword = '',
  index = 0,
  showDelete = false,
  onDelete
}) => {
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(bookmark.favoriteCount);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const { addToast } = useUIStore();

  useEffect(() => {
    const checkFavoriteStatus = async () => {
      const response = await api.bookmarks.favoriteStatus(bookmark.id);
      if (response.success && response.data) {
        setIsFavorited((response.data as { isFavorited: boolean }).isFavorited);
      }
    };
    checkFavoriteStatus();
  }, [bookmark.id]);

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAnimating(true);
    const response = await api.bookmarks.favorite(bookmark.id);
    if (response.success && response.data) {
      const data = response.data as { favoriteCount: number; isFavorited: boolean };
      setIsFavorited(data.isFavorited);
      setFavoriteCount(data.favoriteCount);
    }
    setTimeout(() => setIsAnimating(false), 400);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSharing) return;
    setIsSharing(true);
    const response = await api.bookmarks.share(bookmark.id);
    if (response.success && response.data) {
      const shortUrl = (response.data as { shortUrl: string }).shortUrl;
      const copied = await copyToClipboard(shortUrl);
      if (copied) {
        addToast('短链接已复制到剪贴板', 'success');
      } else {
        addToast('复制失败，请手动复制', 'error');
      }
    }
    setIsSharing(false);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('确定要删除这个书签吗？')) {
      const response = await api.bookmarks.remove(bookmark.id);
      if (response.success) {
        addToast('书签已删除', 'success');
        onDelete?.(bookmark.id);
      } else {
        addToast(response.error || '删除失败', 'error');
      }
    }
  };

  const handleCardClick = () => {
    window.open(bookmark.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="bookmark-card fade-in"
      style={{ animationDelay: `${index * 0.03}s` }}
      onClick={handleCardClick}
    >
      {user && (
        <div className="bookmark-user">
          <UserAvatar letter={user.avatar.letter} color={user.avatar.color} size={32} />
          <span className="bookmark-user-name">{user.nickname}</span>
          <span className="bookmark-date">{formatDate(bookmark.createdAt)}</span>
        </div>
      )}

      <div className="bookmark-content">
        <h3 className="bookmark-title">
          {highlightText(bookmark.title, searchKeyword)}
        </h3>
        <div className="bookmark-url">
          <ExternalLink size={14} />
          <span>{getHostname(bookmark.url)}</span>
        </div>
        {bookmark.description && (
          <p className="bookmark-description">
            {highlightText(bookmark.description, searchKeyword)}
          </p>
        )}
      </div>

      {bookmark.tags.length > 0 && (
        <div className="bookmark-tags">
          {bookmark.tags.map((tag) => (
            <span key={tag} className="bookmark-tag">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="bookmark-actions">
        <button
          className={`bookmark-action favorite ${isFavorited ? 'active' : ''} ${isAnimating ? 'pulse-animation' : ''}`}
          onClick={handleFavorite}
        >
          <Heart size={18} fill={isFavorited ? 'currentColor' : 'none'} />
          <span>{favoriteCount}</span>
        </button>
        <button
          className="bookmark-action share"
          onClick={handleShare}
          disabled={isSharing}
        >
          <Share2 size={18} />
        </button>
        {showDelete && (
          <button
            className="bookmark-action delete"
            onClick={handleDelete}
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </div>
  );
};
