import React, { useEffect, useState } from 'react';
import { useSocket } from '../socket/SocketContext';
import RoomList from './RoomList';
import useVoiceChannel from '../voice/useVoiceChannel';

function LobbyMain({ userName, lobby, onLeaveLobby }) {
  const socket = useSocket();
  const [currentTextChannelId, setCurrentTextChannelId] = useState('text-sohbet');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [members, setMembers] = useState(lobby.members || []);
  const [voiceMembers, setVoiceMembers] = useState(
    lobby.voiceChannelMembers || { 'voice-genel': [] }
  );

  const {
    isVoiceActive,
    joinVoice,
    leaveVoice,
    localStreamError
  } = useVoiceChannel({
    lobbyId: lobby.id,
    channelId: 'voice-genel',
    userName
  });

  useEffect(() => {
    if (!socket) return;

    const handleLobbyUserJoined = (payload) => {
      setMembers((prev) => [...prev, payload]);
    };

    const handleLobbyUserLeft = (payload) => {
      setMembers((prev) => prev.filter((m) => m.socketId !== payload.socketId));
    };

    const handleUserJoinedVoice = (payload) => {
      setVoiceMembers((prev) => {
        const channelId = payload.channelId;
        const prevChannelUsers = prev[channelId] || [];
        if (prevChannelUsers.find((u) => u.socketId === payload.socketId)) {
          return prev;
        }
        return {
          ...prev,
          [channelId]: [...prevChannelUsers, { socketId: payload.socketId, userName: payload.userName }]
        };
      });
    };

    const handleUserLeftVoice = (payload) => {
      setVoiceMembers((prev) => {
        const channelId = payload.channelId;
        const prevChannelUsers = prev[channelId] || [];
        return {
          ...prev,
          [channelId]: prevChannelUsers.filter((u) => u.socketId !== payload.socketId)
        };
      });
    };

    const handleVoiceExistingUsers = (payload) => {
      setVoiceMembers((prev) => ({
        ...prev,
        [payload.channelId]: payload.users
      }));
    };

    socket.on('lobbyUserJoined', handleLobbyUserJoined);
    socket.on('lobbyUserLeft', handleLobbyUserLeft);
    socket.on('userJoinedVoice', handleUserJoinedVoice);
    socket.on('userLeftVoice', handleUserLeftVoice);
    socket.on('voiceExistingUsers', handleVoiceExistingUsers);

    return () => {
      socket.off('lobbyUserJoined', handleLobbyUserJoined);
      socket.off('lobbyUserLeft', handleLobbyUserLeft);
      socket.off('userJoinedVoice', handleUserJoinedVoice);
      socket.off('userLeftVoice', handleUserLeftVoice);
      socket.off('voiceExistingUsers', handleVoiceExistingUsers);
    };
  }, [socket]);

  const handleJoinVoiceClick = async () => {
    await joinVoice();
  };

  const handleLeaveVoiceClick = async () => {
    await leaveVoice();
  };

  const voiceChannelUsers = voiceMembers['voice-genel'] || [];

  return (
    <div className="lobby-main">
      <div className="top-bar">
        <div className="top-bar-title">
          Replikk | Lobi: {lobby.name}{' '}
          <span className="invite-code">(Kod: {lobby.inviteCode})</span>
        </div>
        <button type="button" className="top-bar-button" onClick={onLeaveLobby}>
          Lobi&apos;den Çık
        </button>
      </div>
      <div className="lobby-content">
        <div className="sidebar">
          <RoomList
            channels={lobby.channels}
            currentTextChannelId={currentTextChannelId}
            onSelectTextChannel={setCurrentTextChannelId}
            isVoiceActive={isVoiceActive}
            onJoinVoice={handleJoinVoiceClick}
            onLeaveVoice={handleLeaveVoiceClick}
            voiceChannelUsers={voiceChannelUsers}
          />
        </div>
        <div className="chat-area">
          <div className="chat-header">
            {lobby.channels.find((c) => c.id === currentTextChannelId)?.name || '# Kanal'}
          </div>
          <div className="chat-messages">
            {messages.map((m) => (
              <div key={m.id} className="chat-message">
                <span className="chat-message-user">{m.userName}:</span> {m.text}
              </div>
            ))}
          </div>
          <div className="chat-input-row">
            <input
              className="text-input"
              type="text"
              placeholder="Mesaj yaz..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
            />
            <button className="primary-button" type="button">
              Gönder
            </button>
          </div>
          {localStreamError && (
            <div className="error-text small">Mikrofona erişilemedi: {localStreamError}</div>
          )}
        </div>
        <div className="participants-area">
          <div className="participants-header">Katılımcılar</div>
          <div className="participants-section-title">
            ÇEVRİMİÇİ ({members.length})
          </div>
          <ul className="participants-list">
            {members.map((m) => (
              <li key={m.socketId}>{m.userName}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default LobbyMain;


