import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import type { User, Capsule, PageContent, Notebook, Collaborator } from '../shared/types';

const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'journal_capsule',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool: mysql.Pool | null = null;
let useMemoryStore = false;

const memoryStore = {
  users: new Map<string, User>(),
  capsules: new Map<string, Capsule>(),
  notebooks: new Map<string, Notebook>(),
  collaborators: new Map<string, Collaborator>(),
  usersByEmail: new Map<string, string>(),
  usersByUsername: new Map<string, string>()
};

async function initTables(conn: mysql.PoolConnection) {
  const sql = `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_username (username),
      INDEX idx_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS notebooks (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL DEFAULT '我的手账',
      is_shared BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS capsules (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      notebook_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      encrypted_content TEXT NOT NULL,
      encryption_key VARCHAR(255) NOT NULL,
      open_date DATETIME NOT NULL,
      sealed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_opened BOOLEAN DEFAULT FALSE,
      is_shared BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_notebook_id (notebook_id),
      INDEX idx_open_date (open_date),
      INDEX idx_is_opened (is_opened)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS notebook_collaborators (
      id VARCHAR(36) PRIMARY KEY,
      notebook_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36),
      invite_email VARCHAR(255) NOT NULL,
      status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
      invited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_notebook_id (notebook_id),
      INDEX idx_invite_email (invite_email),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  
  const statements = sql.split(';').filter(s => s.trim());
  for (const stmt of statements) {
    await conn.execute(stmt);
  }
}

export async function initDB() {
  try {
    pool = mysql.createPool(DB_CONFIG);
    const conn = await pool.getConnection();
    await initTables(conn);
    conn.release();
    console.log('✅ MySQL数据库连接成功，表已初始化');
    useMemoryStore = false;
  } catch (err) {
    console.log('⚠️  MySQL连接失败，使用内存存储模式:', (err as Error).message);
    console.log('💡 提示: 如需使用MySQL，请确保服务已启动并配置正确的连接参数');
    useMemoryStore = true;
  }
}

function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function encryptContent(content: PageContent, key: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
  const contentStr = JSON.stringify(content);
  let encrypted = cipher.update(contentStr, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decryptContent(encryptedContent: string, key: string): PageContent {
  const parts = encryptedContent.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

export async function createUser(username: string, email: string, password: string): Promise<User> {
  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);
  const createdAt = new Date();

  if (useMemoryStore) {
    if (memoryStore.usersByEmail.has(email) || memoryStore.usersByUsername.has(username)) {
      throw new Error('用户名或邮箱已存在');
    }
    const user: User = { id, username, email, passwordHash, createdAt };
    memoryStore.users.set(id, user);
    memoryStore.usersByEmail.set(email, id);
    memoryStore.usersByUsername.set(username, id);
    return user;
  }

  const conn = await pool!.getConnection();
  try {
    await conn.execute(
      'INSERT INTO users (id, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, username, email, passwordHash, createdAt]
    );
    return { id, username, email, passwordHash, createdAt };
  } finally {
    conn.release();
  }
}

export async function findUserByEmail(email: string): Promise<User | null> {
  if (useMemoryStore) {
    const userId = memoryStore.usersByEmail.get(email);
    return userId ? memoryStore.users.get(userId) || null : null;
  }

  const conn = await pool!.getConnection();
  try {
    const [rows] = await conn.execute('SELECT * FROM users WHERE email = ?', [email]) as any[];
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      passwordHash: row.password_hash,
      createdAt: new Date(row.created_at)
    };
  } finally {
    conn.release();
  }
}

export async function verifyPassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

export async function createNotebook(userId: string, title: string = '我的手账', isShared: boolean = false): Promise<Notebook> {
  const id = uuidv4();
  const now = new Date();

  if (useMemoryStore) {
    const notebook: Notebook = { id, userId, title, isShared, createdAt: now, updatedAt: now };
    memoryStore.notebooks.set(id, notebook);
    return notebook;
  }

  const conn = await pool!.getConnection();
  try {
    await conn.execute(
      'INSERT INTO notebooks (id, user_id, title, is_shared, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, userId, title, isShared, now, now]
    );
    return { id, userId, title, isShared, createdAt: now, updatedAt: now };
  } finally {
    conn.release();
  }
}

export async function getNotebooksByUser(userId: string): Promise<Notebook[]> {
  if (useMemoryStore) {
    return Array.from(memoryStore.notebooks.values()).filter(n => n.userId === userId);
  }

  const conn = await pool!.getConnection();
  try {
    const [rows] = await conn.execute('SELECT * FROM notebooks WHERE user_id = ?', [userId]) as any[];
    return rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      isShared: !!row.is_shared,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  } finally {
    conn.release();
  }
}

export async function createCapsule(
  userId: string,
  notebookId: string,
  title: string,
  content: PageContent,
  openDate: Date,
  isShared: boolean = false,
  sharedWith: string[] = []
): Promise<Capsule> {
  const id = uuidv4();
  const encryptionKey = generateEncryptionKey();
  const encryptedContent = encryptContent(content, encryptionKey);
  const sealedAt = new Date();

  if (useMemoryStore) {
    const capsule: Capsule = {
      id, userId, notebookId, title, encryptedContent, encryptionKey,
      openDate, sealedAt, isOpened: false, isShared, sharedWith
    };
    memoryStore.capsules.set(id, capsule);
    return capsule;
  }

  const conn = await pool!.getConnection();
  try {
    await conn.execute(
      `INSERT INTO capsules (id, user_id, notebook_id, title, encrypted_content, encryption_key, 
        open_date, sealed_at, is_opened, is_shared) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, notebookId, title, encryptedContent, encryptionKey,
       openDate, sealedAt, false, isShared]
    );
    return {
      id, userId, notebookId, title, encryptedContent, encryptionKey,
      openDate, sealedAt, isOpened: false, isShared, sharedWith
    };
  } finally {
    conn.release();
  }
}

