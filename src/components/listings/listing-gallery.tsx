"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon, X } from "lucide-react";

export type GalleryImage = { id: string; url: string; alt: string };

export function ListingGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const count = images.length;
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const thumbs = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const touchX = useRef<number | null>(null);

  const goTo = useCallback((next: number) => {
    if (!count) return;
    const i = (next + count) % count;
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    setIndex(i);
  }, [count]);

  const step = useCallback((delta: number) => {
    setIndex((current) => (current + delta + count) % count);
  }, [count]);

  function onScroll() {
    const el = track.current;
    if (!el || !el.clientWidth) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i >= 0 && i < count) setIndex(i);
  }

  useEffect(() => {
    const strip = thumbs.current;
    const active = strip?.children[index] as HTMLElement | undefined;
    if (strip && active) strip.scrollTo({ left: active.offsetLeft - strip.clientWidth / 2 + active.clientWidth / 2, behavior: "smooth" });
  }, [index]);

  useEffect(() => {
    if (!open) {
      const el = track.current;
      if (el && el.clientWidth) el.scrollTo({ left: index * el.clientWidth });
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "ArrowRight") step(1);
    }
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  if (!count) {
    return (
      <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-[16px] bg-[#DDEBE3] text-[#6B7B72] sm:aspect-[16/9]">
        <ImageIcon className="h-9 w-9" aria-hidden="true" />
        <span className="text-[10px] font-extrabold uppercase tracking-[.1em]">No approved photo yet</span>
      </div>
    );
  }

  const arrow = "absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-white";

  return (
    <div>
      <div className="relative overflow-hidden rounded-[16px] bg-[#04180C]" role="region" aria-roledescription="carousel" aria-label={title + " photos"}>
        <div ref={track} onScroll={onScroll} className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((image, i) => (
            <button key={image.id} type="button" onClick={() => setOpen(true)} aria-label={"View photo " + (i + 1) + " of " + count + " full screen"} className="aspect-[4/3] w-full shrink-0 snap-center cursor-zoom-in sm:aspect-[16/10]">
              <img src={image.url} alt={image.alt} loading={i === 0 ? "eager" : "lazy"} draggable={false} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
        {count > 1 && (
          <>
            <button type="button" onClick={() => goTo(index - 1)} aria-label="Previous photo" className={arrow + " left-3 hidden sm:flex"}><ChevronLeft className="h-5 w-5" /></button>
            <button type="button" onClick={() => goTo(index + 1)} aria-label="Next photo" className={arrow + " right-3 hidden sm:flex"}><ChevronRight className="h-5 w-5" /></button>
          </>
        )}
        <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/65 px-3 py-1 text-[11px] font-bold text-white" aria-live="polite">{index + 1} / {count}</span>
      </div>

      {count > 1 && (
        <div ref={thumbs} className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((image, i) => (
            <button key={image.id} type="button" onClick={() => goTo(i)} aria-label={"Show photo " + (i + 1) + " of " + count} aria-current={i === index ? "true" : undefined} className={"h-14 w-20 shrink-0 overflow-hidden rounded-[9px] border-2 transition sm:h-16 sm:w-24 " + (i === index ? "border-[#006B1D]" : "border-transparent opacity-70 hover:opacity-100")}>
              <img src={image.url} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {open && (
        <div role="dialog" aria-modal="true" aria-label={title + " photos"} className="fixed inset-0 z-[100] flex flex-col bg-black/95"
          onTouchStart={(event) => { touchX.current = event.touches[0]?.clientX ?? null; }}
          onTouchEnd={(event) => {
            const start = touchX.current; touchX.current = null;
            const end = event.changedTouches[0]?.clientX;
            if (start === null || end === undefined || count < 2) return;
            if (end - start > 50) step(-1);
            if (start - end > 50) step(1);
          }}>
          <div className="flex items-center justify-between p-4 text-white">
            <span className="text-[13px] font-bold">{index + 1} / {count}</span>
            <button ref={closeButton} type="button" onClick={() => setOpen(false)} aria-label="Close photo viewer" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"><X className="h-5 w-5" /></button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-6">
            <img src={images[index].url} alt={images[index].alt} className="max-h-full max-w-full object-contain" />
            {count > 1 && (
              <>
                <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className={arrow + " left-3"}><ChevronLeft className="h-5 w-5" /></button>
                <button type="button" onClick={() => step(1)} aria-label="Next photo" className={arrow + " right-3"}><ChevronRight className="h-5 w-5" /></button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
