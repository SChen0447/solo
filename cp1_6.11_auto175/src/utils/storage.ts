import { Butterfly, PedigreeRecord, PlacedPlant } from '../types';

const STORAGE_KEYS = {
  BUTTERFLIES: 'butterfly_garden_captured',
  PEDIGREE: 'butterfly_garden_pedigree',
  PLANTS: 'butterfly_garden_plants',
  STATS: 'butterfly_garden_stats'
};

const SAVE_INTERVAL = 5 * 60 * 1000;
let lastSaveTime = 0;
let pendingSave: boolean = false;

export const loadCapturedButterflies = (): Butterfly[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.BUTTERFLIES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveCapturedButterflies = (butterflies: Butterfly[], force: boolean = false): void => {
  const now = Date.now();
  if (!force && now - lastSaveTime < SAVE_INTERVAL) {
    pendingSave = true;
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEYS.BUTTERFLIES, JSON.stringify(butterflies));
    lastSaveTime = now;
    pendingSave = false;
  } catch (e) {
    console.error('Failed to save butterflies:', e);
  }
};

export const loadPedigreeRecords = (): PedigreeRecord[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PEDIGREE);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const savePedigreeRecords = (records: PedigreeRecord[], force: boolean = false): void => {
  const now = Date.now();
  if (!force && now - lastSaveTime < SAVE_INTERVAL) {
    return;
  }
  try {
    const limitedRecords = records.slice(-100);
    localStorage.setItem(STORAGE_KEYS.PEDIGREE, JSON.stringify(limitedRecords));
    if (force) lastSaveTime = now;
  } catch (e) {
    console.error('Failed to save pedigree:', e);
  }
};

export const loadPlants = (): PlacedPlant[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PLANTS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const savePlants = (plants: PlacedPlant[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.PLANTS, JSON.stringify(plants));
  } catch (e) {
    console.error('Failed to save plants:', e);
  }
};

export const addPedigreeRecord = (butterfly: Butterfly, existingRecords: PedigreeRecord[]): PedigreeRecord[] => {
  const record: PedigreeRecord = {
    butterflyId: butterfly.id,
    speciesName: butterfly.speciesName,
    parentIds: [...butterfly.parentIds],
    childCount: butterfly.childIds.length,
    lastActiveAt: butterfly.lastActiveAt,
    createdAt: butterfly.createdAt
  };
  return [...existingRecords, record];
};

export const updatePedigreeChildCount = (
  parentId: string,
  records: PedigreeRecord[]
): PedigreeRecord[] => {
  return records.map(r =>
    r.butterflyId === parentId
      ? { ...r, childCount: r.childCount + 1, lastActiveAt: Date.now() }
      : r
  );
};

export const forceSaveAll = (
  butterflies: Butterfly[],
  records: PedigreeRecord[]
): void => {
  saveCapturedButterflies(butterflies, true);
  savePedigreeRecords(records, true);
};

export const flushPendingSave = (
  butterflies: Butterfly[],
  records: PedigreeRecord[]
): void => {
  if (pendingSave) {
    forceSaveAll(butterflies, records);
  }
};
