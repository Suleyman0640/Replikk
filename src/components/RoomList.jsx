import React from 'react';

function RoomList({
  channels,
  currentTextChannelId,
  onSelectTextChannel,
  isVoiceActive,
  onJoinVoice,
  onLeaveVoice,
  voiceChannelUsers
}) {
  const textChannels = channels.filter((c) => c.type === 'text');
  const voiceChannels = channels.filter((c) => c.type === 'voice');

  return (
    <div className="room-list">
      <div className="room-section">
        <div className="room-section-title">Metin</div>
        <ul className="room-items">
          {textChannels.map((ch) => (
            <li
              key={ch.id}
              className={`room-item ${currentTextChannelId === ch.id ? 'active' : ''}`}
              onClick={() => onSelectTextChannel(ch.id)}
            >
              {ch.name}
            </li>
          ))}
        </ul>
      </div>
      <div className="room-section">
        <div className="room-section-title">Ses</div>
        {voiceChannels.map((ch) => (
          <div key={ch.id} className="voice-channel">
            <div className="voice-channel-header">
              <span>{ch.name}</span>
              {!isVoiceActive && (
                <button
                  type="button"
                  className="voice-button"
                  onClick={onJoinVoice}
                >
                  Katıl
                </button>
              )}
              {isVoiceActive && (
                <button
                  type="button"
                  className="voice-button leave"
                  onClick={onLeaveVoice}
                >
                  Ayrıl
                </button>
              )}
            </div>
            <ul className="voice-users">
              {voiceChannelUsers.map((u) => (
                <li key={u.socketId} className="voice-user">
                  🎤 {u.userName}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RoomList;


