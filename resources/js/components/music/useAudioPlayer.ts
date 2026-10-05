// Hook for managing a single HTML5 Audio instance.
// Cleans up on unmount — no leaked audio objects.

import { useEffect, useRef, useState, useCallback } from 'react';

export type AudioState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

interface UseAudioPlayerOptions {
    onEnded?: () => void;
}

export function useAudioPlayer({ onEnded }: UseAudioPlayerOptions = {}) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [state, setState] = useState<AudioState>('idle');
    const [currentSrc, setCurrentSrc] = useState<string | null>(null);
    const stopAtRef = useRef<number | null>(null);
    const timeUpdateListenerRef = useRef<(() => void) | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                if (timeUpdateListenerRef.current) {
                    audioRef.current.removeEventListener('timeupdate', timeUpdateListenerRef.current);
                }
                audioRef.current.pause();
                audioRef.current.src = '';
                audioRef.current = null;
            }
        };
    }, []);

    const getAudio = useCallback((): HTMLAudioElement => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.preload = 'none';
        }
        return audioRef.current;
    }, []);

    const stop = useCallback(() => {
        const audio = audioRef.current;
        if (audio) {
            audio.pause();
            audio.src = '';
        }
        stopAtRef.current = null;
        setState('idle');
        setCurrentSrc(null);
    }, []);

    const play = useCallback((src: string, startSec = 0, endSec?: number) => {
        const audio = getAudio();

        // Stop previous
        audio.pause();
        audio.src = '';
        setState('loading');
        setCurrentSrc(src);
        stopAtRef.current = endSec ?? null;

        audio.src = src;
        audio.currentTime = startSec;

        const handleCanPlay = () => {
            audio.play().then(() => {
                setState('playing');
            }).catch(() => {
                setState('error');
            });
        };

        const handleError = () => setState('error');

        // Remove previous timeupdate listener if any
        if (timeUpdateListenerRef.current) {
            audio.removeEventListener('timeupdate', timeUpdateListenerRef.current);
            timeUpdateListenerRef.current = null;
        }

        const handleTimeUpdate = () => {
            if (stopAtRef.current !== null && audio.currentTime >= stopAtRef.current) {
                audio.pause();
                setState('paused');
                onEnded?.();
            }
        };

        const handleEnded = () => {
            setState('idle');
            onEnded?.();
        };

        timeUpdateListenerRef.current = handleTimeUpdate;

        audio.addEventListener('canplay', handleCanPlay, { once: true });
        audio.addEventListener('error', handleError, { once: true });
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded, { once: true });

        audio.load();
    }, [getAudio, onEnded]);

    const pause = useCallback(() => {
        audioRef.current?.pause();
        setState('paused');
    }, []);

    const toggle = useCallback((src: string, startSec = 0, endSec?: number) => {
        if (state === 'playing' && currentSrc === src) {
            pause();
        } else {
            play(src, startSec, endSec);
        }
    }, [state, currentSrc, play, pause]);

    const getCurrentTime = useCallback((): number => {
        return audioRef.current?.currentTime ?? 0;
    }, []);

    return { state, currentSrc, play, pause, stop, toggle, getCurrentTime };
}
