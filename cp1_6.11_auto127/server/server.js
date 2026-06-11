import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'data.json');

const DEFAULT_BOOKS = [
  {
    id: 'sample1',
    title: '永乐大典',
    author: '解缙',
    dynasty: '明代',
    coverColor: '#c0392b',
    originalCoverColor: '#8b2323',
    content: {
      left: ['盖闻昔者圣人之御天下也，明乎人文，化成天下。观乎天文，以察时变；观乎人文，以化成天下。', '自书契之作，代有其人，三坟五典之文，八索九丘之籍。'],
      right: ['伏羲氏之王天下也，仰则观象于天，俯则观法于地，观鸟兽之文与地之宜。', '近取诸身，远取诸物，于是始作八卦，以通神明之德，以类万物之情。']
    },
    damageLevel: 75,
    repairProgress: 0,
    isPublic: true,
    repairedBy: '系统示例',
    repairedAt: new Date().toISOString(),
    repairLog: null
  },
  {
    id: 'sample2',
    title: '本草纲目',
    author: '李时珍',
    dynasty: '明代',
    coverColor: '#d4af37',
    originalCoverColor: '#9a8a2f',
    content: {
      left: ['医家之有本草，犹儒家之有六经也。六经者，圣人所以明道；本草者，医家所以治病。', '本草一书，自神农以来，代有增辑。然旧本草多误，学者苦之。'],
      right: ['凡药之性味，有寒有热，有温有凉，有酸苦甘辛咸之五味，有宣通补泻轻重之十剂。', '用药者必审其真，辨其性，而后可以施治。不则，毫厘之差，千里之谬。']
    },
    damageLevel: 60,
    repairProgress: 0,
    isPublic: true,
    repairedBy: '系统示例',
    repairedAt: new Date().toISOString(),
    repairLog: null
  },
  {
    id: 'sample3',
    title: '天工开物',
    author: '宋应星',
    dynasty: '明代',
    coverColor: '#2c3e50',
    originalCoverColor: '#1a252f',
    content: {
      left: ['天覆地载，物数号万，而事亦因之。曲成而不遗，岂人力也哉？', '事物而既万矣，必待口授目成而后识之，其与几何？万事万物之中，其无益生人之事者，亦鲜矣。'],
      right: ['是书与科举功名，毫无涉也。盖人巧造成异物也，凡为天下国家不可阙之书。', '卷分前后，乃贵五谷而贱金玉之义。观者率意翻披，当知作者苦心。']
    },
    damageLevel: 85,
    repairProgress: 0,
    isPublic: true,
    repairedBy: '系统示例',
    repairedAt: new Date().toISOString(),
    repairLog: null
  },
  {
    id: 'sample4',
    title: '梦溪笔谈',
    author: '沈括',
    dynasty: '北宋',
    coverColor: '#27ae60',
    originalCoverColor: '#1e8449',
    content: {
      left: ['予退处林下，深居绝过从。思平日与客言者，时纪一事于笔，则若有所晤言。', '萧然移日，所与谈者，唯笔砚而已，谓之笔谈。所录唯山间木荫，率意谈噱，不系人之利害者。'],
      right: ['至於馆阁之言，非幽居所宜言，亦不载也。圣谟国政，及事近宫省，皆不敢私纪。', '至于系当日士大夫毁誉者，虽善亦不欲书，非止不言人恶而已。']
    },
    damageLevel: 50,
    repairProgress: 0,
    isPublic: true,
    repairedBy: '系统示例',
    repairedAt: new Date().toISOString(),
    repairLog: null
  },
  {
    id: 'sample5',
    title: '资治通鉴',
    author: '司马光',
    dynasty: '北宋',
    coverColor: '#8e44ad',
    originalCoverColor: '#6c3483',
    content: {
      left: ['臣光曰：臣闻天子之职莫大于礼，礼莫大于分，分莫大于名。何谓礼？纪纲是也。', '何谓分？君臣是也。何谓名？公侯卿大夫是也。夫以四海之广，兆民之众。'],
      right: ['受制于一人，虽有绝伦之力，高世之智，莫不奔走而服役者，岂非以礼为之纪纲哉！', '是故天子统三公，三公率诸侯，诸侯制卿大夫，卿大夫治士庶人。']
    },
    damageLevel: 70,
    repairProgress: 0,
    isPublic: true,
    repairedBy: '系统示例',
    repairedAt: new Date().toISOString(),
    repairLog: null
  },
  {
    id: 'sample6',
    title: '水经注',
    author: '郦道元',
    dynasty: '北魏',
    coverColor: '#2980b9',
    originalCoverColor: '#1f618d',
    content: {
      left: ['水者，天地之血气，百脉之流通者也。大哉水之为用也，天地之大观也。', '昔禹治洪水，山陵当路者毁之，凿龙门，辟伊阙，底柱，破碣石，堕断天地之性。'],
      right: ['虽有大功，而天道不能全也。何则？水之流也，折而旋之，激而扬之，非人力之所及也。', '故知天地之间，无不有水，水之流注，无不有经，经之流注，无不有注。']
    },
    damageLevel: 55,
    repairProgress: 0,
    isPublic: true,
    repairedBy: '系统示例',
    repairedAt: new Date().toISOString(),
    repairLog: null
  }
];

