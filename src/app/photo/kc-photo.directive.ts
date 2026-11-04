import { Directive, ElementRef, OnChanges, OnDestroy, inject, input } from '@angular/core';
import { PhotoCleanerService } from './photo-cleaner.service';

/**
 * <img [kcPhoto]="url"> : affiche la photo Encar nettoyée (sans marques Encar, badge KC),
 * calculée seulement quand l'image approche de l'écran. Si le nettoyage échoue,
 * on montre l'original avec le badge KC posé en CSS (classe wm-fallback sur le parent).
 */
@Directive({ selector: 'img[kcPhoto]' })
export class KcPhoto implements OnChanges, OnDestroy {
  readonly kcPhoto = input.required<string>();
  /** Largeur de sortie (miniatures). */
  readonly kcWidth = input<number>();

  private readonly img = inject<ElementRef<HTMLImageElement>>(ElementRef).nativeElement;
  private readonly cleaner = inject(PhotoCleanerService);
  private observer?: IntersectionObserver;
  private token = 0;

  ngOnChanges(): void {
    const token = ++this.token;
    this.observer?.disconnect();
    if (!this.kcPhoto()) return;
    if (typeof IntersectionObserver === 'undefined') {
      void this.load(token);
      return;
    }
    this.observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        this.observer?.disconnect();
        void this.load(token);
      },
      { rootMargin: '300px' }
    );
    this.observer.observe(this.img);
  }

  private async load(token: number): Promise<void> {
    const url = this.kcPhoto();
    try {
      const cleaned = await this.cleaner.clean(url, this.kcWidth());
      if (token !== this.token) return;
      this.img.src = cleaned;
      this.img.parentElement?.classList.remove('wm-fallback');
    } catch {
      if (token !== this.token) return;
      this.img.src = url;
      this.img.parentElement?.classList.add('wm-fallback');
    }
  }

  ngOnDestroy(): void {
    this.token++;
    this.observer?.disconnect();
  }
}
