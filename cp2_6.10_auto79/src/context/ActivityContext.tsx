import React, { createContext, useContext, useState, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Activity, Registration, ActivityContextType } from '../types';

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

const sources: Array<'direct' | 'social' | 'email'> = ['direct', 'social', 'email'];

const generateSampleRegistrations = (): Registration[] => {
  const samples: Registration[] = [];
  const count = Math.floor(Math.random() * 15) + 5;
  for (let i = 0; i < count; i++) {
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * 7);
    const hoursAgo = Math.floor(Math.random() * 24);
    const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - hoursAgo * 60 * 60 * 1000);
    samples.push({
      id: uuidv4(),
      name: `用户${i + 1}`,
      email: `user${i + 1}@example.com`,
      count: Math.floor(Math.random() * 3) + 1,
      source: sources[Math.floor(Math.random() * sources.length)],
      registeredAt: date.toISOString(),
    });
  }
  return samples;
};

const generateInitialActivities = (): Activity[] => {
  const today = new Date();
  const futureDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const pastDate = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);
  const ongoingDate = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000);

  return [
    {
      id: uuidv4(),
      name: '前端技术工作坊',
      date: futureDate.toISOString().split('T')[0],
      deadline: new Date(futureDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      capacity: 50,
      description: '探讨最新的前端技术趋势，包括React 19新特性、Vite优化等主题。',
      registrations: generateSampleRegistrations(),
    },
    {
      id: uuidv4(),
      name: '《深入理解计算机系统》读书会',
      date: ongoingDate.toISOString().split('T')[0],
      deadline: new Date(ongoingDate.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      capacity: 30,
      description: '每周一次的读书分享会，本周讨论第三章程序的机器级表示。',
      registrations: generateSampleRegistrations(),
    },
    {
      id: uuidv4(),
      name: '产品设计分享会',
      date: pastDate.toISOString().split('T')[0],
      deadline: new Date(pastDate.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      capacity: 40,
      description: '分享优秀产品设计案例，学习用户体验设计方法论。',
      registrations: generateSampleRegistrations(),
    },
  ];
};

export const ActivityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activities, setActivities] = useState<Activity[]>(generateInitialActivities());

  const addActivity = (activityData: Omit<Activity, 'id' | 'registrations'>) => {
    const newActivity: Activity = {
      ...activityData,
      id: uuidv4(),
      registrations: [],
    };
    setActivities((prev) => [...prev, newActivity]);
  };

  const addRegistration = (
    activityId: string,
    registrationData: Omit<Registration, 'id' | 'registeredAt'>
  ) => {
    setActivities((prev) =>
      prev.map((activity) => {
        if (activity.id === activityId) {
          const newRegistration: Registration = {
            ...registrationData,
            id: uuidv4(),
            registeredAt: new Date().toISOString(),
          };
          return {
            ...activity,
            registrations: [...activity.registrations, newRegistration],
          };
        }
        return activity;
      })
    );
  };

  const resetRegistrations = (activityId: string) => {
    setActivities((prev) =>
      prev.map((activity) => {
        if (activity.id === activityId) {
          return { ...activity, registrations: [] };
        }
        return activity;
      })
    );
  };

  const getActivityById = (id: string) => {
    return activities.find((a) => a.id === id);
  };

  return (
    <ActivityContext.Provider
      value={{ activities, addActivity, addRegistration, resetRegistrations, getActivityById }}
    >
      {children}
    </ActivityContext.Provider>
  );
};

export const useActivities = (): ActivityContextType => {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivities must be used within an ActivityProvider');
  }
  return context;
};
