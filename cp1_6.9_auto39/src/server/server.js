import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const MUSIC_LIBRARY = [
  { id: 'song1', title: '晴天', artist: '周杰伦', duration: 269, coverColor: '#4A90D9', lyric: '故事的小黄花，从出生那年就飘着' },
  { id: 'song2', title: '稻香', artist: '周杰伦', duration: 223, coverColor: '#D4A574', lyric: '随着稻香河流继续奔跑，微微笑小时候的梦我知道' },
  { id: 'song3', title: '七里香', artist: '周杰伦', duration: 299, coverColor: '#7CB342', lyric: '窗外的麻雀在电线杆上多嘴' },
  { id: 'song4', title: '青花瓷', artist: '周杰伦', duration: 239, coverColor: '#5C6BC0', lyric: '天青色等烟雨，而我在等你' },
  { id: 'song5', title: '夜曲', artist: '周杰伦', duration: 235, coverColor: '#1A237E', lyric: '一群嗜血的蚂蚁被腐肉所吸引' },
  { id: 'song6', title: '演员', artist: '薛之谦', duration: 259, coverColor: '#607D8B', lyric: '该配合你演出的我演视而不见' },
  { id: 'song7', title: '刚好遇见你', artist: '李玉刚', duration: 203, coverColor: '#E91E63', lyric: '因为我刚好遇见你，留下足迹才美丽' },
  { id: 'song8', title: '成都', artist: '赵雷', duration: 328, coverColor: '#795548', lyric: '和我在成都的街头走一走' },
  { id: 'song9', title: '平凡之路', artist: '朴树', duration: 299, coverColor: '#9E9E9E', lyric: '我曾经跨过山和大海，也穿过人山人海' },
  { id: 'song10', title: '光年之外', artist: '邓紫棋', duration: 235, coverColor: '#3F51B5', lyric: '感受停在我发端的指尖' },
  { id: 'song11', title: '泡沫', artist: '邓紫棋', duration: 276, coverColor: '#00BCD4', lyric: '阳光下的泡沫，是彩色的' },
  { id: 'song12', title: '海阔天空', artist: 'Beyond', duration: 326, coverColor: '#2196F3', lyric: '今天我，寒夜里看雪飘过' },
  { id: 'song13', title: '光辉岁月', artist: 'Beyond', duration: 297, coverColor: '#FF9800', lyric: '钟声响起归家的讯号' },
  { id: 'song14', title: '真的爱你', artist: 'Beyond', duration: 289, coverColor: '#F44336', lyric: '无法可修饰的一对手' },
  { id: 'song15', title: '喜欢你', artist: 'Beyond', duration: 258, coverColor: '#E91E63', lyric: '细雨带风湿透黄昏的街道' },
  { id: 'song16', title: '不再犹豫', artist: 'Beyond', duration: 245, coverColor: '#FF5722', lyric: '无聊望见了犹豫，达到理想不太易' },
  { id: 'song17', title: '追光者', artist: '岑宁儿', duration: 245, coverColor: '#FFC107', lyric: '我可以跟在你身后，像影子追着光梦游' },
  { id: 'song18', title: '体面', artist: '于文文', duration: 261, coverColor: '#9C27B0', lyric: '分手应该体面，谁都不要说抱歉' },
  { id: 'song19', title: '说散就散', artist: '袁娅维', duration: 213, coverColor: '#673AB7', lyric: '抱一抱，就当作从没有在一起' },
  { id: 'song20', title: '起风了', artist: '买辣椒也用券', duration: 326, coverColor: '#009688', lyric: '这一路上走走停停，顺着少年漂流的痕迹' },
  { id: 'song21', title: '年少有为', artist: '李荣浩', duration: 268, coverColor: '#4CAF50', lyric: '假如我年少有为不自卑' },
  { id: 'song22', title: '李白', artist: '李荣浩', duration: 274, coverColor: '#8BC34A', lyric: '大部分人要我学习去看，世俗的眼光' },
  { id: 'song23', title: '模特', artist: '李荣浩', duration: 307, coverColor: '#CDDC39', lyric: '穿华丽的服装，为原始的渴望而站着' },
  { id: 'song24', title: '消愁', artist: '毛不易', duration: 266, coverColor: '#00BCD4', lyric: '一杯敬朝阳，一杯敬月光' },
  { id: 'song25', title: '像我这样的人', artist: '毛不易', duration: 257, coverColor: '#03A9F4', lyric: '像我这样优秀的人，本该灿烂过一生' },
  { id: 'song26', title: '盛夏', artist: '毛不易', duration: 263, coverColor: '#FF5722', lyric: '那是日落时候轻轻发出的叹息啊' },
  { id: 'song27', title: '南山南', artist: '马頔', duration: 332, coverColor: '#5D4037', lyric: '你在南方的艳阳里，大雪纷飞' },
  { id: 'song28', title: '同桌的你', artist: '老狼', duration: 214, coverColor: '#3E2723', lyric: '明天你是否会想起，昨天你写的日记' },
  { id: 'song29', title: '一生有你', artist: '水木年华', duration: 249, coverColor: '#311B92', lyric: '因为梦见你离开，我从哭泣中醒来' },
  { id: 'song30', title: '童话', artist: '光良', duration: 264, coverColor: '#4527A0', lyric: '我愿变成童话里，你爱的那个天使' },
];

