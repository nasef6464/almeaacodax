import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Upload, Trash2, Volume2 } from 'lucide-react';
import type { QuestionVoiceExplanation } from '../../../types';
import { api } from '../../../services/api';

interface QuestionVoiceExplanationEditorProps {
  value?: QuestionVoiceExplanation;
  onChange: (value: QuestionVoiceExplanation) => void;
}

const supportedRecordingMime = () => {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'];
  return candidates.find((mime) => MediaRecorder.isTypeSupported?.(mime)) || '';
};

const normalizedAudioMime = (mime: string) => {
  const base = String(mime || '').split(';')[0].trim().toLowerCase();
  if (['audio/mpeg', 'audio/webm', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/wav', 'audio/x-wav'].includes(base)) {
    return base;
  }
  return '';
};

const extensionForMime = (mime: string) => ({
  'audio/mpeg': 'mp3',
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
}[mime] || 'webm');

export const QuestionVoiceExplanationEditor: React.FC<QuestionVoiceExplanationEditorProps> = ({
  value,
  onChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => {
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const update = (patch: Partial<QuestionVoiceExplanation>) => {
    onChange({
      ...(value || {}),
      ...patch,
      version: Math.max(1, Number(value?.version || 1)),
    });
  };

  const uploadAudio = async (file: File) => {
    setError('');
    const mime = normalizedAudioMime(file.type);
    if (!mime) {
      setError('صيغة الصوت غير مدعومة. استخدم MP3 أو WebM أو M4A أو OGG أو WAV.');
      return;
    }

    const normalizedFile = file.type === mime
      ? file
      : new File([file], file.name, { type: mime, lastModified: file.lastModified });

    setIsUploading(true);
    try {
      const uploaded = await api.uploadQuestionExplanationAudio(normalizedFile);
      update({
        audioUrl: uploaded.publicUrl,
        audioMimeType: mime,
        version: Math.max(1, Number(value?.version || 1) + 1),
      });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'تعذر رفع الشرح الصوتي.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const startRecording = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('التسجيل المباشر غير مدعوم في هذا المتصفح. يمكنك رفع ملف صوتي بدلًا من ذلك.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = supportedRecordingMime();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setError('حدث خطأ أثناء التسجيل الصوتي.');
        setIsRecording(false);
        stopTracks();
      };
      recorder.onstop = async () => {
        const rawMime = recorder.mimeType || mimeType || 'audio/webm';
        const mime = normalizedAudioMime(rawMime) || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mime });
        chunksRef.current = [];
        setIsRecording(false);
        stopTracks();
        if (blob.size > 0) {
          const file = new File(
            [blob],
            `question-explanation-${Date.now()}.${extensionForMime(mime)}`,
            { type: mime },
          );
          await uploadAudio(file);
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (recordingError) {
      stopTracks();
      setIsRecording(false);
      setError(
        recordingError instanceof Error && recordingError.name === 'NotAllowedError'
          ? 'لم يتم السماح باستخدام الميكروفون.'
          : 'تعذر بدء التسجيل الصوتي.',
      );
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  };

  return (
    <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4 space-y-4">
      <div>
        <div className="flex items-center gap-2 text-sm font-black text-sky-950">
          <Volume2 size={17} />
          الشرح الصوتي للمعلم
        </div>
        <p className="mt-1 text-xs font-bold leading-6 text-sky-800">
          الأولوية: تسجيل المعلم، ثم النص اليدوي، ثم الشرح الذكي. هذه البيانات لا تظهر قبل إجابة الطالب.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-black text-slate-700">نص الشرح الصوتي اليدوي</label>
        <textarea
          rows={4}
          value={value?.text || ''}
          onChange={(event) => update({ text: event.target.value })}
          className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm leading-7 outline-none focus:border-sky-400"
          placeholder="اكتب هنا الشرح بالطريقة التي تريد أن يسمعها الطالب، مثال: بص يا بطل، هنا نبدأ بالقسمة أولًا..."
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/mpeg,audio/webm,audio/mp4,audio/x-m4a,audio/ogg,audio/wav"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void uploadAudio(file);
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || isRecording}
          className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-black text-sky-900 disabled:opacity-50"
        >
          <Upload size={15} />
          {isUploading ? 'جارٍ رفع الصوت...' : 'رفع ملف صوتي'}
        </button>

        {!isRecording ? (
          <button
            type="button"
            onClick={() => void startRecording()}
            disabled={isUploading}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-800 disabled:opacity-50"
          >
            <Mic size={15} />
            تسجيل صوتي الآن
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-700"
          >
            <Square size={14} />
            إيقاف وحفظ التسجيل
          </button>
        )}

        {value?.audioUrl ? (
          <button
            type="button"
            onClick={() => update({ audioUrl: '', audioMimeType: '', version: Math.max(1, Number(value?.version || 1) + 1) })}
            disabled={isUploading || isRecording}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-50"
          >
            <Trash2 size={15} />
            إزالة التسجيل
          </button>
        ) : null}
      </div>

      {isRecording ? (
        <div className="text-xs font-black text-red-700">يتم التسجيل الآن... اضغط «إيقاف وحفظ التسجيل» عند الانتهاء.</div>
      ) : null}

      {value?.audioUrl ? (
        <audio controls preload="metadata" className="w-full" src={value.audioUrl}>
          متصفحك لا يدعم تشغيل الصوت.
        </audio>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
};
