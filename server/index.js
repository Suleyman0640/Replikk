const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const allowedOrigin = process.env.CLIENT_ORIGIN || '*';

const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ['GET', 'POST']
  }
});

app.use(
  cors({
    origin: allowedOrigin
  })
);
app.use(express.json());

// In-memory lobby store
const lobbies = new Map(); // lobbyId -> lobby object
const inviteCodeToLobbyId = new Map(); // inviteCode -> lobbyId

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function createLobby({ name, ownerSocketId, ownerName }) {
  const lobbyId = `lobby_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  let inviteCode = generateInviteCode();
  while (inviteCodeToLobbyId.has(inviteCode)) {
    inviteCode = generateInviteCode();
  }

  const lobby = {
    id: lobbyId,
    name,
    inviteCode,
    ownerSocketId,
    createdAt: Date.now(),
    channels: [
      { id: 'text-sohbet', name: '# Sohbet', type: 'text' },
      { id: 'text-oyun', name: '# Oyun', type: 'text' },
      { id: 'voice-genel', name: '🔊 Genel Sohbet', type: 'voice' }
    ],
    members: new Map(), // socketId -> { userName }
    voiceChannelMembers: new Map() // channelId -> Map(socketId -> { userName })
  };

  lobbies.set(lobbyId, lobby);
  inviteCodeToLobbyId.set(inviteCode, lobbyId);

  return lobby;
}

function serializeLobby(lobby) {
  return {
    id: lobby.id,
    name: lobby.name,
    inviteCode: lobby.inviteCode,
    channels: lobby.channels.map((c) => ({ ...c })),
    members: Array.from(lobby.members.entries()).map(([socketId, info]) => ({
      socketId,
      userName: info.userName
    })),
    voiceChannelMembers: Object.fromEntries(
      Array.from(lobby.voiceChannelMembers.entries()).map(([channelId, membersMap]) => [
        channelId,
        Array.from(membersMap.entries()).map(([socketId, info]) => ({
          socketId,
          userName: info.userName
        }))
      ])
    )
  };
}

io.on('connection', (socket) => {
  let currentUserName = null;
  let currentLobbyId = null;

  socket.on('setUserName', ({ userName }) => {
    currentUserName = userName;
  });

  socket.on('createLobby', ({ lobbyName, userName }, callback) => {
    const effectiveUserName = userName || currentUserName || 'Kullanici';
    const lobby = createLobby({
      name: lobbyName || 'Yeni Lobi',
      ownerSocketId: socket.id,
      ownerName: effectiveUserName
    });

    currentLobbyId = lobby.id;
    lobby.members.set(socket.id, { userName: effectiveUserName });

    socket.join(lobby.id);

    const payload = serializeLobby(lobby);
    if (callback) callback({ ok: true, lobby: payload });
    socket.emit('lobbyJoined', payload);
  });

  socket.on('joinLobbyByCode', ({ inviteCode, userName }, callback) => {
    const lobbyId = inviteCodeToLobbyId.get(inviteCode);
    if (!lobbyId) {
      if (callback) callback({ ok: false, error: 'Geçersiz davet kodu' });
      return;
    }

    const lobby = lobbies.get(lobbyId);
    if (!lobby) {
      if (callback) callback({ ok: false, error: 'Lobi bulunamadı' });
      return;
    }

    const effectiveUserName = userName || currentUserName || 'Kullanici';
    currentLobbyId = lobby.id;

    lobby.members.set(socket.id, { userName: effectiveUserName });
    socket.join(lobby.id);

    const payload = serializeLobby(lobby);
    if (callback) callback({ ok: true, lobby: payload });
    socket.emit('lobbyJoined', payload);
    socket.to(lobby.id).emit('lobbyUserJoined', {
      socketId: socket.id,
      userName: effectiveUserName
    });
  });

  socket.on('joinVoiceChannel', ({ lobbyId, channelId, userName }) => {
    const lobby = lobbies.get(lobbyId);
    if (!lobby) return;

    const effectiveUserName =
      userName || (lobby.members.get(socket.id) && lobby.members.get(socket.id).userName) || 'Kullanici';

    let channelMembers = lobby.voiceChannelMembers.get(channelId);
    if (!channelMembers) {
      channelMembers = new Map();
      lobby.voiceChannelMembers.set(channelId, channelMembers);
    }

    channelMembers.set(socket.id, { userName: effectiveUserName });

    // Bilgi: yeni kullaniciya mevcut ses kullanicilarini gönder
    const existingMembers = Array.from(channelMembers.entries())
      .filter(([memberSocketId]) => memberSocketId !== socket.id)
      .map(([memberSocketId, info]) => ({
        socketId: memberSocketId,
        userName: info.userName
      }));

    socket.emit('voiceExistingUsers', {
      lobbyId,
      channelId,
      users: existingMembers
    });

    // Lobideki diger kullanicilara bu kullanicinin ses kanalina katildigini yayinla
    socket.to(lobby.id).emit('userJoinedVoice', {
      lobbyId,
      channelId,
      socketId: socket.id,
      userName: effectiveUserName
    });
  });

  socket.on('leaveVoiceChannel', ({ lobbyId, channelId }) => {
    const lobby = lobbies.get(lobbyId);
    if (!lobby) return;

    const channelMembers = lobby.voiceChannelMembers.get(channelId);
    if (!channelMembers) return;

    if (channelMembers.has(socket.id)) {
      channelMembers.delete(socket.id);
      socket.to(lobby.id).emit('userLeftVoice', {
        lobbyId,
        channelId,
        socketId: socket.id
      });
    }
  });

  // WebRTC signaling
  socket.on('webrtcOffer', ({ targetSocketId, sdp }) => {
    io.to(targetSocketId).emit('webrtcOffer', {
      fromSocketId: socket.id,
      sdp
    });
  });

  socket.on('webrtcAnswer', ({ targetSocketId, sdp }) => {
    io.to(targetSocketId).emit('webrtcAnswer', {
      fromSocketId: socket.id,
      sdp
    });
  });

  socket.on('webrtcIceCandidate', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('webrtcIceCandidate', {
      fromSocketId: socket.id,
      candidate
    });
  });

  socket.on('disconnect', () => {
    if (!currentLobbyId) return;

    const lobby = lobbies.get(currentLobbyId);
    if (!lobby) return;

    // lobiden cikart
    lobby.members.delete(socket.id);

    // ses kanalindan cikart
    lobby.voiceChannelMembers.forEach((channelMembers, channelId) => {
      if (channelMembers.has(socket.id)) {
        channelMembers.delete(socket.id);
        socket.to(lobby.id).emit('userLeftVoice', {
          lobbyId: lobby.id,
          channelId,
          socketId: socket.id
        });
      }
    });

    socket.to(lobby.id).emit('lobbyUserLeft', {
      socketId: socket.id
    });

    // Lobi bosaldiysa hafizadan sil
    if (lobby.members.size === 0) {
      lobbies.delete(lobby.id);
      inviteCodeToLobbyId.delete(lobby.inviteCode);
    }
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Signaling ve lobi sunucusu ${PORT} portunda calisiyor`);
});


