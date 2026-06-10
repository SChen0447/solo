import { useState, useEffect } from 'react';
import ActivityList from './pages/ActivityList';
import CheckIn from './pages/CheckIn';
import CardExchange from './pages/CardExchange';
import type { Activity, UserCard, CheckInRecord } from './types';
import { loadFromStorage, saveToStorage } from './utils/storage';
import type { PageType } from './types';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('list');
  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null);
  const [currentUser, setCurrentUser] = useState<UserCard | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [checkInRecords, setCheckInRecords] = useState<CheckInRecord[]>([]);

  useEffect(() => {
    setActivities(loadFromStorage('activities', []));
    setCheckInRecords(loadFromStorage('checkInRecords', []));
    setCurrentUser(loadFromStorage('currentUser', null));
  }, []);

  useEffect(() => {
    saveToStorage('activities', activities);
  }, [activities]);

  useEffect(() => {
    saveToStorage('checkInRecords', checkInRecords);
  }, [checkInRecords]);

  useEffect(() => {
    saveToStorage('currentUser', currentUser);
  }, [currentUser]);

  const navigate = (page: PageType, activity?: Activity) => {
    if (activity) setCurrentActivity(activity);
    setCurrentPage(page);
  };

  const addActivity = (activity: Activity) => {
    setActivities([activity, ...activities]);
  };

  const addCheckIn = (record: CheckInRecord) => {
    const exists = checkInRecords.some(
      (r) => r.activityId === record.activityId && r.userId === record.userId
    );
    if (!exists) {
      setCheckInRecords([record, ...checkInRecords]);
    }
  };

  const updateUserContacts = (userId: string, contactId: string) => {
    setCurrentUser((prev) => {
      if (!prev) return prev;
      if (prev.contacts.includes(contactId)) return prev;
      return { ...prev, contacts: [...prev.contacts, contactId] };
    });
  };

  return (
    <div className="app">
      {currentPage === 'list' && (
        <ActivityList
          activities={activities}
          onAddActivity={addActivity}
          onSelectActivity={(activity) => navigate('checkin', activity)}
        />
      )}
      {currentPage === 'checkin' && currentActivity && (
        <CheckIn
          activity={currentActivity}
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          checkInRecords={checkInRecords.filter((r) => r.activityId === currentActivity.id)}
          onAddCheckIn={addCheckIn}
          onGoToExchange={() => setCurrentPage('exchange')}
          onGoBack={() => setCurrentPage('list')}
        />
      )}
      {currentPage === 'exchange' && currentActivity && (
        <CardExchange
          activity={currentActivity}
          currentUser={currentUser}
          checkInRecords={checkInRecords.filter((r) => r.activityId === currentActivity.id)}
          onUpdateContacts={updateUserContacts}
          onGoBack={() => setCurrentPage('checkin')}
        />
      )}
    </div>
  );
}
