import { v4 as uuidv4 } from 'uuid';
import type { LetterData, UserData, StampData } from '../client/types';
import { STAMP_TEMPLATES } from '../client/types';

class LetterStore {
  private users: Map<string, UserData> = new Map();
  private pendingLetters: LetterData[] = [];
  private userInbox: Map<string, LetterData[]> = new Map();
  private readonly MAX_PENDING_LETTERS = 1000;
  private readonly OFFLINE_TIMEOUT = 24 * 60 * 60 * 1000;

  addUser(userId: string, socketId: string): UserData {
    const existingUser = this.users.get(userId);
    const user: UserData = existingUser || {
      id: userId,
      socketId,
      online: true,
      stamps: [],
      lettersSent: 0,
      lastLogin: Date.now()
    };
    
    user.socketId = socketId;
    user.online = true;
    user.lastLogin = Date.now();
    
    this.users.set(userId, user);
    this.broadcastUserCount();
    return user;
  }

  removeUser(socketId: string): void {
    for (const [userId, user] of this.users) {
      if (user.socketId === socketId) {
        user.online = false;
        user.lastLogin = Date.now();
        break;
      }
    }
    this.broadcastUserCount();
    this.cleanupOfflineUsers();
  }

  getUser(userId: string): UserData | undefined {
    return this.users.get(userId);
  }

  getOnlineUsers(): UserData[] {
    return Array.from(this.users.values()).filter(u => u.online);
  }

  getOnlineUserCount(): number {
    return this.getOnlineUsers().length;
  }

  getRandomRecipient(excludeUserId: string): UserData | null {
    const onlineUsers = this.getOnlineUsers().filter(u => u.id !== excludeUserId);
    if (onlineUsers.length === 0) {
      return null;
    }
    const randomIndex = Math.floor(Math.random() * onlineUsers.length);
    return onlineUsers[randomIndex];
  }

  addLetter(letter: LetterData): { delivered: boolean; recipient?: UserData } {
    const recipient = this.getRandomRecipient(letter.fromUserId);
    
    if (recipient && recipient.online) {
      if (!this.userInbox.has(recipient.id)) {
        this.userInbox.set(recipient.id, []);
      }
      this.userInbox.get(recipient.id)!.push(letter);
      return { delivered: true, recipient };
    } else {
      if (this.pendingLetters.length >= this.MAX_PENDING_LETTERS) {
        this.pendingLetters.shift();
      }
      this.pendingLetters.push(letter);
      return { delivered: false };
    }
  }

  getPendingLettersForUser(userId: string): LetterData[] {
    const letters: LetterData[] = [];
    const remaining: LetterData[] = [];
    
    for (const letter of this.pendingLetters) {
      if (letter.toUserId === userId || (letter.toUserId === '' && Math.random() < 0.3)) {
        letter.toUserId = userId;
        letters.push(letter);
      } else {
        remaining.push(letter);
      }
    }
    
    this.pendingLetters = remaining;
    
    const inbox = this.userInbox.get(userId) || [];
    this.userInbox.set(userId, []);
    
    return [...inbox, ...letters];
  }

  markLetterRead(letterId: string, userId: string): boolean {
    const inbox = this.userInbox.get(userId);
    if (!inbox) return false;
    
    const letter = inbox.find(l => l.id === letterId);
    if (letter) {
      letter.read = true;
      return true;
    }
    return false;
  }

  forwardLetter(letterId: string, fromUserId: string): { delivered: boolean; letter?: LetterData; recipient?: UserData } {
    const inbox = this.userInbox.get(fromUserId);
    if (!inbox) return { delivered: false };
    
    const letterIndex = inbox.findIndex(l => l.id === letterId);
    if (letterIndex === -1) return { delivered: false };
    
    const [letter] = inbox.splice(letterIndex, 1);
    letter.forwardCount += 1;
    letter.fromUserId = fromUserId;
    letter.toUserId = '';
    letter.read = false;
    letter.createdAt = Date.now();
    
    return { ...this.addLetter(letter), letter };
  }

  awardStamp(userId: string): StampData | null {
    const user = this.users.get(userId);
    if (!user) return null;
    
    const availableStamps = STAMP_TEMPLATES.filter(t => !user.stamps.includes(t.type));
    const template = availableStamps.length > 0 
      ? availableStamps[Math.floor(Math.random() * availableStamps.length)]
      : STAMP_TEMPLATES[Math.floor(Math.random() * STAMP_TEMPLATES.length)];
    
    const stamp: StampData = {
      id: uuidv4(),
      ...template
    };
    
    if (!user.stamps.includes(stamp.type)) {
      user.stamps.push(stamp.type);
    }
    
    return stamp;
  }

  incrementLettersSent(userId: string): void {
    const user = this.users.get(userId);
    if (user) {
      user.lettersSent += 1;
      if (user.lettersSent % 3 === 0) {
        this.awardStamp(userId);
      }
    }
  }

  getUserStamps(userId: string): string[] {
    const user = this.users.get(userId);
    return user ? user.stamps : [];
  }

  private cleanupOfflineUsers(): void {
    const now = Date.now();
    for (const [userId, user] of this.users) {
      if (!user.online && now - user.lastLogin > this.OFFLINE_TIMEOUT) {
        this.users.delete(userId);
        this.userInbox.delete(userId);
      }
    }
  }

  private broadcastUserCount(): void {
  }

  getAllSockets(): string[] {
    return Array.from(this.users.values()).filter(u => u.online).map(u => u.socketId);
  }

  getSocketId(userId: string): string | undefined {
    return this.users.get(userId)?.socketId;
  }
}

export const letterStore = new LetterStore();
