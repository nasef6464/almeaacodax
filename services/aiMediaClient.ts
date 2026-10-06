export type BoundedAiImage = {
  data: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  previewUrl: string;
  decodedBytes: number;
};

const dataUrlPayload = (dataUrl: string) => String(dataUrl.split(",")[1] || "");

const decodedBytesFromBase64 = (value: string) => {
  const clean = value.replace(/\s+/g, "");
  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
};

const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("تعذر قراءة الصورة."));
    };
    image.src = url;
  });

export const compressImageForAi = async (
  file: File,
  options: { maxBytes?: number; maxDimension?: number } = {},
): Promise<BoundedAiImage> => {
  const maxBytes = Math.max(80 * 1024, options.maxBytes || 520 * 1024);
  const maxDimension = Math.max(480, options.maxDimension || 1280);
  const image = await loadImage(file);
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
  const width = Math.max(1, Math.round((image.naturalWidth || 1) * scale));
  const height = Math.max(1, Math.round((image.naturalHeight || 1) * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("تعذر تجهيز الصورة.");
  context.drawImage(image, 0, 0, width, height);

  let quality = 0.86;
  let previewUrl = canvas.toDataURL("image/jpeg", quality);
  let data = dataUrlPayload(previewUrl);
  let bytes = decodedBytesFromBase64(data);
  while (bytes > maxBytes && quality > 0.46) {
    quality -= 0.08;
    previewUrl = canvas.toDataURL("image/jpeg", quality);
    data = dataUrlPayload(previewUrl);
    bytes = decodedBytesFromBase64(data);
  }

  if (bytes > maxBytes) {
    throw new Error("الصورة ما زالت كبيرة بعد الضغط. اختر صورة أصغر.");
  }

  return { data, mimeType: "image/jpeg", previewUrl, decodedBytes: bytes };
};

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

const readSpeechRecognition = (): SpeechRecognitionCtor | null => {
  const scope = window as unknown as Record<string, unknown>;
  return (scope.SpeechRecognition || scope.webkitSpeechRecognition || null) as SpeechRecognitionCtor | null;
};

export const browserSpeechInputSupported = () => typeof window !== "undefined" && Boolean(readSpeechRecognition());

export const recognizeArabicOnce = () =>
  new Promise<string>((resolve, reject) => {
    const Ctor = readSpeechRecognition();
    if (!Ctor) {
      reject(new Error("الإملاء الصوتي غير مدعوم في هذا المتصفح."));
      return;
    }

    const recognition = new Ctor();
    recognition.lang = "ar-SA";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let settled = false;
    recognition.onresult = (event: any) => {
      const transcript = String(event?.results?.[0]?.[0]?.transcript || "").trim();
      settled = true;
      resolve(transcript);
    };
    recognition.onerror = () => {
      if (!settled) reject(new Error("تعذر التقاط الصوت الآن."));
    };
    recognition.onend = () => {
      if (!settled) resolve("");
    };
    recognition.start();
  });

export const speakArabic = (text: string) => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(String(text || "").slice(0, 1800));
  utterance.lang = "ar-SA";
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
  return true;
};
