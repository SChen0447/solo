import { ArticleData, TextBlock, ImageBlock, CaptionBlock } from '../types';

export function exportHtml(data: ArticleData): string {
  const escapeHtml = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  let blocksHtml = '';
  data.blocks.forEach((block) => {
    if (block.type === 'text') {
      const b = block as TextBlock;
      if (b.isChapter) {
        blocksHtml += `<h2 class="lr-chapter" id="lr-chapter-${b.id}">${escapeHtml(b.content)}</h2>\n`;
      } else {
        blocksHtml += `<p class="lr-text">${escapeHtml(b.content)}</p>\n`;
      }
    } else if (block.type === 'image') {
      const b = block as ImageBlock;
      if (b.src) {
        blocksHtml += `<img class="lr-image" src="${b.src}" alt="${escapeHtml(b.alt)}" />\n`;
      }
    } else if (block.type === 'caption') {
      const b = block as CaptionBlock;
      blocksHtml += `<div class="lr-caption">${escapeHtml(b.content)}</div>\n`;
    }
  });

  const chapters = data.blocks
    .filter((b) => b.type === 'text' && (b as TextBlock).isChapter)
    .map((b) => b as TextBlock);

  let navHtml = '';
  if (chapters.length > 0) {
    navHtml = `
    <div class="lr-nav-wrapper">
      <button class="lr-nav-btn" onclick="toggleNav()">☰</button>
      <div class="lr-nav-panel" id="lrNavPanel">
        ${chapters.map((ch) => `<button class="lr-nav-item" onclick="scrollToChapter('lr-chapter-${ch.id}')">${escapeHtml(ch.content.slice(0, 40))}</button>`).join('\n        ')}
      </div>
    </div>`;
  }

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(data.title || '无标题文章')}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: 100%;
      background-color: #fafafa;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      padding: 20px 0;
    }
    .lr-container {
      width: 100%;
      max-width: 375px;
      min-height: 100vh;
      background-color: #ffffff;
      border-radius: 24px;
      border: 8px solid #e0e0e0;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      position: relative;
    }
    .lr-header {
      position: sticky;
      top: 0;
      background-color: #ffffff;
      border-bottom: 1px solid #f0f0f0;
      padding: 16px 20px;
      z-index: 10;
    }
    .lr-header h1 {
      font-size: 18px;
      font-weight: 600;
      color: #222;
    }
    .lr-content {
      padding: 20px;
      overflow-y: auto;
      scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;
    }
    .lr-text {
      font-family: Georgia, 'Times New Roman', Times, serif;
      font-size: 16px;
      line-height: 1.6;
      color: #333;
      margin-bottom: 16px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .lr-chapter {
      font-family: Georgia, 'Times New Roman', Times, serif;
      font-size: 22px;
      font-weight: bold;
      color: #222222;
      margin: 32px 0;
      scroll-margin-top: 70px;
    }
    .lr-image {
      width: 100%;
      border-radius: 8px;
      margin-bottom: 8px;
      display: block;
    }
    .lr-caption {
      font-size: 12px;
      color: #888888;
      text-align: center;
      margin-bottom: 16px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .lr-progress-bar {
      position: sticky;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
      background-color: #333333;
      z-index: 20;
    }
    .lr-progress-fill {
      height: 100%;
      background-color: #4a90d9;
      width: 0%;
      transition: width 0.1s linear;
    }
    .lr-nav-wrapper {
      position: relative;
    }
    .lr-nav-btn {
      position: absolute;
      top: 60px;
      left: 12px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: #f0f0f0;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      z-index: 15;
      transition: background-color 0.2s;
    }
    .lr-nav-btn:hover {
      background-color: #e0e0e0;
    }
    .lr-nav-panel {
      position: absolute;
      top: 108px;
      left: 12px;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      padding: 8px 0;
      min-width: 200px;
      max-height: 300px;
      overflow-y: auto;
      z-index: 15;
      display: none;
      animation: lrFadeIn 200ms ease-out;
    }
    .lr-nav-panel.visible {
      display: block;
    }
    @keyframes lrFadeIn {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .lr-nav-item {
      padding: 10px 16px;
      cursor: pointer;
      font-size: 14px;
      color: #333;
      transition: background-color 0.15s;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
      font-family: inherit;
    }
    .lr-nav-item:hover {
      background-color: #f5f5f5;
    }
    @media (max-width: 480px) {
      body {
        padding: 0;
      }
      .lr-container {
        max-width: 100%;
        border: none;
        border-radius: 0;
        min-height: 100vh;
      }
    }
  </style>
</head>
<body>
  <div class="lr-container">
    <div class="lr-header">
      <h1>${escapeHtml(data.title || '无标题文章')}</h1>
    </div>
    ${navHtml}
    <div class="lr-content" id="lrContent">
      ${blocksHtml || '<p style="color:#999;text-align:center;padding:40px 0;">暂无内容</p>'}
    </div>
    <div class="lr-progress-bar">
      <div class="lr-progress-fill" id="lrProgress"></div>
    </div>
  </div>

  <script>
    (function() {
      var content = document.getElementById('lrContent');
      var progress = document.getElementById('lrProgress');
      var navPanel = document.getElementById('lrNavPanel');
      var rafId = null;

      function updateProgress() {
        var scrollTop = content.scrollTop;
        var scrollHeight = content.scrollHeight - content.clientHeight;
        var pct = scrollHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100)) : 0;
        progress.style.width = pct + '%';
        rafId = null;
      }

      content.addEventListener('scroll', function() {
        if (rafId === null) {
          rafId = requestAnimationFrame(updateProgress);
        }
      }, { passive: true });

      updateProgress();
    })();

    function toggleNav() {
      var panel = document.getElementById('lrNavPanel');
      if (panel) {
        panel.classList.toggle('visible');
      }
    }

    function scrollToChapter(id) {
      var target = document.getElementById(id);
      var content = document.getElementById('lrContent');
      if (!target || !content) return;

      var targetTop = target.offsetTop - 20;
      var startTop = content.scrollTop;
      var distance = targetTop - startTop;
      var duration = 400;
      var startTime = performance.now();

      function easeInOut(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      }

      function animate(currentTime) {
        var elapsed = currentTime - startTime;
        var progress = Math.min(elapsed / duration, 1);
        content.scrollTop = startTop + distance * easeInOut(progress);
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      }

      requestAnimationFrame(animate);
      if (document.getElementById('lrNavPanel')) {
        document.getElementById('lrNavPanel').classList.remove('visible');
      }
    }

    document.addEventListener('click', function(e) {
      var panel = document.getElementById('lrNavPanel');
      if (!panel) return;
      if (!e.target.closest('.lr-nav-btn') && !e.target.closest('.lr-nav-panel')) {
        panel.classList.remove('visible');
      }
    });
  </script>
</body>
</html>`;

  return html;
}

export function downloadHtml(html: string, filename: string = 'article.html') {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
