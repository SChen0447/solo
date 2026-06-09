export type PersonStatus = 'susceptible' | 'infected' | 'recovered' | 'vaccinated';

export interface Person {
  id: number;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  status: PersonStatus;
  infectionDay: number;
  recoveryDay: number;
}

export interface ControlParams {
  lockdown: boolean;
  vaccine: boolean;
  maskRate: number;
  socialDistance: boolean;
}

export interface Stats {
  susceptible: number;
  infected: number;
  recovered: number;
  vaccinated: number;
  totalInfected: number;
  totalRecovered: number;
}

export interface SIRDataPoint {
  day: number;
  susceptible: number;
  infected: number;
  recovered: number;
}

const BASE_INFECTION_RATE = 0.08;
const GRID_SIZE_DEFAULT = 40;
const GRID_SIZE_SMALL = 30;
const PERSON_COUNT = 500;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getGridSize(screenWidth: number): number {
  return screenWidth < 900 ? GRID_SIZE_SMALL : GRID_SIZE_DEFAULT;
}

export function createPerson(id: number, gridSize: number): Person {
  const x = randInt(0, gridSize - 1);
  const y = randInt(0, gridSize - 1);
  return {
    id,
    x,
    y,
    homeX: x,
    homeY: y,
    status: 'susceptible',
    infectionDay: -1,
    recoveryDay: -1
  };
}

export function initializePopulation(gridSize: number): Person[] {
  const people: Person[] = [];
  for (let i = 0; i < PERSON_COUNT; i++) {
    people.push(createPerson(i, gridSize));
  }
  const infectedIndex = randInt(0, PERSON_COUNT - 1);
  people[infectedIndex].status = 'infected';
  people[infectedIndex].infectionDay = 0;
  people[infectedIndex].recoveryDay = randInt(5, 8);
  return people;
}

export function movePerson(person: Person, gridSize: number, lockdown: boolean): void {
  if (lockdown) {
    person.x = person.homeX;
    person.y = person.homeY;
    return;
  }
  const dx = randInt(-1, 1);
  const dy = randInt(-1, 1);
  person.x = Math.max(0, Math.min(gridSize - 1, person.x + dx));
  person.y = Math.max(0, Math.min(gridSize - 1, person.y + dy));
}

function manhattanDistance(p1: Person, p2: Person): number {
  return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
}

export function updateDay(
  people: Person[],
  gridSize: number,
  currentDay: number,
  params: ControlParams
): Stats {
  const infectedList = people.filter(p => p.status === 'infected');
  const susceptibleList = people.filter(p => p.status === 'susceptible');

  for (const person of people) {
    movePerson(person, gridSize, params.lockdown);
  }

  const infectionDistance = params.socialDistance ? 1 : 2;
  const effectiveRate = BASE_INFECTION_RATE * (params.maskRate / BASE_INFECTION_RATE);

  const newInfections: Person[] = [];
  for (const infected of infectedList) {
    for (const susceptible of susceptibleList) {
      if (newInfections.includes(susceptible)) continue;
      const dist = manhattanDistance(infected, susceptible);
      if (dist <= infectionDistance) {
        if (Math.random() < effectiveRate) {
          newInfections.push(susceptible);
        }
      }
    }
  }

  for (const p of newInfections) {
    p.status = 'infected';
    p.infectionDay = currentDay;
    p.recoveryDay = currentDay + randInt(5, 8);
  }

  let newRecovered = 0;
  for (const person of people) {
    if (person.status === 'infected' && currentDay >= person.recoveryDay) {
      person.status = 'recovered';
      newRecovered++;
    }
  }

  if (params.vaccine) {
    const vaccineCount = randInt(1, 5);
    const candidates = people.filter(p => p.status === 'susceptible');
    for (let i = 0; i < vaccineCount && candidates.length > 0; i++) {
      const idx = randInt(0, candidates.length - 1);
      candidates[idx].status = 'vaccinated';
      candidates.splice(idx, 1);
    }
  }

  return computeStats(people);
}

export function computeStats(people: Person[]): Stats {
  let susceptible = 0;
  let infected = 0;
  let recovered = 0;
  let vaccinated = 0;
  let totalInfected = 0;
  let totalRecovered = 0;

  for (const p of people) {
    switch (p.status) {
      case 'susceptible':
        susceptible++;
        break;
      case 'infected':
        infected++;
        totalInfected++;
        break;
      case 'recovered':
        recovered++;
        totalInfected++;
        totalRecovered++;
        break;
      case 'vaccinated':
        vaccinated++;
        break;
    }
  }

  return { susceptible, infected, recovered, vaccinated, totalInfected, totalRecovered };
}

export function findPersonAt(people: Person[], gridX: number, gridY: number): Person | null {
  for (const p of people) {
    if (p.x === gridX && p.y === gridY) {
      return p;
    }
  }
  return null;
}

export function getStatusLabel(status: PersonStatus): string {
  switch (status) {
    case 'susceptible': return '易感';
    case 'infected': return '感染';
    case 'recovered': return '康复';
    case 'vaccinated': return '免疫';
  }
}
