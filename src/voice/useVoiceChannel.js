import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../socket/SocketContext';

const rtcConfig = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302'
    }
  ]
};

export default function useVoiceChannel({ lobbyId, channelId, userName }) {
  const socket = useSocket();
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [localStreamError, setLocalStreamError] = useState('');

  const localStreamRef = useRef(null);
  const peersRef = useRef(new Map()); // socketId -> RTCPeerConnection
  const remoteAudioElementsRef = useRef(new Map()); // socketId -> HTMLAudioElement

  useEffect(() => {
    if (!socket) return undefined;

    const handleOffer = async ({ fromSocketId, sdp }) => {
      const pc = await getOrCreatePeer(fromSocketId, true);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('webrtcAnswer', { targetSocketId: fromSocketId, sdp: answer });
    };

    const handleAnswer = async ({ fromSocketId, sdp }) => {
      const pc = peersRef.current.get(fromSocketId);
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    };

    const handleIceCandidate = async ({ fromSocketId, candidate }) => {
      const pc = peersRef.current.get(fromSocketId);
      if (!pc || !candidate) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('ICE candidate eklenemedi', err);
      }
    };

    socket.on('webrtcOffer', handleOffer);
    socket.on('webrtcAnswer', handleAnswer);
    socket.on('webrtcIceCandidate', handleIceCandidate);

    return () => {
      socket.off('webrtcOffer', handleOffer);
      socket.off('webrtcAnswer', handleAnswer);
      socket.off('webrtcIceCandidate', handleIceCandidate);
    };
  }, [socket]);

  async function createLocalStream() {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      setLocalStreamError(err.message || 'Mikrofon hatası');
      throw err;
    }
  }

  async function getOrCreatePeer(remoteSocketId, isAnswerer = false) {
    let pc = peersRef.current.get(remoteSocketId);
    if (pc) return pc;

    pc = new RTCPeerConnection(rtcConfig);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtcIceCandidate', {
          targetSocketId: remoteSocketId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      let audioEl = remoteAudioElementsRef.current.get(remoteSocketId);
      if (!audioEl) {
        audioEl = new Audio();
        audioEl.autoplay = true;
        remoteAudioElementsRef.current.set(remoteSocketId, audioEl);
      }
      // eslint-disable-next-line no-param-reassign
      audioEl.srcObject = remoteStream;
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        const audioEl = remoteAudioElementsRef.current.get(remoteSocketId);
        if (audioEl) {
          audioEl.srcObject = null;
          remoteAudioElementsRef.current.delete(remoteSocketId);
        }
        peersRef.current.delete(remoteSocketId);
      }
    };

    peersRef.current.set(remoteSocketId, pc);
    return pc;
  }

  async function joinVoice() {
    if (!socket || isVoiceActive) return;
    const stream = await createLocalStream();

    setIsVoiceActive(true);

    socket.emit('joinVoiceChannel', { lobbyId, channelId, userName });

    // Yeni katilan kullaniciya dogru offer olusturma akisi:
    socket.on('userJoinedVoice', async ({ socketId: newUserId }) => {
      if (!localStreamRef.current) return;
      const pc = await getOrCreatePeer(newUserId, false);
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtcOffer', {
        targetSocketId: newUserId,
        sdp: offer
      });
    });
  }

  async function leaveVoice() {
    if (!socket || !isVoiceActive) return;

    socket.emit('leaveVoiceChannel', { lobbyId, channelId });

    peersRef.current.forEach((pc) => {
      pc.close();
    });
    peersRef.current.clear();

    remoteAudioElementsRef.current.forEach((audioEl) => {
      // eslint-disable-next-line no-param-reassign
      audioEl.srcObject = null;
    });
    remoteAudioElementsRef.current.clear();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    setIsVoiceActive(false);
  }

  useEffect(
    () => () => {
      // cleanup on unmount
      leaveVoice();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return {
    isVoiceActive,
    joinVoice,
    leaveVoice,
    localStreamError
  };
}


