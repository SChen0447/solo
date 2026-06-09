import { Router, Response } from 'express';
import { readJSONFile, writeJSONFile, BookmarksData, FavoritesData, ShortLinksData } from '../utils/jsonStore';
import { generateId, generateShortHash, sanitizeString } from '../utils/helpers';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { Bookmark } from '../../../shared/types';

const router = Router();
const PAGE_SIZE = 20;

router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const page = parseInt(req.query.page as string) || 1;
    const search = (req.query.search as string) || '';
    const tag = (req.query.tag as string) || '';

    const data = readJSONFile<BookmarksData>('bookmarks.json', { bookmarks: [] });
    let bookmarks = data.bookmarks.filter((b: Bookmark) => b.userId === userId);

    if (tag) {
      bookmarks = bookmarks.filter((b: Bookmark) => b.tags.includes(tag));
    }

    if (search) {
      const searchLower = search.toLowerCase();
      bookmarks = bookmarks.filter(
        (b: Bookmark) =>
          b.title.toLowerCase().includes(searchLower) ||
          b.description.toLowerCase().includes(searchLower)
      );
    }

    bookmarks.sort(
      (a: Bookmark, b: Bookmark) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const total = bookmarks.length;
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const paginatedBookmarks = bookmarks.slice(start, end);
    const hasMore = end < total;

    res.json({
      success: true,
      data: {
        bookmarks: paginatedBookmarks,
        hasMore,
        total
      }
    });
  } catch (error) {
    console.error('Get bookmarks error:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { url, title, description, tags } = req.body;

    if (!url) {
      res.status(400).json({ success: false, error: 'URL不能为空' });
      return;
    }

    if (!title) {
      res.status(400).json({ success: false, error: '标题不能为空' });
      return;
    }

    const data = readJSONFile<BookmarksData>('bookmarks.json', { bookmarks: [] });
    const now = new Date().toISOString();

    const newBookmark: Bookmark = {
      id: generateId(),
      userId,
      url: sanitizeString(url),
      title: sanitizeString(title),
      description: sanitizeString(description || ''),
      tags: (tags || []).slice(0, 3).map((t: string) => sanitizeString(t)),
      favoriteCount: 0,
      createdAt: now,
      updatedAt: now
    };

    data.bookmarks.push(newBookmark);
    writeJSONFile('bookmarks.json', data);

    res.json({ success: true, data: newBookmark });
  } catch (error) {
    console.error('Create bookmark error:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

router.put('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { title, description, tags } = req.body;

    const data = readJSONFile<BookmarksData>('bookmarks.json', { bookmarks: [] });
    const bookmarkIndex = data.bookmarks.findIndex(
      (b: Bookmark) => b.id === id && b.userId === userId
    );

    if (bookmarkIndex === -1) {
      res.status(404).json({ success: false, error: '书签不存在' });
      return;
    }

    const bookmark = data.bookmarks[bookmarkIndex];
    bookmark.title = sanitizeString(title || bookmark.title);
    bookmark.description = sanitizeString(description || bookmark.description);
    bookmark.tags = (tags || bookmark.tags).slice(0, 3).map((t: string) => sanitizeString(t));
    bookmark.updatedAt = new Date().toISOString();

    writeJSONFile('bookmarks.json', data);
    res.json({ success: true, data: bookmark });
  } catch (error) {
    console.error('Update bookmark error:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

router.delete('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const data = readJSONFile<BookmarksData>('bookmarks.json', { bookmarks: [] });
    const bookmarkIndex = data.bookmarks.findIndex(
      (b: Bookmark) => b.id === id && b.userId === userId
    );

    if (bookmarkIndex === -1) {
      res.status(404).json({ success: false, error: '书签不存在' });
      return;
    }

    data.bookmarks.splice(bookmarkIndex, 1);
    writeJSONFile('bookmarks.json', data);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete bookmark error:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

router.post('/:id/favorite', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const bookmarksData = readJSONFile<BookmarksData>('bookmarks.json', { bookmarks: [] });
    const bookmark = bookmarksData.bookmarks.find((b: Bookmark) => b.id === id);

    if (!bookmark) {
      res.status(404).json({ success: false, error: '书签不存在' });
      return;
    }

    const favoritesData = readJSONFile<FavoritesData>('favorites.json', { favorites: [] });
    const existingFavorite = favoritesData.favorites.find(
      (f: any) => f.userId === userId && f.bookmarkId === id
    );

    let isFavorited: boolean;

    if (existingFavorite) {
      const idx = favoritesData.favorites.indexOf(existingFavorite);
      favoritesData.favorites.splice(idx, 1);
      bookmark.favoriteCount = Math.max(0, bookmark.favoriteCount - 1);
      isFavorited = false;
    } else {
      favoritesData.favorites.push({
        userId,
        bookmarkId: id,
        createdAt: new Date().toISOString()
      });
      bookmark.favoriteCount += 1;
      isFavorited = true;
    }

    writeJSONFile('favorites.json', favoritesData);
    writeJSONFile('bookmarks.json', bookmarksData);

    res.json({ success: true, data: { favoriteCount: bookmark.favoriteCount, isFavorited } });
  } catch (error) {
    console.error('Favorite error:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

router.get('/:id/favorite/status', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const favoritesData = readJSONFile<FavoritesData>('favorites.json', { favorites: [] });
    const isFavorited = favoritesData.favorites.some(
      (f: any) => f.userId === userId && f.bookmarkId === id
    );

    res.json({ success: true, data: { isFavorited } });
  } catch (error) {
    console.error('Favorite status error:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

router.post('/:id/share', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const bookmarksData = readJSONFile<BookmarksData>('bookmarks.json', { bookmarks: [] });
    const bookmark = bookmarksData.bookmarks.find((b: Bookmark) => b.id === id);

    if (!bookmark) {
      res.status(404).json({ success: false, error: '书签不存在' });
      return;
    }

    const shortlinksData = readJSONFile<ShortLinksData>('shortlinks.json', { shortlinks: [] });
    let existingLink = shortlinksData.shortlinks.find((s: any) => s.bookmarkId === id);

    if (!existingLink) {
      const hash = generateShortHash();
      existingLink = {
        hash,
        bookmarkId: id,
        createdAt: new Date().toISOString()
      };
      shortlinksData.shortlinks.push(existingLink);
      writeJSONFile('shortlinks.json', shortlinksData);
    }

    const shortUrl = `${req.protocol}://${req.get('host')}/s/${existingLink.hash}`;
    res.json({ success: true, data: { shortUrl, hash: existingLink.hash } });
  } catch (error) {
    console.error('Share error:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

export default router;
