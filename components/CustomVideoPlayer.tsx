import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { 
    Play, Pause, Volume2, VolumeX, Maximize, 
    Settings, RotateCcw, SkipForward, SkipBack,
    Volume1, Volume
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CustomVideoPlayerProps {
    url: string;
    title?: string;
}

const normalizeVideoUrl = (rawUrl: string) => {
    const url = rawUrl.trim();
    if (!url) return '';

    const googleDriveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (googleDriveMatch?.[1]) {
        return `https://drive.google.com/file/d/${googleDriveMatch[1]}/preview`;
    }

    return url;
};

export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({ url, title }) => {
    const Player = ReactPlayer as any;
    const playerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const normalizedUrl = normalizeVideoUrl(url);
    
    const [playing, setPlaying] = useState(false);
    const [volume, setVolume] = useState(0.8);
    const [muted, setMuted] = useState(false);
    const [played, setPlayed] = useState(0);
    const [duration, setDuration] = useState(0);
    const [seeking, setSeeking] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [hasPlaybackError, setHasPlaybackError] = useState(false);

    useEffect(() => {
        setPlaying(false);
        setPlayed(0);
        setDuration(0);
        setHasPlaybackError(false);
    }, [normalizedUrl]);

    // Cleanup on unmount to prevent "play() request was interrupted" error
    useEffect(() => {
        return () => {
            if (playerRef.current) {
                try {
                    const internalPlayer = playerRef.current.getInternalPlayer();
                    if (internalPlayer && typeof internalPlayer.pauseVideo === 'function') {
                        internalPlayer.pauseVideo();
                    } else if (internalPlayer && typeof internalPlayer.pause === 'function') {
                        internalPlayer.pause();
                    }
                } catch (e) {
                    // Ignore errors during cleanup
                }
            }
            setPlaying(false);
        };
    }, []);

    // Hide controls after 3 seconds of inactivity
    useEffect(() => {
        let timeout: any;
        if (playing && !seeking) {
            timeout = setTimeout(() => setShowControls(false), 3000);
        } else {
            setShowControls(true);
        }
        return () => clearTimeout(timeout);
    }, [playing, seeking, showControls]);

    const handlePlayPause = () => setPlaying(!playing);
    
    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        setMuted(val === 0);
    };

    const handleToggleMuted = () => setMuted(!muted);

    const handleProgress = (state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => {
        if (!seeking) {
            setPlayed(state.played);
        }
    };

    const handleSeekMouseDown = () => setSeeking(true);
    
    const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPlayed(parseFloat(e.target.value));
    };

    const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
        setSeeking(false);
        playerRef.current?.seekTo(parseFloat((e.target as HTMLInputElement).value));
    };

    const handleDuration = (dur: number) => {
        if (dur > 0) setDuration(dur);
    };

    const handleReady = () => {
        setHasPlaybackError(false);
        if (playerRef.current) {
            const dur = playerRef.current.getDuration();
            if (dur > 0) setDuration(dur);
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const formatTime = (seconds: number) => {
        const date = new Date(seconds * 1000);
        const hh = date.getUTCHours();
        const mm = date.getUTCMinutes();
        const ss = date.getUTCSeconds().toString().padStart(2, '0');
        if (hh) {
            return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
        }
        return `${mm}:${ss}`;
    };

    const handleRewind = () => {
        const currentTime = playerRef.current?.getCurrentTime() || 0;
        playerRef.current?.seekTo(currentTime - 10);
    };

    const handleFastForward = () => {
        const currentTime = playerRef.current?.getCurrentTime() || 0;
        playerRef.current?.seekTo(currentTime + 10);
    };

    return (
        <div 
            ref={containerRef}
            className="relative w-full h-full bg-black group overflow-hidden rounded-3xl"
            onMouseMove={() => setShowControls(true)}
            onMouseLeave={() => playing && setShowControls(false)}
        >
            <Player
                ref={playerRef}
                url={normalizedUrl}
                width="100%"
                height="100%"
                playing={playing}
                playsInline
                volume={volume}
                muted={muted}
                onProgress={handleProgress as any}
                onReady={handleReady}
                onError={() => {
                    setPlaying(false);
                    setHasPlaybackError(true);
                }}
                config={{
                    file: {
                        attributes: {
                            controlsList: 'nodownload',
                            preload: 'metadata',
                        },
                    },
                    youtube: {
                        playerVars: { 
                            controls: 0,
                            modestbranding: 1,
                            rel: 0,
                            showinfo: 0,
                            iv_load_policy: 3
                        }
                    }
                } as any}
                style={{ pointerEvents: 'none' }}
            />

            {hasPlaybackError && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/80 px-6 text-center text-white">
                    <p className="text-lg font-bold">تعذر تشغيل هذا الفيديو داخل المنصة.</p>
                    <a
                        href={normalizedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 transition-colors font-bold"
                    >
                        فتح الفيديو في نافذة جديدة
                    </a>
                </div>
            )}

            {/* Overlay to catch clicks and show play/pause animation */}
            <div 
                className="absolute inset-0 z-10 cursor-pointer"
                onClick={handlePlayPause}
            >
                <AnimatePresence>
                    {!playing && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.5 }}
                            className="absolute inset-0 flex items-center justify-center"
                        >
                            <div className="w-20 h-20 bg-indigo-600/80 rounded-full flex items-center justify-center text-white shadow-2xl">
                                <Play size={40} fill="currentColor" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Custom Controls */}
            <motion.div 
                initial={false}
                animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : 20 }}
                className="absolute bottom-0 left-0 right-0 z-20 p-4 md:p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-20"
            >
                {/* Progress Bar */}
                <div className="relative group/progress mb-4">
                    <input
                        type="range"
                        min={0}
                        max={0.999999}
                        step="any"
                        value={played}
                        onMouseDown={handleSeekMouseDown}
                        onChange={handleSeekChange}
                        onMouseUp={handleSeekMouseUp}
                        className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:h-2 transition-all"
                        style={{
                            background: `linear-gradient(to right, #6366f1 ${played * 100}%, rgba(255,255,255,0.2) ${played * 100}%)`
                        }}
                    />
                </div>

                <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-4 md:gap-6">
                        {/* Play/Pause */}
                        <button onClick={handlePlayPause} className="hover:text-indigo-400 transition-colors">
                            {playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                        </button>

                        {/* Rewind/Forward */}
                        <div className="hidden sm:flex items-center gap-4">
                            <button onClick={handleRewind} className="hover:text-indigo-400 transition-colors">
                                <SkipBack size={20} />
                            </button>
                            <button onClick={handleFastForward} className="hover:text-indigo-400 transition-colors">
                                <SkipForward size={20} />
                            </button>
                        </div>

                        {/* Time */}
                        <div className="text-xs md:text-sm font-medium font-mono">
                            {formatTime(played * duration)} / {formatTime(duration)}
                        </div>

                        {/* Volume */}
                        <div className="flex items-center gap-2 group/volume">
                            <button onClick={handleToggleMuted} className="hover:text-indigo-400 transition-colors">
                                {muted || volume === 0 ? <VolumeX size={20} /> : volume < 0.5 ? <Volume1 size={20} /> : <Volume2 size={20} />}
                            </button>
                            <input
                                type="range"
                                min={0}
                                max={1}
                                step="any"
                                value={muted ? 0 : volume}
                                onChange={handleVolumeChange}
                                className="w-0 group-hover/volume:w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white transition-all overflow-hidden"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 md:gap-6">
                        <button className="hover:text-indigo-400 transition-colors">
                            <Settings size={20} />
                        </button>
                        <button onClick={toggleFullscreen} className="hover:text-indigo-400 transition-colors">
                            <Maximize size={20} />
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Custom CSS for range inputs */}
            <style dangerouslySetInnerHTML={{ __html: `
                input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    height: 12px;
                    width: 12px;
                    border-radius: 50%;
                    background: white;
                    cursor: pointer;
                    box-shadow: 0 0 10px rgba(0,0,0,0.5);
                }
                input[type=range]::-moz-range-thumb {
                    height: 12px;
                    width: 12px;
                    border-radius: 50%;
                    background: white;
                    cursor: pointer;
                    border: none;
                }
            `}} />
        </div>
    );
};
