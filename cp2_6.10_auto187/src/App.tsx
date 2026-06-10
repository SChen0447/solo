import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Editor from './components/Editor';
import Preview from './components/Preview';
import { ArticleData, TextBlock } from './types';
import { exportHtml, downloadHtml } from './utils/exportHtml';

const initialData: ArticleData = {
  title: '我的长文标题',
  blocks: [
    {
      id: uuidv4(),
      type: 'text',
      content: '这是一段示例文字，你可以双击这段文字进入编辑模式，修改为你自己的内容。编辑器支持拖拽排序、图片上传、章节标记等功能。',
      isChapter: false,
    } as TextBlock,
    {
      id: uuidv4(),
      type: 'text',
      content: '第一章：入门介绍',
      isChapter: true,
    } as TextBlock,
    {
      id: uuidv4(),
      type: 'text',
      content: '点击左侧的"+ 添加图片块"按钮可以插入图片，支持点击或拖拽上传。图片会以 base64 格式嵌入，导出的 HTML 是完全自包含的，可以离线阅读。',
      isChapter: false,
    } as TextBlock,
  ],
};

const App: React.FC = () => {
  const [data, setData] = useState<ArticleData>(initialData);

  const handleExport = () => {
    const html = exportHtml(data);
    downloadHtml(html, 'article.html');
  };

  return (
    <div className="app-container">
      <div className="toolbar">
        <div className="toolbar-title">LongRead Editor</div>
        <div className="toolbar-actions">
          <button className="export-btn" onClick={handleExport}>
            导出 HTML
          </button>
        </div>
      </div>
      <div className="main-content">
        <Editor data={data} onChange={setData} />
        <div className="divider" />
        <Preview data={data} />
      </div>
    </div>
  );
};

export default App;