export async function getCapsulesByUser(userId: string): Promise<Capsule[]> {
  if (useMemoryStore) {
    return Array.from(memoryStore.capsules.values())
      .filter(c => c.userId === userId || c.sharedWith.includes(userId))
      .map(c => ({ ...c, encryptionKey: '********' }));
  }

  const conn = await pool!.getConnection();
  try {
    const [rows] = await conn.execute(
      'SELECT * FROM capsules WHERE user_id = ?',
      [userId]
    ) as any[];
    return rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      notebookId: row.notebook_id,
      title: row.title,
      encryptedContent: row.encrypted_content,
      encryptionKey: '********',
      openDate: new Date(row.open_date),
      sealedAt: new Date(row.sealed_at),
      isOpened: !!row.is_opened,
      isShared: !!row.is_shared,
      sharedWith: []
    }));
  } finally {
    conn.release();
  }
}

export async function getCapsuleById(capsuleId: string): Promise<Capsule | null> {
  if (useMemoryStore) {
    const capsule = memoryStore.capsules.get(capsuleId);
    return capsule || null;
  }

  const conn = await pool!.getConnection();
  try {
    const [rows] = await conn.execute('SELECT * FROM capsules WHERE id = ?', [capsuleId]) as any[];
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      notebookId: row.notebook_id,
      title: row.title,
      encryptedContent: row.encrypted_content,
      encryptionKey: row.encryption_key,
      openDate: new Date(row.open_date),
      sealedAt: new Date(row.sealed_at),
      isOpened: !!row.is_opened,
      isShared: !!row.is_shared,
      sharedWith: []
    };
  } finally {
    conn.release();
  }
}

export async function openCapsule(capsuleId: string, userId: string): Promise<{ content: PageContent; capsule: Capsule } | null> {
  const capsule = await getCapsuleById(capsuleId);
  if (!capsule) return null;
  if (capsule.userId !== userId && !capsule.sharedWith.includes(userId)) return null;
  
  const now = new Date();
  if (now < capsule.openDate) {
    return null;
  }

  const content = decryptContent(capsule.encryptedContent, capsule.encryptionKey);

  if (!useMemoryStore) {
    const conn = await pool!.getConnection();
    try {
      await conn.execute('UPDATE capsules SET is_opened = TRUE WHERE id = ?', [capsuleId]);
    } finally {
      conn.release();
    }
  } else {
    const updatedCapsule = memoryStore.capsules.get(capsuleId);
    if (updatedCapsule) {
      updatedCapsule.isOpened = true;
    }
  }

  capsule.isOpened = true;
  return { content, capsule };
}

export async function inviteCollaborator(
  notebookId: string,
  inviteEmail: string
): Promise<Collaborator> {
  const id = uuidv4();
  const invitedAt = new Date();

  if (useMemoryStore) {
    const collaborator: Collaborator = {
      id, notebookId, userId: null, inviteEmail, status: 'pending', invitedAt
    };
    memoryStore.collaborators.set(id, collaborator);
    return collaborator;
  }

  const conn = await pool!.getConnection();
  try {
    await conn.execute(
      `INSERT INTO notebook_collaborators (id, notebook_id, invite_email, status, invited_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [id, notebookId, inviteEmail, 'pending', invitedAt]
    );
    return { id, notebookId, userId: null, inviteEmail, status: 'pending', invitedAt };
  } finally {
    conn.release();
  }
}
