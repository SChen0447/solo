export interface Track {
  name: string;
  duration: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  coverColor: string;
  tracks: Track[];
  releaseYear: number;
}

const generateTracks = (count: number): Track[] => {
  const trackNames = [
    'Midnight Dreams',
    'Electric Pulse',
    'Ocean Waves',
    'Neon Lights',
    'Autumn Rain',
    'Solar Flare',
    'Echo Chamber',
    'Velvet Sky',
    'Crystal Rain',
    'Golden Hour',
  ];
  return Array.from({ length: count }, (_, i) => ({
    name: trackNames[i % trackNames.length],
    duration: `${Math.floor(Math.random() * 3) + 2}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
  }));
};

export const albums: Album[] = [
  {
    id: 'album-1',
    title: 'Cosmic Journey',
    artist: 'Nova Sound',
    coverColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    tracks: generateTracks(8),
    releaseYear: 2023,
  },
  {
    id: 'album-2',
    title: 'Retro Wave',
    artist: 'Synthwave Dreams',
    coverColor: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    tracks: generateTracks(10),
    releaseYear: 2021,
  },
  {
    id: 'album-3',
    title: 'Ocean Depths',
    artist: 'Deep Blue',
    coverColor: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    tracks: generateTracks(7),
    releaseYear: 2022,
  },
  {
    id: 'album-4',
    title: 'Urban Nights',
    artist: 'City Lights',
    coverColor: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    tracks: generateTracks(9),
    releaseYear: 2020,
  },
  {
    id: 'album-5',
    title: 'Forest Echo',
    artist: 'Nature Sounds',
    coverColor: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    tracks: generateTracks(6),
    releaseYear: 2019,
  },
  {
    id: 'album-6',
    title: 'Stellar Dust',
    artist: 'Galaxy Trio',
    coverColor: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    tracks: generateTracks(8),
    releaseYear: 2024,
  },
  {
    id: 'album-7',
    title: 'Neon Pulse',
    artist: 'Cyber Punk',
    coverColor: 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)',
    tracks: generateTracks(11),
    releaseYear: 2023,
  },
  {
    id: 'album-8',
    title: 'Sunset Boulevard',
    artist: 'Golden Hour',
    coverColor: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    tracks: generateTracks(7),
    releaseYear: 2018,
  },
  {
    id: 'album-9',
    title: 'Frozen Dreams',
    artist: 'Arctic Wind',
    coverColor: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
    tracks: generateTracks(9),
    releaseYear: 2022,
  },
  {
    id: 'album-10',
    title: 'Jazz Nights',
    artist: 'Smooth Collective',
    coverColor: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
    tracks: generateTracks(10),
    releaseYear: 2020,
  },
];
