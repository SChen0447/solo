import type { Note } from './data';

export type PermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export function getPermissionStatus(): PermissionStatus {
  if (typeof Notification === 'undefined') {
    return 'unsupported';
  }
  return Notification.permission as PermissionStatus;
}

export async function requestPermission(): Promise<PermissionStatus> {
  if (typeof Notification === 'undefined') {
    return 'unsupported';
  }
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission as PermissionStatus;
  }
  try {
    const result = await Notification.requestPermission();
    return result as PermissionStatus;
  } catch {
    return 'default';
  }
}

export function sendDesktopNotification(note: Note): Notification | null {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return null;
  }
  try {
    const notification = new Notification(note.title || '未来留言提醒', {
      body: note.content || '您有一条来自过去的留言',
      tag: note.id
    });
    return notification;
  } catch {
    return null;
  }
}