function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (!data.publicBooks || data.publicBooks.length === 0) {
        data.publicBooks = DEFAULT_BOOKS;
        saveData(data);
      }
      return data;
    }
  } catch (e) {
    console.error('Error reading data:', e);
  }
  const initial = {
    publicBooks: DEFAULT_BOOKS,
    userBooks: []
  };
  saveData(initial);
  return initial;
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving data:', e);
  }
}

let dataStore = readData();

app.get('/api/random-book', (req, res) => {
  try {
    const publicBooks = dataStore.publicBooks.filter(b => b.isPublic);
    if (publicBooks.length === 0) {
      return res.status(404).json({ error: '没有可用的公开古籍' });
    }
    const randomIndex = Math.floor(Math.random() * publicBooks.length);
    res.json(publicBooks[randomIndex]);
  } catch (e) {
    res.status(500).json({ error: '服务器错误' });
  }
});

app.get('/api/public-books', (req, res) => {
  try {
    res.json(dataStore.publicBooks.filter(b => b.isPublic));
  } catch (e) {
    res.status(500).json({ error: '服务器错误' });
  }
});

app.get('/api/books', (req, res) => {
  try {
    res.json(dataStore.userBooks);
  } catch (e) {
    res.status(500).json({ error: '服务器错误' });
  }
});

app.get('/api/books/:id', (req, res) => {
  try {
    const { id } = req.params;
    const book = dataStore.userBooks.find(b => b.id === id);
    if (!book) {
      return res.status(404).json({ error: '未找到该古籍' });
    }
    res.json(book);
  } catch (e) {
    res.status(500).json({ error: '服务器错误' });
  }
});

app.post('/api/books', (req, res) => {
  try {
    const bookData = req.body;
    const newBook = {
      ...bookData,
      id: bookData.id || uuidv4(),
      repairedAt: new Date().toISOString()
    };
    dataStore.userBooks.push(newBook);
    
    if (bookData.isPublic) {
      const existingPublic = dataStore.publicBooks.findIndex(b => b.id === newBook.id);
      if (existingPublic >= 0) {
        dataStore.publicBooks[existingPublic] = newBook;
      } else {
        dataStore.publicBooks.push(newBook);
      }
    }
    
    saveData(dataStore);
    res.status(201).json(newBook);
  } catch (e) {
    console.error('Error creating book:', e);
    res.status(500).json({ error: '保存失败' });
  }
});

app.put('/api/books/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const bookIndex = dataStore.userBooks.findIndex(b => b.id === id);
    if (bookIndex < 0) {
      return res.status(404).json({ error: '未找到该古籍' });
    }
    
    dataStore.userBooks[bookIndex] = {
      ...dataStore.userBooks[bookIndex],
      ...updates,
      id,
      repairedAt: new Date().toISOString()
    };
    
    if (updates.isPublic) {
      const publicIndex = dataStore.publicBooks.findIndex(b => b.id === id);
      if (publicIndex >= 0) {
        dataStore.publicBooks[publicIndex] = {
          ...dataStore.publicBooks[publicIndex],
          ...updates,
          id
        };
      } else {
        dataStore.publicBooks.push({
          ...dataStore.userBooks[bookIndex]
        });
      }
    }
    
    saveData(dataStore);
    res.json(dataStore.userBooks[bookIndex]);
  } catch (e) {
    res.status(500).json({ error: '更新失败' });
  }
});

app.delete('/api/books/:id', (req, res) => {
  try {
    const { id } = req.params;
    const beforeLength = dataStore.userBooks.length;
    dataStore.userBooks = dataStore.userBooks.filter(b => b.id !== id);
    
    if (dataStore.userBooks.length === beforeLength) {
      return res.status(404).json({ error: '未找到该古籍' });
    }
    
    saveData(dataStore);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: '删除失败' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`古籍修复工坊后端服务已启动: http://localhost:${PORT}`);
});
