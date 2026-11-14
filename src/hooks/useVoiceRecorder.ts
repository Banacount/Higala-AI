import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_VOICE_AUDIO_BYTES } from '@/shared/types';

export const MAX_VOICE_RECORDING_MS = 120_000;

const MIN_VOICE_BYTES = 512;
/**
 * Speech is intelligible well below MediaRecorder's usual default bitrate. A
 * smaller upload reaches the transcription service sooner without a
 * meaningful accuracy loss for one- to two-minute messages.
 */
const VOICE_BITS_PER_SECOND = 48_000;
const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
] as const;

export type VoiceRecorderStatus =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'preview';

export interface VoiceRecording {
  blob: Blob;
  url: string;
  mimeType: string;
  durationMs: number;
}

function supportsRecording(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined'
  );
}

function preferredMimeType(): string | undefined {
  if (
    typeof MediaRecorder === 'undefined' ||
    typeof MediaRecorder.isTypeSupported !== 'function'
  ) {
    return undefined;
  }
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
}

function createRecorder(
  stream: MediaStream,
  mimeType: string | undefined,
): MediaRecorder {
  // Some Safari versions reject an explicit bitrate, and some reject an
  // explicit mimeType (e.g. when audio/mp4 is not supported). Try the most
  // specific options first and fall back to the bare constructor instead of
  // surfacing "could not start a voice recording".
  const attempts: MediaRecorderOptions[] = [
    { audioBitsPerSecond: VOICE_BITS_PER_SECOND, ...(mimeType ? { mimeType } : {}) },
    mimeType ? { mimeType } : {},
    {},
  ];

  for (const options of attempts) {
    try {
      return new MediaRecorder(stream, options);
    } catch {
      // Try the next, less specific option set.
    }
  }

  // The stream itself is unusable; rethrow the final failure as a real error.
  throw new Error('Could not start a voice recording.');
}

function mediaErrorMessage(error: unknown): string {
  const name =
    error && typeof error === 'object'
      ? (error as { name?: unknown }).name
      : undefined;

  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Microphone access was denied. Allow it in your browser settings to send a voice message.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No microphone was found on this device.';
  }
  if (name === 'NotReadableError') {
    return 'The microphone is busy or unavailable. Close other apps using it and try again.';
  }
  return 'The microphone could not be started. Please try again.';
}

export function useVoiceRecorder() {
  const [status, setStatus] = useState<VoiceRecorderStatus>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [recording, setRecording] = useState<VoiceRecording | null>(null);
  const [error, setError] = useState<string | null>(null);

  const statusRef = useRef<VoiceRecorderStatus>('idle');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const recordingRef = useRef<VoiceRecording | null>(null);
  const mountedRef = useRef(true);
  const supported = supportsRecording();

  const setRecorderStatus = useCallback((next: VoiceRecorderStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    if (statusRef.current !== 'idle') return;

    setError(null);
    if (!supported) {
      setError('Voice recording is not supported in this browser.');
      return;
    }

    setRecorderStatus('requesting');

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (caught) {
      setRecorderStatus('idle');
      setError(mediaErrorMessage(caught));
      return;
    }

    if (!mountedRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    streamRef.current = stream;

    try {
      const mimeType = preferredMimeType();
      const recorder = createRecorder(stream, mimeType);

      chunksRef.current = [];
      startedAtRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onerror = () => {
        recorder.onstop = null;
        clearTimer();
        releaseStream();
        recorderRef.current = null;
        chunksRef.current = [];
        setElapsedMs(0);
        setRecorderStatus('idle');
        setError('The recording stopped unexpectedly. Please try again.');
      };

      recorder.onstop = () => {
        clearTimer();
        releaseStream();
        recorderRef.current = null;

        const durationMs = Math.min(
          Math.max(0, Date.now() - startedAtRef.current),
          MAX_VOICE_RECORDING_MS,
        );
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType || 'audio/webm',
        });
        chunksRef.current = [];

        if (blob.size < MIN_VOICE_BYTES) {
          setElapsedMs(0);
          setRecorderStatus('idle');
          setError(
            'That recording was too short. Hold the microphone a little longer.',
          );
          return;
        }

        if (blob.size > MAX_VOICE_AUDIO_BYTES) {
          setElapsedMs(0);
          setRecorderStatus('idle');
          setError(
            'That recording is too large. Keep voice messages under two minutes.',
          );
          return;
        }

        const next: VoiceRecording = {
          blob,
          url: URL.createObjectURL(blob),
          mimeType: blob.type,
          durationMs,
        };
        recordingRef.current = next;
        setRecording(next);
        setElapsedMs(durationMs);
        setRecorderStatus('preview');
      };

      recorder.start(1_000);
      recorderRef.current = recorder;
      setElapsedMs(0);
      setRecorderStatus('recording');

      timerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startedAtRef.current;
        setElapsedMs(Math.min(elapsed, MAX_VOICE_RECORDING_MS));

        if (elapsed >= MAX_VOICE_RECORDING_MS) {
          clearTimer();
          const current = recorderRef.current;
          if (current && current.state === 'recording') {
            try {
              current.stop();
            } catch {
              // The recorder may already be stopping.
            }
          }
        }
      }, 250);
    } catch {
      releaseStream();
      setRecorderStatus('idle');
      setError('This browser could not start a voice recording.');
    }
  }, [clearTimer, releaseStream, setRecorderStatus, supported]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;
    try {
      recorder.stop();
    } catch {
      // The recorder may already be stopping.
    }
  }, []);

  const cancel = useCallback(() => {
    clearTimer();

    const recorder = recorderRef.current;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      if (recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          // The recorder may already be stopped.
        }
      }
      recorderRef.current = null;
    }

    releaseStream();
    chunksRef.current = [];

    const current = recordingRef.current;
    recordingRef.current = null;
    if (current) URL.revokeObjectURL(current.url);

    setRecording(null);
    setElapsedMs(0);
    setRecorderStatus('idle');
  }, [clearTimer, releaseStream, setRecorderStatus]);

  /**
   * Hands the previewed recording's blob and duration to the send flow. The
   * preview URL is revoked here because the chat message creates its own URL
   * for the same blob, so the recording no longer needs one.
   */
  const consume = useCallback((): VoiceRecording | null => {
    const current = recordingRef.current;
    recordingRef.current = null;
    if (current) URL.revokeObjectURL(current.url);
    setRecording(null);
    setElapsedMs(0);
    setRecorderStatus('idle');
    return current;
  }, [setRecorderStatus]);

  const dismissError = useCallback(() => setError(null), []);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const recorder = recorderRef.current;
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.onerror = null;
        if (recorder.state !== 'inactive') {
          try {
            recorder.stop();
          } catch {
            // The recorder may already be stopped.
          }
        }
        recorderRef.current = null;
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;

      const current = recordingRef.current;
      if (current) URL.revokeObjectURL(current.url);
      recordingRef.current = null;
    };
  }, []);

  return {
    status,
    elapsedMs,
    recording,
    error,
    supported,
    start,
    stop,
    cancel,
    consume,
    dismissError,
  };
}
