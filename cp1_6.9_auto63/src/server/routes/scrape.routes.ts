import { Router, Response } from 'express';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { sanitizeString } from '../utils/helpers';

const router = Router();

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { url } = req.body;

    if (!url) {
      res.status(400).json({ success: false, error: 'URL不能为空' });
      return;
    }

    let cleanUrl = sanitizeString(url);
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    try {
      const response = await fetch(cleanUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      let title = $('title').text().trim();
      if (!title) {
        title = $('h1').first().text().trim();
      }
      if (!title) {
        title = cleanUrl;
      }

      let description = '';
      const metaDescription = $('meta[name="description"]').attr('content');
      if (metaDescription) {
        description = metaDescription.trim();
      } else {
        const ogDescription = $('meta[property="og:description"]').attr('content');
        if (ogDescription) {
          description = ogDescription.trim();
        }
      }

      if (description.length > 300) {
        description = description.substring(0, 297) + '...';
      }

      res.json({
        success: true,
        data: {
          title: sanitizeString(title),
          description: sanitizeString(description),
          url: cleanUrl
        }
      });
    } catch (fetchError) {
      console.error('Scrape fetch error:', fetchError);
      res.json({
        success: true,
        data: {
          title: cleanUrl,
          description: '',
          url: cleanUrl
        }
      });
    }
  } catch (error) {
    console.error('Scrape error:', error);
    res.status(500).json({ success: false, error: '抓取失败' });
  }
});

export default router;
