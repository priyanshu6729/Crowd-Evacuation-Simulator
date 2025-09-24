import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function useDarkMode() {
  const [enabled, setEnabled] = useState<boolean>(false);
  useEffect(() => {
    const root = document.documentElement;
    if (enabled) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [enabled]);
  return { enabled, setEnabled };
}

export default function Header() {
  const { enabled, setEnabled } = useDarkMode();
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <a href="#" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-gradient-to-br from-cyan-500 to-blue-600" />
          <span className="text-lg font-extrabold tracking-tight"><a href="/">Crowd Evacuation Simulator</a></span>
        </a>
        <nav className="hidden items-center gap-6 md:flex">
          <a href="/map" className="text-sm text-muted-foreground hover:text-foreground">Live Map</a>
          <a href="/alerts" className="text-sm text-muted-foreground hover:text-foreground">Alerts</a>
          <a href="/hotspots" className="text-sm text-muted-foreground hover:text-foreground">Hotspots</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="hidden md:inline-flex" asChild>
            <a href="/map">Start Evacuation</a>
          </Button>
          <button
            aria-label="Toggle dark mode"
            className={cn(
              "relative inline-flex h-9 w-16 items-center rounded-full border bg-card px-1",
              enabled ? "justify-end" : "justify-start",
            )}
            onClick={() => setEnabled(!enabled)}
          >
            <span className="pointer-events-none inline-block h-7 w-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600" />
          </button>
        </div>
      </div>
    </header>
  );
}
