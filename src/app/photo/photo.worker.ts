/// <reference lib="webworker" />
// Télécharge une photo Encar (via le relais /api/raw), la nettoie et renvoie un JPEG.
import { cleanCanvas } from './kc-clean';

interface Job {
  id: number;
  src: string;
  studio: boolean;
  width?: number;
}

addEventListener('message', async ({ data }: MessageEvent<Job>) => {
  const { id, src, studio, width } = data;
  try {
    const response = await fetch(src);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bitmap = await createImageBitmap(await response.blob());
    const { width: w, height: h } = bitmap;

    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    await cleanCanvas(ctx, w, h, studio);

    // miniature : réduite après la pose du badge
    let target = canvas;
    if (width && width < w) {
      target = new OffscreenCanvas(width, Math.round((h * width) / w));
      const small = target.getContext('2d')!;
      small.imageSmoothingQuality = 'high';
      small.drawImage(canvas, 0, 0, target.width, target.height);
    }
    const blob = await target.convertToBlob({ type: 'image/jpeg', quality: width ? 0.8 : 0.88 });
    postMessage({ id, blob });
  } catch (e) {
    postMessage({ id, error: String(e) });
  }
});
