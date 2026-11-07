import { socket } from './socket';
import { PRODUCTION_ICE_SERVERS } from './config';

export class WebRTCManager {
  private localStream: MediaStream | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private visualizerInterval: number | null = null;

  public onVolumeChange: ((volume: number) => void) | null = null;
  public onRemoteStream: ((stream: MediaStream) => void) | null = null;
  public onConnectionStateChange: ((state: RTCPeerConnectionState) => void) | null = null;

  async requestMicrophone(): Promise<MediaStream> {
    try {
      if (this.localStream) {
        return this.localStream;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      this.localStream = stream;
      this.setupVisualizer(stream);
      return stream;
    } catch (error) {
      console.warn('[WebRTC] Microphone access not granted or unavailable:', error);
      // Create empty silent stream with visualizer fallback
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
      gain.gain.value = 0.001; // nearly silent carrier
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

  init1on1PeerConnection(sessionId: string, isInitiator: boolean) {
    this.cleanupPeerConnection();

    this.peerConnection = new RTCPeerConnection(PRODUCTION_ICE_SERVERS);

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        if (this.localStream && this.peerConnection) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });
    }

    // ICE candidate handler
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('voice:signal', {
          sessionId,
          signal: { type: 'candidate', candidate: event.candidate }
        });
      }
    };

    // Remote track handler
    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTC] Received remote audio track');
      if (event.streams && event.streams[0]) {
        if (this.onRemoteStream) {
          this.onRemoteStream(event.streams[0]);
        }
      }
    };

    // Connection state
    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection && this.onConnectionStateChange) {
        this.onConnectionStateChange(this.peerConnection.connectionState);
      }
    };

    // If initiator, generate offer
    if (isInitiator) {
      this.createOffer(sessionId);
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
    if (!this.peerConnection) return;

    try {
      if (signal.type === 'offer' && signal.sdp) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        socket.emit('voice:signal', {
          sessionId,
          signal: { type: 'answer', sdp: answer }
        });
      } else if (signal.type === 'answer' && signal.sdp) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      } else if (signal.type === 'candidate' && signal.candidate) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch (e) {
      console.error('[WebRTC] handleSignal error:', e);
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
  }

  cleanup() {
    this.cleanupPeerConnection();

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
