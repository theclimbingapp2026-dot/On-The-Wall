
export enum Screen {
  Splash = 'SPLASH',
  Home = 'HOME',
  History = 'HISTORY',
  Log = 'LOG',
  Stats = 'STATS',
  Profile = 'PROFILE',
  Leaderboard = 'LEADERBOARD'
}

export type BoulderSystem = 'V-Scale' | 'Font';
export type RopeSystem = 'YDS' | 'French' | 'UIAA';

export interface Climb {
  id: string;
  name: string;
  grade: string; // Internal storage can be a normalized level or string
  gym: string;
  type: 'Boulder' | 'Top Rope' | 'Lead';
  date: string;
  time: string;
  duration: string;
  status: 'Completed' | 'Failed' | 'Flash';
  imageUrl?: string;
}

export interface UserStats {
  totalAscents: number;
  avgGrade: string;
  sessionTimeMonth: string;
  successRate: number;
  streak: number;
  level: number;
}

// Normalized difficulty mapping (0-15)
export const GRADE_MAPS = {
  boulder: {
    'V-Scale': ['V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15'],
    'Font': ['3', '4', '5', '6A', '6B', '6C', '7A', '7A+', '7B', '7B+', '7C', '8A', '8A+', '8B', '8B+', '8C']
  },
  rope: {
    'YDS': ['5.6', '5.7', '5.8', '5.9', '5.10-', '5.10', '5.10+', '5.11-', '5.11', '5.11+', '5.12-', '5.12', '5.12+', '5.13', '5.14', '5.15'],
    'French': ['4', '5a', '5b', '5c', '6a', '6a+', '6b', '6b+', '6c', '7a', '7a+', '7b', '7c', '8a', '8b', '9a'],
    'UIAA': ['IV', 'V-', 'V', 'V+', 'VI-', 'VI', 'VI+', 'VII-', 'VII', 'VII+', 'VIII-', 'VIII', 'IX', 'X', 'XI', 'XII']
  }
};

export const convertGrade = (grade: string, fromType: 'Boulder' | 'Rope', toSystem: BoulderSystem | RopeSystem): string => {
  const category = fromType === 'Boulder' ? 'boulder' : 'rope';
  const maps = GRADE_MAPS[category];
  
  // Find index in any of the maps for this category
  let index = -1;
  for (const system in maps) {
    const map = (maps as any)[system];
    index = map.indexOf(grade);
    if (index !== -1) break;
  }
  
  if (index === -1) return grade; // Fallback if not found
  return (maps as any)[toSystem][index] || grade;
};
