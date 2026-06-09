import { Router, Response } from 'express';
import { readJSONFile, writeJSONFile, UsersData, BookmarksData, FollowsData } from '../utils/jsonStore';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { User, PublicUser, Bookmark, BookmarkWithUser } from '../../../shared/types';

const router = Router();
const PAGE_SIZE = 20;

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    nickname: user.nickname,
    avatar: user.avatar
  };
}

router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.userId!;
    const query = (req.query.q as string) || '';

    const data = readJSONFile<UsersData>('users.json', { users: [] });
    let users = data.users.filter((u: User) => u.id !== currentUserId);

    if (query) {
      const queryLower = query.toLowerCase();
      users = users.filter((u: User) =>
        u.nickname.toLowerCase().includes(queryLower) ||
        u.email.toLowerCase().includes(queryLower)
      );
    }

    const publicUsers = users.slice(0, 20).map(toPublicUser);
    res.json({ success: true, data: publicUsers });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

router.get('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = readJSONFile<UsersData>('users.json', { users: [] });

    const user = data.users.find((u: User) => u.id === id);
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' });
      return;
    }

    res.json({ success: true, data: toPublicUser(user) });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

router.get('/:id/bookmarks', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const search = (req.query.search as string) || '';
    const tag = (req.query.tag as string) || '';

    const data = readJSONFile<BookmarksData>('bookmarks.json', { bookmarks: [] });
    let bookmarks = data.bookmarks.filter((b: Bookmark) => b.userId === id);

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
    console.error('Get user bookmarks error:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

router.post('/:id/follow', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const followerId = req.userId!;
    const followingId = req.params.id;

    if (followerId === followingId) {
      res.status(400).json({ success: false, error: '不能关注自己' });
      return;
    }

    const usersData = readJSONFile<UsersData>('users.json', { users: [] });
    const targetUser = usersData.users.find((u: User) => u.id === followingId);
    if (!targetUser) {
      res.status(404).json({ success: false, error: '用户不存在' });
      return;
    }

    const followsData = readJSONFile<FollowsData>('follows.json', { follows: [] });
    const existingFollow = followsData.follows.find(
      (f: any) => f.followerId === followerId && f.followingId === followingId
    );

    if (existingFollow) {
      res.json({ success: true, data: { isFollowing: true } });
      return;
    }

    followsData.follows.push({
      followerId,
      followingId,
      createdAt: new Date().toISOString()
    });
    writeJSONFile('follows.json', followsData);

    res.json({ success: true, data: { isFollowing: true } });
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

router.delete('/:id/follow', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const followerId = req.userId!;
    const followingId = req.params.id;

    const followsData = readJSONFile<FollowsData>('follows.json', { follows: [] });
    const followIndex = followsData.follows.findIndex(
      (f: any) => f.followerId === followerId && f.followingId === followingId
    );

    if (followIndex !== -1) {
      followsData.follows.splice(followIndex, 1);
      writeJSONFile('follows.json', followsData);
    }

    res.json({ success: true, data: { isFollowing: false } });
  } catch (error) {
    console.error('Unfollow error:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

router.get('/:id/follow-status', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const followerId = req.userId!;
    const followingId = req.params.id;

    const followsData = readJSONFile<FollowsData>('follows.json', { follows: [] });
    const isFollowing = followsData.follows.some(
      (f: any) => f.followerId === followerId && f.followingId === followingId
    );

    res.json({ success: true, data: { isFollowing } });
  } catch (error) {
    console.error('Follow status error:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

router.get('/:id/followers', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const followsData = readJSONFile<FollowsData>('follows.json', { follows: [] });
    const usersData = readJSONFile<UsersData>('users.json', { users: [] });

    const followerIds = followsData.follows
      .filter((f: any) => f.followingId === id)
      .map((f: any) => f.followerId);

    const followers = usersData.users
      .filter((u: User) => followerIds.includes(u.id))
      .map(toPublicUser);

    res.json({ success: true, data: followers });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

router.get('/:id/following', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const followsData = readJSONFile<FollowsData>('follows.json', { follows: [] });
    const usersData = readJSONFile<UsersData>('users.json', { users: [] });

    const followingIds = followsData.follows
      .filter((f: any) => f.followerId === id)
      .map((f: any) => f.followingId);

    const following = usersData.users
      .filter((u: User) => followingIds.includes(u.id))
      .map(toPublicUser);

    res.json({ success: true, data: following });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

router.get('/timeline', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const page = parseInt(req.query.page as string) || 1;

    const followsData = readJSONFile<FollowsData>('follows.json', { follows: [] });
    const followingIds = followsData.follows
      .filter((f: any) => f.followerId === userId)
      .map((f: any) => f.followingId);

    const bookmarksData = readJSONFile<BookmarksData>('bookmarks.json', { bookmarks: [] });
    const usersData = readJSONFile<UsersData>('users.json', { users: [] });

    let bookmarks = bookmarksData.bookmarks.filter((b: Bookmark) =>
      followingIds.includes(b.userId)
    );

    bookmarks.sort(
      (a: Bookmark, b: Bookmark) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const total = bookmarks.length;
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const paginatedBookmarks = bookmarks.slice(start, end);
    const hasMore = end < total;

    const bookmarksWithUser: BookmarkWithUser[] = paginatedBookmarks.map((b: Bookmark) => {
      const user = usersData.users.find((u: User) => u.id === b.userId);
      return {
        ...b,
        user: user ? toPublicUser(user) : { id: '', nickname: '未知用户', avatar: { letter: '?', color: '#999' } }
      };
    });

    res.json({
      success: true,
      data: {
        bookmarks: bookmarksWithUser,
        hasMore,
        total
      }
    });
  } catch (error) {
    console.error('Timeline error:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

router.get('/tags/list', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const data = readJSONFile<BookmarksData>('bookmarks.json', { bookmarks: [] });
    const userBookmarks = data.bookmarks.filter((b: Bookmark) => b.userId === userId);

    const tagCount: Record<string, number> = {};
    userBookmarks.forEach((b: Bookmark) => {
      b.tags.forEach((tag: string) => {
        if (tag) {
          tagCount[tag] = (tagCount[tag] || 0) + 1;
        }
      });
    });

    const tags = Object.entries(tagCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    res.json({ success: true, data: tags });
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

export default router;
