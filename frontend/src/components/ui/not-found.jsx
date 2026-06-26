import * as React from "react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

function Antenna() {
  return (
    <div aria-hidden="true" className="relative flex h-14 w-24 items-end justify-center">
      <div className="absolute bottom-0 left-1/2 h-9 w-0.5 -translate-x-1/2 rounded-full bg-muted-foreground/40" />
      <div
        className="absolute bottom-7 left-1/2 h-0.5 w-10 origin-left rounded-full bg-muted-foreground/40"
        style={{ transform: "rotate(-40deg)" }}
      />
      <div
        className="absolute bottom-7 h-0.5 w-10 origin-left rounded-full bg-muted-foreground/40"
        style={{ left: "calc(50% - 2px)", transform: "rotate(-8deg) scaleX(-1)" }}
      />
      <div
        className="absolute h-2 w-2 rounded-full border border-border bg-muted"
        style={{ bottom: "52px", left: "calc(50% - 36px)" }}
      />
      <div
        className="absolute h-2 w-2 rounded-full border border-border bg-muted"
        style={{ bottom: "46px", left: "calc(50% + 26px)" }}
      />
    </div>
  );
}

function StaticCanvas({ opacity = 0.18 }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let mounted = true;

    const draw = () => {
      if (!mounted) return;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      if (w === 0 || h === 0) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      const img = ctx.createImageData(w, h);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v =
          Math.random() > 0.5
            ? Math.floor(Math.random() * 80 + 60)
            : Math.floor(Math.random() * 20);
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = Math.floor(Math.random() * 80 + 30);
      }
      ctx.putImageData(img, 0, 0);
      rafRef.current = requestAnimationFrame(draw);
    };

    draw();

    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(rafRef.current);
      else draw();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      mounted = false;
      cancelAnimationFrame(rafRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ opacity, display: "block" }}
      aria-hidden="true"
    />
  );
}

function TV({ staticOpacity }) {
  return (
    <div
      role="img"
      aria-label="Retro television displaying a 404 no-signal screen"
      className={cn(
        "flex w-80 items-center gap-4 rounded-2xl p-4",
        "border border-border bg-card/80",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_20px_60px_-12px_rgba(0,0,0,0.9)]",
        "backdrop-blur-sm"
      )}
    >
      <div className="relative flex h-36 flex-1 items-center justify-center overflow-hidden rounded-xl border border-border bg-background">
        <StaticCanvas opacity={staticOpacity} />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              "repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 rounded-xl"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)",
          }}
        />
        <div className="relative z-20 flex flex-col items-center gap-1.5">
          <span
            className={cn(
              "font-mono text-4xl font-bold tracking-widest text-foreground",
              "drop-shadow-[0_0_20px_hsl(var(--primary)/0.6)]"
            )}
          >
            404
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground"
            />
            no signal
          </span>
        </div>
      </div>
      <div aria-hidden="true" className="flex flex-col items-center gap-3">
        {[0, 1].map((i) => (
          <div
            key={i}
            className={cn(
              "relative h-7 w-7 rounded-full",
              "border border-border bg-muted",
              "shadow-[inset_0_1px_2px_rgba(255,255,255,0.06),0_1px_3px_rgba(0,0,0,0.5)]"
            )}
          >
            <div className="absolute left-1/2 top-1 h-2 w-0.5 -translate-x-1/2 rounded-full bg-muted-foreground/60" />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-1.5 w-1.5 rounded-full bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}

function TVLegs() {
  return (
    <div aria-hidden="true" className="flex w-72 justify-between px-8">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="h-4 w-3.5 rounded-b-md border border-t-0 border-border bg-card"
        />
      ))}
    </div>
  );
}

function HomeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

export function NotFound({
  title = "Page not found",
  description = "This channel isn't broadcasting. The page you're looking for may have moved or no longer exists.",
  primaryLabel = "Go home",
  primaryHref = "/",
  secondaryLabel = "Go back",
  onSecondaryClick,
  className,
  staticOpacity = 0.18,
}) {
  const handleSecondary = () => {
    if (onSecondaryClick) {
      onSecondaryClick();
    } else if (typeof window !== "undefined") {
      window.history.back();
    }
  };

  return (
    <section
      className={cn(
        "relative flex min-h-[520px] w-full flex-col items-center justify-center overflow-hidden",
        "bg-background px-4 py-16",
        className
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, hsl(var(--primary)/0.08) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex select-none items-center justify-center"
      >
        <span
          className="text-[220px] font-black leading-none tracking-tighter text-foreground/[0.025]"
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          404
        </span>
      </div>
      <div className="relative z-10 flex flex-col items-center">
        <Antenna />
        <TV staticOpacity={staticOpacity} />
        <TVLegs />
      </div>
      <div className="relative z-10 mt-10 flex flex-col items-center gap-2 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <a
            href={primaryHref}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-5 py-2.5",
              "text-sm font-medium text-primary-foreground",
              "bg-primary hover:bg-primary/90",
              "border border-primary/50",
              "shadow-[0_0_20px_-4px_hsl(var(--primary)/0.5)]",
              "transition-all duration-200 hover:shadow-[0_0_28px_-4px_hsl(var(--primary)/0.7)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            )}
          >
            <HomeIcon />
            {primaryLabel}
          </a>
          <button
            onClick={handleSecondary}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-5 py-2.5",
              "text-sm font-medium text-muted-foreground hover:text-foreground",
              "border border-border bg-transparent hover:bg-accent",
              "transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            )}
          >
            <ArrowLeftIcon />
            {secondaryLabel}
          </button>
        </div>
      </div>
    </section>
  );
}

export default NotFound;
