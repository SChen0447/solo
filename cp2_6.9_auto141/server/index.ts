import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { Readable } from 'stream';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }
});

interface VideoSegment {
  id: string;
  startTime: number;
  endTime: number;
  title: string;
  filter: string;
}

app.post('/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未上传视频文件' });
    }

    if (!req.file.originalname.toLowerCase().endsWith('.mp4')) {
      return res.status(400).json({ error: '仅支持 MP4 格式' });
    }

    const buffer = req.file.buffer;
    let duration = 0;

    try {
      const moovIndex = buffer.indexOf(Buffer.from('moov'));
      if (moovIndex !== -1) {
        const mvhdIndex = buffer.indexOf(Buffer.from('mvhd'), moovIndex);
        if (mvhdIndex !== -1) {
          const version = buffer[mvhdIndex + 4];
          let timescaleOffset, durationOffset;
          if (version === 1) {
            timescaleOffset = mvhdIndex + 4 + 1 + 16 + 4;
            durationOffset = timescaleOffset + 4;
          } else {
            timescaleOffset = mvhdIndex + 4 + 1 + 8 + 4;
            durationOffset = timescaleOffset + 4;
          }
          const timescale = buffer.readUInt32BE(timescaleOffset);
          const durationRaw = version === 1
            ? Number(buffer.readBigUInt64BE(durationOffset))
            : buffer.readUInt32BE(durationOffset);
          if (timescale > 0) {
            duration = Math.round(durationRaw / timescale);
          }
        }
      }
    } catch (e) {
      duration = Math.floor(req.file.size / 500000);
    }

    if (duration <= 0) duration = 30;
    if (duration > 3600) duration = 3600;

    res.json({
      success: true,
      duration,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });
  } catch (error) {
    console.error('上传错误:', error);
    res.status(500).json({ error: '服务器处理错误' });
  }
});

app.post('/export', express.json(), async (req, res) => {
  try {
    const { segments }: { segments: VideoSegment[] } = req.body;

    if (!segments || segments.length === 0) {
      return res.status(400).json({ error: '没有片段数据' });
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    const zipParts: Buffer[] = [];
    const localFileHeaders: Buffer[] = [];
    const centralDirectoryHeaders: Buffer[] = [];
    let offset = 0;

    const createFakeMp4 = (segment: VideoSegment): Buffer => {
      const header = Buffer.from([
        0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70,
        0x69, 0x73, 0x6F, 0x6D, 0x00, 0x00, 0x02, 0x00,
        0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x70, 0x32,
        0x61, 0x76, 0x63, 0x31, 0x6D, 0x70, 0x34, 0x31
      ]);
      const titleBuf = Buffer.from(`Segment: ${segment.title} | Time: ${segment.startTime}-${segment.endTime} | Filter: ${segment.filter}`, 'utf-8');
      return Buffer.concat([header, titleBuf, Buffer.alloc(1024, 0xAA)]);
    };

    const crc32 = (buf: Buffer): number => {
      let crc = 0xFFFFFFFF;
      const table: number[] = [];
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
          c = c & 1 ? (0xEDB88320 ^ (c >>> 1)) : c >>> 1;
        }
        table[n] = c;
      }
      for (let i = 0; i < buf.length; i++) {
        crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
      }
      return (crc ^ 0xFFFFFFFF) >>> 0;
    };

    segments.forEach((segment, index) => {
      const fileName = `${String(index + 1).padStart(2, '0')}_${segment.title || '片段' + (index + 1)}.mp4`;
      const fileContent = createFakeMp4(segment);
      const fileNameBuf = Buffer.from(fileName, 'utf-8');
      const crcVal = crc32(fileContent);
      const compressedSize = fileContent.length;
      const uncompressedSize = fileContent.length;

      const localHeader = Buffer.alloc(30 + fileNameBuf.length);
      localHeader.writeUInt32LE(0x04034B50, 0);
      localHeader.writeUInt16LE(20, 4);
      localHeader.writeUInt16LE(0, 6);
      localHeader.writeUInt16LE(0, 8);
      localHeader.writeUInt16LE(0, 10);
      localHeader.writeUInt16LE(0, 12);
      localHeader.writeUInt32LE(crcVal, 14);
      localHeader.writeUInt32LE(compressedSize, 18);
      localHeader.writeUInt32LE(uncompressedSize, 22);
      localHeader.writeUInt16LE(fileNameBuf.length, 26);
      localHeader.writeUInt16LE(0, 28);
      fileNameBuf.copy(localHeader, 30);

      localFileHeaders.push(localHeader);
      zipParts.push(localHeader);
      zipParts.push(fileContent);

      const centralHeader = Buffer.alloc(46 + fileNameBuf.length);
      centralHeader.writeUInt32LE(0x02014B50, 0);
      centralHeader.writeUInt16LE(20, 4);
      centralHeader.writeUInt16LE(20, 6);
      centralHeader.writeUInt16LE(0, 8);
      centralHeader.writeUInt16LE(0, 10);
      centralHeader.writeUInt16LE(0, 12);
      centralHeader.writeUInt16LE(0, 14);
      centralHeader.writeUInt32LE(crcVal, 16);
      centralHeader.writeUInt32LE(compressedSize, 20);
      centralHeader.writeUInt32LE(uncompressedSize, 24);
      centralHeader.writeUInt16LE(fileNameBuf.length, 28);
      centralHeader.writeUInt16LE(0, 30);
      centralHeader.writeUInt16LE(0, 32);
      centralHeader.writeUInt16LE(0, 34);
      centralHeader.writeUInt16LE(0, 36);
      centralHeader.writeUInt32LE(0, 38);
      centralHeader.writeUInt32LE(offset, 42);
      fileNameBuf.copy(centralHeader, 46);
      centralDirectoryHeaders.push(centralHeader);

      offset += localHeader.length + fileContent.length;
    });

    const centralDirBuffer = Buffer.concat(centralDirectoryHeaders);
    const endOfCentralDir = Buffer.alloc(22);
    endOfCentralDir.writeUInt32LE(0x06054B50, 0);
    endOfCentralDir.writeUInt16LE(0, 4);
    endOfCentralDir.writeUInt16LE(0, 6);
    endOfCentralDir.writeUInt16LE(segments.length, 8);
    endOfCentralDir.writeUInt16LE(segments.length, 10);
    endOfCentralDir.writeUInt32LE(centralDirBuffer.length, 12);
    endOfCentralDir.writeUInt32LE(offset, 16);
    endOfCentralDir.writeUInt16LE(0, 20);

    zipParts.push(centralDirBuffer);
    zipParts.push(endOfCentralDir);

    const zipBuffer = Buffer.concat(zipParts);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="video_segments.zip"');
    res.setHeader('Content-Length', String(zipBuffer.length));

    const stream = Readable.from(zipBuffer);
    stream.pipe(res);
  } catch (error) {
    console.error('导出错误:', error);
    res.status(500).json({ error: '导出失败' });
  }
});

app.listen(PORT, () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`);
});
