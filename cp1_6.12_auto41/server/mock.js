import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

let snippets = [
  {
    id: uuidv4(),
    title: 'JavaScript 防抖函数',
    description: '常用的防抖函数实现，用于优化频繁触发的事件如搜索输入、窗口调整等。在事件触发后等待指定时间再执行回调，如果在等待时间内再次触发则重置计时器。',
    code: `function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const debouncedSearch = debounce((query) => {
  console.log('Searching:', query);
}, 300);`,
    language: 'javascript',
    tags: ['JavaScript', '工具函数', '性能优化'],
    createdAt: new Date('2024-01-15T10:30:00').toISOString()
  },
  {
    id: uuidv4(),
    title: 'Python 列表推导式技巧',
    description: '展示Python列表推导式的高级用法，包括条件过滤、嵌套循环和函数应用。',
    code: `numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

even_squares = [x ** 2 for x in numbers if x % 2 == 0]
print(even_squares)

matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
flattened = [num for row in matrix for num in row]
print(flattened)

words = ['hello', 'world', 'python']
lengths = {word: len(word) for word in words}
print(lengths)`,
    language: 'python',
    tags: ['Python', '语法技巧'],
    createdAt: new Date('2024-01-14T14:20:00').toISOString()
  },
  {
    id: uuidv4(),
    title: 'HTML5 语义化结构',
    description: '标准HTML5页面语义化结构模板，包含header、nav、main、article、section、aside、footer等元素。',
    code: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>语义化页面</title>
</head>
<body>
  <header>
    <h1>网站标题</h1>
    <nav>
      <ul>
        <li><a href="#home">首页</a></li>
        <li><a href="#about">关于</a></li>
      </ul>
    </nav>
  </header>
  <main>
    <article>
      <h2>文章标题</h2>
      <section>
        <h3>章节标题</h3>
        <p>内容...</p>
      </section>
    </article>
  </main>
  <footer>
    <p>&copy; 2024 版权声明</p>
  </footer>
</body>
</html>`,
    language: 'html',
    tags: ['HTML', '前端', '模板'],
    createdAt: new Date('2024-01-13T09:15:00').toISOString()
  },
  {
    id: uuidv4(),
    title: 'CSS Flexbox 居中布局',
    description: '使用Flexbox实现各种居中布局的代码片段，包括水平居中、垂直居中和完全居中。',
    code: `.container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

.space-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.wrap-container {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.column-layout {
  display: flex;
  flex-direction: column;
  gap: 8px;
}`,
    language: 'css',
    tags: ['CSS', '前端', '布局'],
    createdAt: new Date('2024-01-12T16:45:00').toISOString()
  },
  {
    id: uuidv4(),
    title: 'Bash 批量重命名脚本',
    description: '用于批量重命名文件的Bash脚本，支持添加前缀、后缀和替换文件名中的特定字符串。',
    code: `#!/bin/bash

add_prefix() {
  local prefix="$1"
  for file in *; do
    if [ -f "$file" ]; then
      mv "$file" "${prefix}${file}"
    fi
  done
}

replace_text() {
  local old="$1"
  local new="$2"
  for file in *"$old"*; do
    if [ -f "$file" ]; then
      newname="${file//$old/$new}"
      mv "$file" "$newname"
    fi
  done
}

add_suffix() {
  local suffix="$1"
  for file in *; do
    if [ -f "$file" ]; then
      name="${file%.*}"
      ext="${file##*.}"
      mv "$file" "${name}${suffix}.${ext}"
    fi
  done
}`,
    language: 'bash',
    tags: ['Bash', '脚本', '工具'],
    createdAt: new Date('2024-01-11T11:30:00').toISOString()
  },
  {
    id: uuidv4(),
    title: 'React Hooks 使用示例',
    description: '展示React常用Hooks的使用方法，包括useState、useEffect、useContext、useMemo和useCallback。',
    code: `import { useState, useEffect, useMemo, useCallback } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = \`Count: \${count}\`;
    return () => {
      console.log('Cleanup');
    };
  }, [count]);

  const expensiveValue = useMemo(() => {
    return count * 2;
  }, [count]);

  const handleClick = useCallback(() => {
    setCount(prev => prev + 1);
  }, []);

  return (
    <div>
      <p>Count: {count}</p>
      <p>Double: {expensiveValue}</p>
      <button onClick={handleClick}>Increment</button>
    </div>
  );
}`,
    language: 'javascript',
    tags: ['React', 'JavaScript', '前端'],
    createdAt: new Date('2024-01-10T13:20:00').toISOString()
  },
  {
    id: uuidv4(),
    title: 'Python 异步编程示例',
    description: '使用asyncio进行异步编程的基础示例，包括协程定义、任务创建和并发执行。',
    code: `import asyncio
import aiohttp

async def fetch_data(url):
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.json()

async def main():
    urls = [
        'https://api.example.com/data/1',
        'https://api.example.com/data/2',
        'https://api.example.com/data/3',
    ]

    tasks = [fetch_data(url) for url in urls]
    results = await asyncio.gather(*tasks)

    for result in results:
        print(result)

async def run_with_timeout():
    try:
        result = await asyncio.wait_for(
            fetch_data('https://api.example.com/data'),
            timeout=5.0
        )
        print(result)
    except asyncio.TimeoutError:
        print('Request timed out')

if __name__ == '__main__':
    asyncio.run(main())`,
    language: 'python',
    tags: ['Python', '异步编程'],
    createdAt: new Date('2024-01-09T08:45:00').toISOString()
  },
  {
    id: uuidv4(),
    title: 'TypeScript 泛型工具类型',
    description: 'TypeScript内置泛型工具类型的使用示例，包括Partial、Required、Pick、Omit、Record等。',
    code: `interface User {
  id: number;
  name: string;
  email: string;
  age?: number;
}

type PartialUser = Partial<User>;
type RequiredUser = Required<User>;
type UserWithoutAge = Omit<User, 'age'>;
type UserBasicInfo = Pick<User, 'id' | 'name'>;

type UserRole = 'admin' | 'user' | 'guest';
type RolePermissions = Record<UserRole, string[]>;

const permissions: RolePermissions = {
  admin: ['read', 'write', 'delete'],
  user: ['read', 'write'],
  guest: ['read']
};

type Nullable<T> = T | null;
type NullableUser = Nullable<User>;

type ReadonlyDeep<T> = {
  readonly [P in keyof T]: ReadonlyDeep<T[P]>;
};`,
    language: 'javascript',
    tags: ['TypeScript', '前端', '类型系统'],
    createdAt: new Date('2024-01-08T15:10:00').toISOString()
  },
  {
    id: uuidv4(),
    title: 'CSS Grid 响应式布局',
    description: '使用CSS Grid创建响应式网格布局的完整示例，支持自动适配不同屏幕尺寸。',
    code: `.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  padding: 20px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 250px 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "sidebar header"
    "sidebar main"
    "sidebar footer";
  min-height: 100vh;
}

.header { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main { grid-area: main; }
.footer { grid-area: footer; }

@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
    grid-template-areas:
      "header"
      "main"
      "sidebar"
      "footer";
  }
}`,
    language: 'css',
    tags: ['CSS', '前端', '响应式'],
    createdAt: new Date('2024-01-07T10:55:00').toISOString()
  },
  {
    id: uuidv4(),
    title: 'Bash Git 快捷命令',
    description: '提高Git工作效率的Bash别名和函数，包括状态查看、提交、推送和分支管理。',
    code: `alias gs='git status'
alias ga='git add'
alias gc='git commit -m'
alias gp='git push'
alias gpl='git pull'
alias gb='git branch'
alias gco='git checkout'
alias gd='git diff'
alias gl='git log --oneline --graph --all'

gac() {
  git add .
  git commit -m "$1"
}

gacp() {
  git add .
  git commit -m "$1"
  git push
}

gclean() {
  git branch --merged | grep -v "\*" | xargs -n 1 git branch -d
}

gup() {
  git fetch --all --prune
  git pull
}`,
    language: 'bash',
    tags: ['Bash', 'Git', '效率工具'],
    createdAt: new Date('2024-01-06T14:30:00').toISOString()
  }
];

app.get('/snippets', (req, res) => {
  const { search, tag } = req.query;
  let filtered = [...snippets];

  if (search) {
    const searchLower = String(search).toLowerCase();
    filtered = filtered.filter(s =>
      s.title.toLowerCase().includes(searchLower) ||
      s.code.toLowerCase().includes(searchLower)
    );
  }

  if (tag) {
    filtered = filtered.filter(s => s.tags.includes(String(tag)));
  }

  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(filtered);
});

app.get('/snippets/:id', (req, res) => {
  const snippet = snippets.find(s => s.id === req.params.id);
  if (!snippet) {
    return res.status(404).json({ error: 'Snippet not found' });
  }
  res.json(snippet);
});

app.post('/snippets', (req, res) => {
  const { title, description, code, language, tags } = req.body;

  if (!title || !code) {
    return res.status(400).json({ error: 'Title and code are required' });
  }

  const newSnippet = {
    id: uuidv4(),
    title,
    description: description || '',
    code,
    language: language || 'javascript',
    tags: tags || [],
    createdAt: new Date().toISOString()
  };

  snippets.unshift(newSnippet);
  res.status(201).json(newSnippet);
});

app.put('/snippets/:id', (req, res) => {
  const index = snippets.findIndex(s => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Snippet not found' });
  }

  const { title, description, code, language, tags } = req.body;

  if (!title || !code) {
    return res.status(400).json({ error: 'Title and code are required' });
  }

  snippets[index] = {
    ...snippets[index],
    title,
    description: description || snippets[index].description,
    code,
    language: language || snippets[index].language,
    tags: tags !== undefined ? tags : snippets[index].tags
  };

  res.json(snippets[index]);
});

app.delete('/snippets/:id', (req, res) => {
  const index = snippets.findIndex(s => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Snippet not found' });
  }

  const deleted = snippets.splice(index, 1);
  res.json(deleted[0]);
});

app.listen(PORT, () => {
  console.log(`Mock server running on http://localhost:${PORT}`);
});
