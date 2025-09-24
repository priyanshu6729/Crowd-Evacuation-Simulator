export default function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container flex flex-col items-center justify-between gap-4 py-8 md:h-16 md:flex-row">
        <p className="text-center text-sm text-muted-foreground md:text-left">
          © {new Date().getFullYear()} Crowd Evacuation Simulator. All rights reserved.
        </p>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#map" className="hover:text-foreground">Map</a>
          <a href="#alerts" className="hover:text-foreground">Alerts</a>
          <a href="#hotspots" className="hover:text-foreground">Hotspots</a>
        </nav>
      </div>
    </footer>
  );
}
