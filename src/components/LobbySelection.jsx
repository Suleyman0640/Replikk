import React, { useState } from 'react';
import { useSocket } from '../socket/SocketContext';

function LobbySelection({ userName, onLobbyJoined }) {
  const socket = useSocket();
  const [createName, setCreateName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateLobby = () => {
    if (!socket) return;
    setError('');
    setLoading(true);
    socket.emit(
      'createLobby',
      { lobbyName: createName || 'Yeni Lobi', userName },
      (response) => {
        setLoading(false);
        if (response && response.ok) {
          onLobbyJoined(response.lobby);
        } else {
          setError(response?.error || 'Lobi oluşturulamadı');
        }
      }
    );
  };

  const handleJoinLobby = () => {
    if (!socket) return;
    if (!joinCode.trim()) {
      setError('Lobi kodu giriniz');
      return;
    }
    setError('');
    setLoading(true);
    socket.emit(
      'joinLobbyByCode',
      { inviteCode: joinCode.trim(), userName },
      (response) => {
        setLoading(false);
        if (response && response.ok) {
          onLobbyJoined(response.lobby);
        } else {
          setError(response?.error || 'Lobiye katılınamadı');
        }
      }
    );
  };

  return (
    <div className="full-screen-center">
      <div className="lobby-selection-container">
        <div className="top-bar">
          <div className="top-bar-title">Replikk</div>
          <button type="button" className="top-bar-button">
            Ayarlar
          </button>
        </div>
        <div className="lobby-panels">
          <div className="panel">
            <div className="panel-title">Lobi Kur</div>
            <input
              className="text-input"
              type="text"
              placeholder="Lobi adı"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
            />
            <button
              className="primary-button"
              type="button"
              onClick={handleCreateLobby}
              disabled={loading}
            >
              Oluştur
            </button>
          </div>
          <div className="panel">
            <div className="panel-title">Lobiye Katıl</div>
            <input
              className="text-input"
              type="text"
              placeholder="Davet kodu gir"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
            />
            <button
              className="secondary-button"
              type="button"
              onClick={handleJoinLobby}
              disabled={loading}
            >
              Katıl
            </button>
          </div>
        </div>
        {error && <div className="error-text">{error}</div>}
      </div>
    </div>
  );
}

export default LobbySelection;


