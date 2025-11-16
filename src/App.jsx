import React, { useState } from 'react';
import UserLogin from './components/UserLogin';
import LobbySelection from './components/LobbySelection';
import LobbyMain from './components/LobbyMain';

function App() {
  const [userName, setUserName] = useState('');
  const [hasLoggedIn, setHasLoggedIn] = useState(false);
  const [currentLobby, setCurrentLobby] = useState(null);

  return (
    <div className="app-root">
      {!hasLoggedIn && (
        <UserLogin
          userName={userName}
          onChangeUserName={setUserName}
          onSubmit={() => {
            if (userName.trim().length > 0) {
              setHasLoggedIn(true);
            }
          }}
        />
      )}
      {hasLoggedIn && !currentLobby && (
        <LobbySelection
          userName={userName}
          onLobbyJoined={(lobby) => {
            setCurrentLobby(lobby);
          }}
        />
      )}
      {hasLoggedIn && currentLobby && (
        <LobbyMain
          userName={userName}
          lobby={currentLobby}
          onLeaveLobby={() => {
            setCurrentLobby(null);
          }}
        />
      )}
    </div>
  );
}

export default App;


