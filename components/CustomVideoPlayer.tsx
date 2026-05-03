import React, { useEffect, useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import {
  Maximize,
  Pause,
  Play,
  Settings,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { sanitizeVideoUrl } from '../utils/videoLinks';

interface CustomVideoPlayerProps {
  url: string;
  title?: string;
}

interface NormalizedVideoSource {
  playerUrl: string;
  externalUrl: string;
  iframeUrl?: string;
  blockedProvider?: string;
}

const normalizeVideoUrl = (rawUrl: string) => {
  const url = sanitizeVideoUrl(rawUrl);
  if (!url) return { playerUrl: '', externalUrl: '' };

  const safeUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;

  try {
    const parsedUrl = new URL(safeUrl);
    const host = parsedUrl.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtu.be' || host.includes('youtube.com')) {
      return { playerUrl: '', externalUrl: safeUrl, blockedProvider: 'YouTube' };
    }

    if (host.includes('vimeo.com')) {
      const videoId = parsedUrl.pathname.split('/').filter(Boolean).find((part) => /^\d+$/.test(part));
      if (videoId) {
        const normalized = `https://vimeo.com/${videoId}`;
        return { playerUrl: normalized, externalUrl: normalized };
      }
    }

    if (host === 'drive.google.com') {
      const fileId =
        parsedUrl.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ||
        parsedUrl.searchParams.get('id');
      if (fileId) {
        return {
          playerUrl: `https://drive.google.com/file/d/${fileId}/preview`,
          iframeUrl: `https://drive.google.com/file/d/${fileId}/preview`,
          externalUrl: `https://drive.google.com/file/d/${fileId}/view`,
        };
      }
    }

    if (host.includes('dropbox.com')) {
      parsedUrl.searchParams.set('raw', '1');
      parsedUrl.searchParams.delete('dl');
      return { playerUrl: parsedUrl.toString(), externalUrl: safeUrl };
    }
  } catch {
    return { playerUrl: url, externalUrl: url };
  }

  return { playerUrl: safeUrl, externalUrl: safeUrl };
};

export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({ url, title }) => {
  const Player = ReactPlayer as any;
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoSource = normalizeVideoUrl(url);
  const normalizedUrl = videoSource.playerUrl;

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

  useEffect(() => {
    return () => {
      try {
        const internalPlayer = playerRef.current?.getInternalPlayer?.();
        if (internalPlayer && typeof internalPlayer.pauseVideo === 'function') {
          internalPlayer.pauseVideo();
        } else if (internalPlayer && typeof internalPlayer.pause === 'function') {
          internalPlayer.pause();
        }
      } catch {
        // Ignore player cleanup errors when closing modals or switching routes.
      }
      setPlaying(false);
    };
  }, []);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (playing && !seeking) {
      timeout = setTimeout(() => setShowControls(false), 3000);
    } else {
      setShowControls(true);
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [playing, seeking, showControls]);

  const handlePlayPause = () => setPlaying((value) => !value);

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextVolume = parseFloat(event.target.value);
    setVolume(nextVolume);
    setMuted(nextVolume === 0);
  };

  const handleProgress = (state: { played: number }) => {
    if (!seeking) {
      setPlayed(state.played);
    }
  };

  const handleSeekMouseUp = (event: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    const nextValue = parseFloat((event.target as HTMLInputElement).value);
    setSeeking(false);
    playerRef.current?.seekTo(nextValue);
  };

  const handleReady = () => {
    setHasPlaybackError(false);
    const playerDuration = playerRef.current?.getDuration?.();
    if (playerDuration > 0) setDuration(playerDuration);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
      return;
    }

    document.exitFullscreen();
    setIsFullscreen(false);
  };

  const formatTime = (seconds: number) => {
    const safeSeconds = Number.isFinite(seconds) ? seconds : 0;
    const date = new Date(safeSeconds * 1000);
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const displaySeconds = date.getUTCSeconds().toString().padStart(2, '0');
    if (hours) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${displaySeconds}`;
    }
    return `${minutes}:${displaySeconds}`;
  };

  const seekBySeconds = (seconds: number) => {
    const currentTime = playerRef.current?.getCurrentTime?.() || 0;
    playerRef.current?.seekTo(Math.max(0, currentTime + seconds));
  };

  const usesNativeIframe = Boolean(videoSource.iframeUrl);

  if (!normalizedUrl && videoSource.blockedProvider) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-3xl bg-slate-950 px-6 text-center text-white" dir="rtl">
        <p className="text-lg font-bold">هذا المصدر غير متاح داخل مشغل المنصة</p>
        <p className="max-w-md text-sm leading-7 text-white/70">
          استخدم ملف فيديو مباشر أو خدمة استضافة فيديو خاصة حتى يعمل الدرس داخل المشغل الداخلي بدون أي واجهة خارجية.
        </p>
      </div>
    );
  }

  if (!normalizedUrl) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-3xl bg-slate-950 px-6 text-center text-white" dir="rtl">
        <p className="text-lg font-bold">لا يوجد رابط فيديو صالح لهذا الدرس</p>
        <p className="max-w-md text-sm leading-7 text-white/70">
          أضف رابط يوتيوب أو ملف فيديو من الإدارة حتى يظهر الدرس للطلاب داخل المنصة.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black group overflow-hidden rounded-3xl"
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => playing && setShowControls(false)}
      dir="ltr"
    >
      {usesNativeIframe ? (
        <iframe
          src={videoSource.iframeUrl}
          title={title || 'منصة المئة التعليمية'}
          className="h-full w-full border-0"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
        />
      ) : (
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
          onDuration={(nextDuration: number) => {
            if (nextDuration > 0) setDuration(nextDuration);
          }}
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
                autoplay: 0,
                controls: 0,
                disablekb: 1,
                fs: 0,
                modestbranding: 1,
                rel: 0,
                showinfo: 0,
                iv_load_policy: 3,
                origin: window.location.origin,
              },
            },
          } as any}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {hasPlaybackError && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/80 px-6 text-center text-white" dir="rtl">
          <p className="text-lg font-bold">تعذر تشغيل هذا الفيديو داخل المنصة.</p>
          <p className="max-w-md text-sm leading-7 text-white/70">
            قد يكون الرابط يمنع التشغيل المدمج. يمكنك فتحه في نافذة جديدة الآن، وسنظل محتفظين بالدرس داخل المنصة.
          </p>
          <a
            href="#"
            aria-hidden="true"
            tabIndex={-1}
            className="hidden px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 transition-colors font-bold"
          >
            فتح الفيديو في نافذة جديدة
          </a>
        </div>
      )}

      {!usesNativeIframe && (
      <div className="absolute inset-0 z-10 cursor-pointer" onClick={handlePlayPause}>
        <AnimatePresence>
          {!playing && !hasPlaybackError && (
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
      )}

      {title ? (
        <div className="pointer-events-none absolute left-4 right-4 top-4 z-20 rounded-2xl bg-black/35 px-4 py-2 text-right text-sm font-bold text-white backdrop-blur" dir="rtl">
          {title}
        </div>
      ) : null}

      {!usesNativeIframe && (
      <motion.div
        initial={false}
        animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : 20 }}
        className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 sm:p-4 md:p-6 pt-16 sm:pt-20"
      >
        <div className="relative group/progress mb-4">
          <input
            type="range"
            min={0}
            max={0.999999}
            step="any"
            value={played}
            onMouseDown={() => setSeeking(true)}
            onTouchStart={() => setSeeking(true)}
            onChange={(event) => setPlayed(parseFloat(event.target.value))}
            onMouseUp={handleSeekMouseUp}
            onTouchEnd={handleSeekMouseUp}
            className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:h-2 transition-all"
            style={{
              background: `linear-gradient(to right, #6366f1 ${played * 100}%, rgba(255,255,255,0.2) ${played * 100}%)`,
            }}
          />
        </div>

        <div className="flex flex-col gap-3 text-white sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 md:gap-6">
            <button onClick={handlePlayPause} className="hover:text-indigo-400 transition-colors" aria-label={playing ? 'إيقاف' : 'تشغيل'}>
              {playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
            </button>

            <div className="hidden sm:flex items-center gap-4">
              <button onClick={() => seekBySeconds(-10)} className="hover:text-indigo-400 transition-colors" aria-label="رجوع 10 ثوان">
                <SkipBack size={20} />
              </button>
              <button onClick={() => seekBySeconds(10)} className="hover:text-indigo-400 transition-colors" aria-label="تقديم 10 ثوان">
                <SkipForward size={20} />
              </button>
            </div>

            <div className="text-xs md:text-sm font-medium font-mono whitespace-nowrap">
              {formatTime(played * duration)} / {formatTime(duration)}
            </div>

            <div className="hidden sm:flex items-center gap-2 group/volume">
              <button onClick={() => setMuted((value) => !value)} className="hover:text-indigo-400 transition-colors" aria-label="الصوت">
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

          <div className="flex items-center justify-between gap-4 sm:justify-end md:gap-6">
            <button className="hidden sm:inline-flex hover:text-indigo-400 transition-colors" aria-label="الإعدادات">
              <Settings size={20} />
            </button>
            <button onClick={() => setMuted((value) => !value)} className="sm:hidden hover:text-indigo-400 transition-colors" aria-label="الصوت">
              {muted || volume === 0 ? <VolumeX size={20} /> : volume < 0.5 ? <Volume1 size={20} /> : <Volume2 size={20} />}
            </button>
            <button onClick={toggleFullscreen} className="hover:text-indigo-400 transition-colors" aria-label={isFullscreen ? 'إغلاق الشاشة الكاملة' : 'شاشة كاملة'}>
              <Maximize size={20} />
            </button>
          </div>
        </div>
      </motion.div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
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
          `,
        }}
      />
    </div>
  );
};
