import { socket } from './socket';
import { PRODUCTION_ICE_SERVERS } from './config';

export class WebRTCManager {
  private localStream: MediaStream | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private visualizerInterval: number | null = null;

  // Signal & Candidate Queueing to eliminate race conditions
  private pendingSignals: Array<{ signal: { type: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }; sessionId: string }> = [];
  private pendingIceCandidates: RTCIceCandidateInit[] = [];

  // Group Audio Mesh for Tamil Nadu District Junctions
  private junctionPeers: Map<string, RTCPeerConnection> = new Map();
  private junctionPendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();

  public onVolumeChange: ((volume: number) => void) | null = null;
  public onRemoteStream: ((stream: MediaStream) => void) | null = null;
  public onConnectionStateChange: ((state: RTCPeerConnectionState) => void) | null = null;
  public onJunctionRemoteStream: ((senderSocketId: string, stream: MediaStream) => void) | null = null;
  public onJunctionPeerDisconnected: ((senderSocketId: string) => void) | null = null;

  async requestMicrophone(): Promise<MediaStream> {
    try {
      if (this.localStream && this.localStream.active && this.localStream.getAudioTracks().length > 0) {
        return this.localStream;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1
        },
        video: false
      });

      this.localStream = stream;
      this.setupVisualizer(stream);
      return stream;
    } catch (error) {
      console.warn('[WebRTC] Microphone access not granted or unavailable:', error);
      const simulatedStream = this.createSyntheticAudioStream();
      this.localStream = simulatedStream;
      return simulatedStream;
    }
  }

  private createSyntheticAudioStream(): MediaStream {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const dst = ctx.createMediaStreamDestination();
      const gain = ctx.createGain();
      gain.gain.value = 0.0001; // inaudible carrier stream
      osc.connect(gain);
      gain.connect(dst);
      osc.start();
      return dst.stream;
    } catch {
      return new MediaStream();
    }
  }

  private setupVisualizer(stream: MediaStream) {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      if (this.visualizerInterval) clearInterval(this.visualizerInterval);

      this.visualizerInterval = window.setInterval(() => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((average / 128) * 100));
        if (this.onVolumeChange) {
          this.onVolumeChange(normalized);
        }
      }, 80);
    } catch (e) {
      console.warn('[WebRTC] AudioContext visualizer unavailable:', e);
    }
  }

  // ----------------------------------------------------
  // 1-ON-1 RANDOM STRANGER VOICE CHAT
  // ----------------------------------------------------
  async init1on1PeerConnection(sessionId: string, isInitiator: boolean) {
    this.cleanupPeerConnection();

    this.peerConnection = new RTCPeerConnection(PRODUCTION_ICE_SERVERS);
    this.pendingIceCandidates = [];

    // Attach local microphone audio tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        if (this.localStream && this.peerConnection) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });
    }

    // ICE candidate generation
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('voice:signal', {
          sessionId,
          signal: { type: 'candidate', candidate: event.candidate.toJSON() }
        });
      }
    };

    // Remote audio track arrival
    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTC] Received remote audio track from stranger:', event.streams);
      if (event.streams && event.streams[0]) {
        if (this.onRemoteStream) {
          this.onRemoteStream(event.streams[0]);
        }
      }
    };

    // Connection state logging & callback
    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection && this.onConnectionStateChange) {
        this.onConnectionStateChange(this.peerConnection.connectionState);
      }
    };

    // Process any signals that arrived while connection was initializing
    const queued = [...this.pendingSignals];
    this.pendingSignals = [];
    for (const item of queued) {
      await this.handleSignal(item.signal, item.sessionId);
    }

    // Initiator creates the initial offer
    if (isInitiator) {
      await this.createOffer(sessionId);
    }
  }

  async createOffer(sessionId: string) {
    if (!this.peerConnection) return;
    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true
      });
      await this.peerConnection.setLocalDescription(offer);
      socket.emit('voice:signal', {
        sessionId,
        signal: { type: 'offer', sdp: offer }
      });
    } catch (e) {
      console.error('[WebRTC] createOffer error:', e);
    }
  }

  async handleSignal(signal: { type: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }, sessionId: string) {
    if (!this.peerConnection) {
      // Queue signal until peer connection is initialized to prevent race condition
      this.pendingSignals.push({ signal, sessionId });
      return;
    }

    try {
      if (signal.type === 'offer' && signal.sdp) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        
        // Add any ICE candidates that arrived before remote description
        for (const cand of this.pendingIceCandidates) {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
        }
        this.pendingIceCandidates = [];

        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        socket.emit('voice:signal', {
          sessionId,
          signal: { type: 'answer', sdp: answer }
        });
      } else if (signal.type === 'answer' && signal.sdp) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        
        for (const cand of this.pendingIceCandidates) {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
        }
        this.pendingIceCandidates = [];
      } else if (signal.type === 'candidate' && signal.candidate) {
        if (this.peerConnection.remoteDescription && this.peerConnection.remoteDescription.type) {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } else {
          this.pendingIceCandidates.push(signal.candidate);
        }
      }
    } catch (e) {
      console.error('[WebRTC] handleSignal error:', e);
    }
  }

  // ----------------------------------------------------
  // TAMIL NADU DISTRICT JUNCTIONS GROUP AUDIO MESH
  // ----------------------------------------------------
  async connectJunctionPeer(districtId: string, targetSocketId: string, isInitiator: boolean) {
    if (this.junctionPeers.has(targetSocketId)) {
      return this.junctionPeers.get(targetSocketId)!;
    }

    const pc = new RTCPeerConnection(PRODUCTION_ICE_SERVERS);
    this.junctionPeers.set(targetSocketId, pc);
    this.junctionPendingCandidates.set(targetSocketId, []);

    // Add local microphone audio track to group peer
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Relay ICE candidate for this junction participant
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('junction:voice-signal', {
          districtId,
          targetSocketId,
          signal: { type: 'candidate', candidate: event.candidate.toJSON() }
        });
      }
    };

    // Incoming remote audio track from this junction participant
    pc.ontrack = (event) => {
      console.log(`[Junction WebRTC] Incoming audio track from participant ${targetSocketId}`);
      if (event.streams && event.streams[0]) {
        if (this.onJunctionRemoteStream) {
          this.onJunctionRemoteStream(targetSocketId, event.streams[0]);
        }
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        if (this.onJunctionPeerDisconnected) {
          this.onJunctionPeerDisconnected(targetSocketId);
        }
      }
    };

    if (isInitiator) {
      try {
        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);
        socket.emit('junction:voice-signal', {
          districtId,
          targetSocketId,
          signal: { type: 'offer', sdp: offer }
        });
      } catch (err) {
        console.error(`[Junction WebRTC] Error creating offer to ${targetSocketId}:`, err);
      }
    }

    return pc;
  }

  async handleJunctionVoiceSignal(districtId: string, senderSocketId: string, signal: { type: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }) {
    let pc = this.junctionPeers.get(senderSocketId);

    if (!pc) {
      pc = await this.connectJunctionPeer(districtId, senderSocketId, false);
    }

    try {
      if (signal.type === 'offer' && signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

        const pending = this.junctionPendingCandidates.get(senderSocketId) || [];
        for (const cand of pending) {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        }
        this.junctionPendingCandidates.set(senderSocketId, []);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('junction:voice-signal', {
          districtId,
          targetSocketId: senderSocketId,
          signal: { type: 'answer', sdp: answer }
        });
      } else if (signal.type === 'answer' && signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

        const pending = this.junctionPendingCandidates.get(senderSocketId) || [];
        for (const cand of pending) {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        }
        this.junctionPendingCandidates.set(senderSocketId, []);
      } else if (signal.type === 'candidate' && signal.candidate) {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } else {
          const list = this.junctionPendingCandidates.get(senderSocketId) || [];
          list.push(signal.candidate);
          this.junctionPendingCandidates.set(senderSocketId, list);
        }
      }
    } catch (e) {
      console.error(`[Junction WebRTC] Signal error with ${senderSocketId}:`, e);
    }
  }

  setMute(isMuted: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  }

  cleanupPeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.onicecandidate = null;
      this.peerConnection.ontrack = null;
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.pendingSignals = [];
    this.pendingIceCandidates = [];
  }

  cleanupJunctionMesh() {
    this.junctionPeers.forEach(pc => {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.close();
    });
    this.junctionPeers.clear();
    this.junctionPendingCandidates.clear();
  }

  cleanup() {
    this.cleanupPeerConnection();
    this.cleanupJunctionMesh();

    if (this.visualizerInterval) {
      clearInterval(this.visualizerInterval);
      this.visualizerInterval = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const webrtcManager = new WebRTCManager();