const DEFAULT_DURATION = 180;

let state = {
  currentSong: null,
  currentProgress: 0,
  isPlaying: false,
  queue: [],
  history: [],
  userRequests: {},
  userVotes: {},
  lastElevateTime: Date.now(),
};

function findSongInLibrary(title, artist) {
  return MUSIC_LIBRARY.find(
    (s) => s.title === title && s.artist === artist
  );
}

function getRandomSong() {
  const randomIdx = Math.floor(Math.random() * MUSIC_LIBRARY.length);
  const song = MUSIC_LIBRARY[randomIdx];
  return {
    songId: uuidv4(),
    libraryId: song.id,
    title: song.title,
    artist: song.artist,
    duration: song.duration,
    coverColor: song.coverColor,
    lyric: song.lyric,
    votes: 0,
    requestedBy: 'system',
    requestedAt: Date.now(),
    voters: [],
  };
}

function playNextSong() {
  if (state.currentSong) {
    state.history.unshift(state.currentSong);
    if (state.history.length > 20) state.history = state.history.slice(0, 20);
  }

  if (state.queue.length > 0) {
    state.currentSong = state.queue.shift();
    state.currentProgress = 0;
    state.isPlaying = true;

    io.emit('system-message', {
      id: uuidv4(),
      type: 'announcement',
      content: `正在播放: ${state.currentSong.title} - ${state.currentSong.artist}`,
      timestamp: Date.now(),
    });
  } else {
    state.currentSong = getRandomSong();
    state.currentProgress = 0;
    state.isPlaying = true;

    io.emit('system-message', {
      id: uuidv4(),
      type: 'announcement',
      content: `正在播放: ${state.currentSong.title} - ${state.currentSong.artist}`,
      timestamp: Date.now(),
    });
  }

  io.emit('player-update', getPlayerState());
  io.emit('queue-update', getQueueState());
}

function getPlayerState() {
  return {
    currentSong: state.currentSong,
    currentProgress: state.currentProgress,
    isPlaying: state.isPlaying,
  };
}

function getQueueState() {
  return {
    queue: state.queue,
    history: state.history,
  };
}

function sortQueue() {
  state.queue.sort((a, b) => {
    if (b.votes !== a.votes) return b.votes - a.votes;
    return a.requestedAt - b.requestedAt;
  });
}

setInterval(() => {
  if (state.isPlaying && state.currentSong) {
    state.currentProgress += 1;
    if (state.currentProgress >= state.currentSong.duration) {
      playNextSong();
    } else {
      io.emit('player-update', getPlayerState());
    }
  }
}, 1000);

