import * as express from 'express';
import * as cors from 'cors';
import * as path from 'path';
import authRoutes from './routes/auth.routes';
import bookmarksRoutes from './routes/bookmarks.routes';
import usersRoutes from './routes/users.routes';
import scrapeRoutes from './routes/scrape.routes';
import { readJSONFile, BookmarksData, ShortLinksData } from './utils/jsonStore';
import { Bookmark } from '../../shared/types';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/bookmarks', bookmarksRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/timeline', (req, res, next) => {
  if (req.path === '/' && req.method === 'GET') {
    return usersRoutes(req, res, next);
  }
  next();
});
app.use('/api/tags', (req, res, next) => {
  if (req.path === '/list' && req.method === 'GET') {
    return usersRoutes(req, res, next);
  }
  next();
});
app.use('/api/scrape', scrapeRoutes);

app.get('/s/:hash', (req, res) => {
  try {
    const { hash } = req.params;
    const shortlinksData = readJSONFile<ShortLinksData>('shortlinks.json', { shortlinks: [] });
    const shortlink = shortlinksData.shortlinks.find((s: any) => s.hash === hash);

    if (!shortlink) {
      res.status(404).send('短链接不存在');
      return;
    }

    const bookmarksData = readJSONFile<BookmarksData>('bookmarks.json', { bookmarks: [] });
    const bookmark = bookmarksData.bookmarks.find((b: Bookmark) => b.id === shortlink.bookmarkId);

    if (!bookmark) {
      res.status(404).send('书签不存在');
      return;
    }

    res.redirect(bookmark.url);
  } catch (error) {
    console.error('Shortlink redirect error:', error);
    res.status(500).send('服务器错误');
  }
});

app.use(express.static(path.join(__dirname, '../../dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`BookMarkHub 服务器运行在 http://localhost:${PORT}`);
});
