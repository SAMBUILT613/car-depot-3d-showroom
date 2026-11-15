"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";

export function MobileFilterDrawer({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const dialogId = useId();
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusableSelector = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(focusableSelector);
    firstFocusable?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const elements = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector));
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [open]);

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? dialogId : undefined} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[9px] border border-[#D8D2C6] bg-[#FFFDF8] px-4 text-[11px] font-extrabold text-[#18211F] shadow-sm hover:border-[#176B57]">
        <SlidersHorizontal className="h-4 w-4 text-[#176B57]" /> Filters
      </button>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#18211F]/55 sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section id={dialogId} ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-[20px] border border-[#E5E0D6] bg-[#FFFDF8] shadow-2xl sm:rounded-[18px]">
            <header className="flex shrink-0 items-center justify-between border-b border-[#E5E0D6] px-5 py-4">
              <div><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#176B57]">Search controls</p><h2 id={titleId} className="mt-1 text-[16px] font-extrabold text-[#18211F]">Refine your search</h2></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close filters" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E0D6] text-[#18211F] hover:bg-[#F4F0E8]"><X className="h-4 w-4" /></button>
            </header>
            <div className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5">{children}</div>
          </section>
        </div>
      )}
    </>
  );
}