setInterval(() => {
  const now = Date.now();
  if (now - state.lastElevateTime >= 30000 && state.queue.length > 1) {
    sortQueue();
    state.lastElevateTime = now;
    io.emit('queue-update', getQueueState());
  }
}, 5000);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.emit('player-update', getPlayerState());
  socket.emit('queue-update', getQueueState());

  socket.on('join', (data) => {
    const { nickname } = data;
    if (!state.userRequests[nickname]) state.userRequests[nickname] = new Set();
    if (!state.userVotes[nickname]) state.userVotes[nickname] = new Set();
    socket.data.nickname = nickname;
    socket.emit('joined', { success: true, nickname });
  });

  socket.on('send-bullet', (data) => {
    const { content, nickname } = data;
    if (!nickname || !content) return;

    const bullet = {
      id: uuidv4(),
      content,
      nickname,
      timestamp: Date.now(),
      type: 'normal',
    };
    io.emit('bullet', bullet);

    const dashIdx = content.indexOf('-');
    if (dashIdx > 0) {
      const title = content.slice(0, dashIdx).trim();
      const artist = content.slice(dashIdx + 1).trim();

      if (title && artist) {
        if (!state.userRequests[nickname]) state.userRequests[nickname] = new Set();
        const songKey = `${title}-${artist}`;

        const existingIdx = state.queue.findIndex(
          (s) => s.title === title && s.artist === artist
        );

        if (existingIdx >= 0) {
          if (!state.userRequests[nickname].has(songKey)) {
            if (!state.userVotes[nickname]) state.userVotes[nickname] = new Set();
            if (!state.userVotes[nickname].has(state.queue[existingIdx].songId)) {
              state.queue[existingIdx].votes += 1;
              state.queue[existingIdx].voters.push(nickname);
              state.userVotes[nickname].add(state.queue[existingIdx].songId);
            }
          } else {
            if (!state.userVotes[nickname]) state.userVotes[nickname] = new Set();
            if (!state.userVotes[nickname].has(state.queue[existingIdx].songId)) {
              state.queue[existingIdx].votes += 1;
              state.queue[existingIdx].voters.push(nickname);
              state.userVotes[nickname].add(state.queue[existingIdx].songId);
            }
          }
          sortQueue();
          io.emit('queue-update', getQueueState());
        } else {
          state.userRequests[nickname].add(songKey);
          const librarySong = findSongInLibrary(title, artist);
          const newSong = {
            songId: uuidv4(),
            libraryId: librarySong ? librarySong.id : null,
            title,
            artist,
            duration: librarySong ? librarySong.duration : DEFAULT_DURATION,
            coverColor: librarySong ? librarySong.coverColor : '#555555',
            lyric: librarySong ? librarySong.lyric : '',
            votes: 1,
            requestedBy: nickname,
            requestedAt: Date.now(),
            voters: [nickname],
          };
          if (!state.userVotes[nickname]) state.userVotes[nickname] = new Set();
          state.userVotes[nickname].add(newSong.songId);
          state.queue.push(newSong);
          sortQueue();
          io.emit('queue-update', getQueueState());
        }
      }
    }
  });

  socket.on('vote-song', (data) => {
    const { songId, nickname } = data;
    if (!songId || !nickname) return;

    const idx = state.queue.findIndex((s) => s.songId === songId);
    if (idx < 0) return;

    if (!state.userVotes[nickname]) state.userVotes[nickname] = new Set();
    if (state.userVotes[nickname].has(songId)) return;

    state.queue[idx].votes += 1;
    state.queue[idx].voters.push(nickname);
    state.userVotes[nickname].add(songId);
    sortQueue();
    io.emit('queue-update', getQueueState());
  });

  socket.on('seek-progress', (data) => {
    const { progress } = data;
    if (state.currentSong && typeof progress === 'number') {
      state.currentProgress = Math.max(0, Math.min(progress, state.currentSong.duration));
      io.emit('player-update', getPlayerState());
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

if (!state.currentSong) {
  playNextSong();
}

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
