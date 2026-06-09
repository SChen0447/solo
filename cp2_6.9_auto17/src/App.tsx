import React, { useState, useEffect, useCallback } from 'react';
import Room from './components/Room';
import Player from './components/Player';
import {
  User,
  Song,
  Reaction,
  getSocket,
  disconnectSocket,
  SOCKET_EVENTS,
  joinRoom,
  addSong,
  removeSong,
  playNext,
  playPause,
  setVolume as emitSetVolume,
  sendReaction,
  songEnded
} from './socket';

const App: React.FC = () => {
  const [nickname, setNickname] = useState('');
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [floatingReactions, setFloatingReactions] = useState<Array<{ id: number; reaction: string; left: number; top: number }>([]);
  const [yourId, setYourId] = useState('');
  const [hasReacted, setHasReacted] = useState(false);
  const reactionIdRef = React.useRef(0);

  const handleJoin = useCallback((nick: string, room: string) => {
    setNickname(nick);
    setCurrentRoomId(room);
    setJoined(true);
    joinRoom(room, nick);
  }, []);

  const handleLeave = useCallback(() => {
    setJoined(false);
    setNickname('');
    setRoomId('');
    setCurrentRoomId('');
    setUsers([]);
    setQueue([]);
    setCurrentSong(null);
    setIsPlaying(false);
    setFloatingReactions([]);
    setYourId('');
    setHasReacted(false);
    disconnectSocket();
  }, []);

  useEffect(() => {
    if (!joined) return;

    const socket = getSocket();

    const onRoomState = (state: {
      users: User[];
      queue: Song[];
      currentSong: Song | null;
      isPlaying: boolean;
      volume: number;
      yourId: string;
    }) => {
      setUsers(state.users);
      setQueue(state.queue);
      setCurrentSong(state.currentSong);
      setIsPlaying(state.isPlaying);
      setVolume(state.volume);
      setYourId(state.yourId);
      setHasReacted(false);
    };

    const onUserJoined = (user: User) => {
      setUsers(prev => [...prev, user]);
    };

    const onUserLeft = (data: { id: string }) => {
      setUsers(prev => prev.filter(u => u.id !== data.id));
    };

    const onQueueUpdated = (newQueue: Song[]) => {
      setQueue(newQueue);
    };

    const onSongChanged = (data: {
      currentSong: Song | null;
      queue: Song[];
      isPlaying?: boolean;
      currentTime?: number;
    }) => {
      setCurrentSong(data.currentSong);
      setQueue(data.queue);
      if (data.isPlaying !== undefined) {
        setIsPlaying(data.isPlaying);
      }
      setHasReacted(false);
    };

    const onPlayPauseUpdated = (data: { isPlaying: boolean }) => {
      setIsPlaying(data.isPlaying);
    };

    const onVolumeUpdated = (data: { volume: number }) => {
      setVolume(data.volume);
    };

    const onReactionReceived = (reaction: Reaction) => {
      const id = ++reactionIdRef.current;
      const left = 10 + Math.random() * 80;
      const top = 50 + Math.random() * 30;
      setFloatingReactions(prev => [...prev, { id, reaction: reaction.reaction, left, top }]);
      setTimeout(() => {
        setFloatingReactions(prev => prev.filter(r => r.id !== id));
      }, 3000);
    };

    socket.on(SOCKET_EVENTS.ROOM_STATE, onRoomState);
    socket.on(SOCKET_EVENTS.USER_JOINED, onUserJoined);
    socket.on(SOCKET_EVENTS.USER_LEFT, onUserLeft);
    socket.on(SOCKET_EVENTS.QUEUE_UPDATED, onQueueUpdated);
    socket.on(SOCKET_EVENTS.SONG_CHANGED, onSongChanged);
    socket.on(SOCKET_EVENTS.PLAY_PAUSE_UPDATED, onPlayPauseUpdated);
    socket.on(SOCKET_EVENTS.VOLUME_UPDATED, onVolumeUpdated);
    socket.on(SOCKET_EVENTS.REACTION_RECEIVED, onReactionReceived);

    return () => {
      socket.off(SOCKET_EVENTS.ROOM_STATE, onRoomState);
      socket.off(SOCKET_EVENTS.USER_JOINED, onUserJoined);
      socket.off(SOCKET_EVENTS.USER_LEFT, onUserLeft);
      socket.off(SOCKET_EVENTS.QUEUE_UPDATED, onQueueUpdated);
      socket.off(SOCKET_EVENTS.SONG_CHANGED, onSongChanged);
      socket.off(SOCKET_EVENTS.PLAY_PAUSE_UPDATED, onPlayPauseUpdated);
      socket.off(SOCKET_EVENTS.VOLUME_UPDATED, onVolumeUpdated);
      socket.off(SOCKET_EVENTS.REACTION_RECEIVED, onReactionReceived);
    };
  }, [joined]);

  const handleAddSong = useCallback((song: Omit<Song, 'id'>) => {
    addSong(song);
  }, []);

  const handleRemoveSong = useCallback((songId: string) => {
    removeSong(songId);
  }, []);

  const handlePlayNext = useCallback(() => {
    playNext();
  }, []);

  const handlePlayPause = useCallback((playing: boolean) => {
    setIsPlaying(playing);
    playPause(playing);
  }, []);

  const handleSetVolume = useCallback((vol: number) => {
    setVolume(vol);
    emitSetVolume(vol);
  }, []);

  const handleSendReaction = useCallback((reaction: string) => {
    if (hasReacted) return;
    setHasReacted(true);
    sendReaction(reaction);
  }, [hasReacted]);

  const handleSongEnded = useCallback(() => {
    songEnded();
  }, []);

  if (!joined) {
    return (
      <div className="app">
        <Room onJoin={handleJoin} />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>房间: {currentRoomId}</h1>
        <span className="online-count">👥 {users.length} 人在线</span>
      </header>
      <main className="app-main">
        <Player
          users={users}
          queue={queue}
          currentSong={currentSong}
          isPlaying={isPlaying}
          volume={volume}
          nickname={nickname}
          yourId={yourId}
          hasReacted={hasReacted}
          floatingReactions={floatingReactions}
          onAddSong={handleAddSong}
          onRemoveSong={handleRemoveSong}
          onPlayNext={handlePlayNext}
          onPlayPause={handlePlayPause}
          onSetVolume={handleSetVolume}
          onSendReaction={handleSendReaction}
          onSongEnded={handleSongEnded}
          onLeave={handleLeave}
        />
      </main>
    </div>
  );
};

export default App;
