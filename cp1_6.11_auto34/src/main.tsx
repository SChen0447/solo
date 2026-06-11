import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppContextProvider, useAppContext } from './store';
import { connect, disconnect, sendAction } from './websocket';
import App from './App';

function Root() {
  const { state, dispatch } = useAppContext();

  React.useEffect(() => {
    const loading = document.getElementById('loading-screen');

    connect(
      (action) => {
        dispatch(action);
      },
      () => {
        dispatch({ type: 'SET_CONNECTED', payload: { connected: true } });
        if (loading) {
          loading.classList.add('fade-out');
          setTimeout(() => loading.remove(), 500);
        }
      },
      () => {
        dispatch({ type: 'SET_CONNECTED', payload: { connected: false } });
      }
    );

    return () => {
      disconnect();
    };
  }, []);

  const originalDispatch = dispatch;
  const syncDispatch = React.useCallback(
    (action: any) => {
      originalDispatch(action);
      const syncTypes = ['ADD_NODE', 'MOVE_NODE', 'UPDATE_NODE_TEXT', 'DELETE_NODE', 'UPDATE_NODE_STYLE'];
      if (syncTypes.includes(action.type)) {
        sendAction(action);
      }
    },
    [originalDispatch]
  );

  return <App dispatch={syncDispatch} />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppContextProvider>
      <Root />
    </AppContextProvider>
  </React.StrictMode>
);
