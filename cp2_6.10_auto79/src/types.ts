export type ActivityStatus = 'upcoming' | 'ongoing' | 'ended';

export interface Registration {
  id: string;
  name: string;
  email: string;
  count: number;
  source: 'direct' | 'social' | 'email';
  registeredAt: string;
}

export interface Activity {
  id: string;
  name: string;
  date: string;
  deadline: string;
  capacity: number;
  description: string;
  registrations: Registration[];
}

export interface ActivityContextType {
  activities: Activity[];
  addActivity: (activity: Omit<Activity, 'id' | 'registrations'>) => void;
  addRegistration: (activityId: string, registration: Omit<Registration, 'id' | 'registeredAt'>) => void;
  resetRegistrations: (activityId: string) => void;
  getActivityById: (id: string) => Activity | undefined;
}
