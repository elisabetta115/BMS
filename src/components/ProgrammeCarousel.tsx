"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRef } from "react";

export default function ProgrammeCarousel({ children }: { children: React.ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>(".bms-program-card");
    const step = card ? card.offsetWidth + 52 : track.clientWidth * 0.8;
    track.scrollBy({ left: step * direction, behavior: "smooth" });
  };

  return (
    <div className="bms-carousel-wrap">
      <div className="bms-program-carousel" ref={trackRef}>
        {children}
      </div>
      <button
        aria-label="Previous micro-programmes"
        className="bms-carousel-btn bms-carousel-prev"
        onClick={() => scroll(-1)}
        type="button"
      >
        <ArrowLeft aria-hidden="true" size={28} strokeWidth={2.5} />
      </button>
      <button
        aria-label="Next micro-programmes"
        className="bms-carousel-btn bms-carousel-next"
        onClick={() => scroll(1)}
        type="button"
      >
        <ArrowRight aria-hidden="true" size={28} strokeWidth={2.5} />
      </button>
    </div>
  );
}
