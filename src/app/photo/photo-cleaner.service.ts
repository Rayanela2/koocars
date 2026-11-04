import { Injectable } from '@angular/core';

const ENCAR_PHOTO = /^https:\/\/ci\.encar\.com(\/carpicture\d+\/pic\d+\/\d+_(\d+)\.jpe?g)$/i;

interface Pending {
  id: number;
  src: string;
  studio: boolean;
  width?: number;
  resolve: (url: string) => void;
  reject: (e: Error) => void;
}

/**
 * Nettoie les photos Encar dans le navigateur (Cloudflare Pages ne peut pas faire tourner sharp) :
 * un petit groupe de Web Workers, une file où la dernière demande passe en premier
 * (la photo qu'on vient d'afficher), et un cache d'URL blob.
 */
@Injectable({ providedIn: 'root' })
export class PhotoCleanerService {
  private readonly cache = new Map<string, Promise<string>>();
  private readonly queue: Pending[] = [];
  private readonly idle: Worker[] = [];
  private readonly running = new Map<number, { worker: Worker; job: Pending }>();
  private workers = 0;
  private nextId = 0;
  private readonly maxWorkers = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1));
  readonly supported = typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined';

  /** URL (blob:) de la photo nettoyée ; rejette si ce n'est pas une photo Encar ou si le traitement échoue. */
  clean(url: string, width?: number): Promise<string> {
    const key = `${width ?? 0}|${url}`;
    let result = this.cache.get(key);
    if (!result) {
      result = this.schedule(url, width);
      this.cache.set(key, result);
      // échec : on pourra retenter plus tard
      result.catch(() => this.cache.delete(key));
    }
    return result;
  }

  private schedule(url: string, width?: number): Promise<string> {
    const m = ENCAR_PHOTO.exec(url);
    if (!m || !this.supported) return Promise.reject(new Error('non pris en charge'));
    return new Promise<string>((resolve, reject) => {
      this.queue.push({
        id: ++this.nextId,
        src: new URL(`/api/raw?p=${m[1]}`, location.origin).href,
        // « Trust Encar » et la plaque n'existent que sur les premières photos (extérieur, en studio)
        studio: parseInt(m[2], 10) <= 8,
        width,
        resolve,
        reject,
      });
      this.pump();
    });
  }

  private pump(): void {
    while (this.queue.length) {
      const worker = this.idle.pop() ?? this.spawn();
      if (!worker) return;
      const job = this.queue.pop()!; // la plus récente d'abord
      this.running.set(job.id, { worker, job });
      const { resolve, reject, ...message } = job;
      worker.postMessage(message);
    }
  }

  private spawn(): Worker | null {
    if (this.workers >= this.maxWorkers) return null;
    this.workers++;
    const worker = new Worker(new URL('./photo.worker', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }: MessageEvent<{ id: number; blob?: Blob; error?: string }>) => {
      const entry = this.running.get(data.id);
      this.running.delete(data.id);
      this.idle.push(worker);
      if (entry) {
        if (data.blob) entry.job.resolve(URL.createObjectURL(data.blob));
        else entry.job.reject(new Error(data.error));
      }
      this.pump();
    };
    return worker;
  }
}
