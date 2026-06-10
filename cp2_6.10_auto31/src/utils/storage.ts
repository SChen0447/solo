import type { Album } from '../types';

const ALBUMS_KEY = 'soundwave_albums';
const VOTES_KEY = 'soundwave_votes';

export function saveAlbums(albums: Album[]): void {
  try {
    const data = JSON.stringify(albums);
    localStorage.setItem(ALBUMS_KEY, data);
    window.dispatchEvent(new StorageEvent('storage', {
      key: ALBUMS_KEY,
      newValue: data,
      storageArea: localStorage
    }));
  } catch (e) {
    console.error('Failed to save albums:', e);
  }
}

export function loadAlbums(): Album[] | null {
  try {
    const data = localStorage.getItem(ALBUMS_KEY);
    if (!data) return null;
    return JSON.parse(data) as Album[];
  } catch (e) {
    console.error('Failed to load albums:', e);
    return null;
  }
}

export function saveVotes(albums: Album[]): void {
  try {
    const votesData = albums.map(a => ({ albumId: a.id, votes: a.votes }));
    const data = JSON.stringify(votesData);
    localStorage.setItem(VOTES_KEY, data);
    window.dispatchEvent(new StorageEvent('storage', {
      key: VOTES_KEY,
      newValue: data,
      storageArea: localStorage
    }));
  } catch (e) {
    console.error('Failed to save votes:', e);
  }
}

export function loadVotes(): { albumId: string; votes: Album['votes'] }[] | null {
  try {
    const data = localStorage.getItem(VOTES_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to load votes:', e);
    return null;
  }
}

export function clearStorage(): void {
  localStorage.removeItem(ALBUMS_KEY);
  localStorage.removeItem(VOTES_KEY);
}
