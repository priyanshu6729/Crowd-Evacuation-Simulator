import { useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, TileLayer, Circle } from "react-leaflet";
import type { LatLng, LatLngExpression } from "leaflet";
import L from "@/components/map/leaflet-setup";
import HeatmapLayer, { type HeatPoint } from "@/components/map/HeatmapLayer";
import MapClickHandlers from "@/components/map/MapClickHandlers";
import StartEvacuationPanel from "@/components/map/StartEvacuationPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import populationHeat from "@/data/population";
import { toast } from "sonner";

import EmergencyPanel from "@/components/map/EmergencyPanel";

type BlockageType = "Earthquake" | "Crashed building" | "Road accident" | "Fire" | "Flood";
type Severity = "minor" | "major";
type Blockage = { lat: number; lng: number; radius: number; type: BlockageType; severity: Severity };

function generateRegionalHeat(c: { lat: number; lng: number }): HeatPoint[] {
  const pts: HeatPoint[] = [];
  const halfBox = 0.25;
  const step = 0.02;
  for (let lat = c.lat - halfBox; lat <= c.lat + halfBox; lat += step) {
    for (let lng = c.lng - halfBox; lng <= c.lng + halfBox; lng += step) {
      const jitterLat = (Math.random() - 0.5) * step * 0.6;
      const jitterLng = (Math.random() - 0.5) * step * 0.6;
      const intensity = 0.3 + Math.random() * 0.6;
      pts.push({ lat: lat + jitterLat, lng: lng + jitterLng, intensity });
    }
  }
  return pts;
}

function haversine(a: [number, number], b: [number, number]) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function pointToSegmentDistance(p: [number, number], a: [number, number], b: [number, number]) {
  const latm = (lat: number) => ((lat - a[0]) * Math.PI * 6371000) / 180;
  const lngm = (lng: number, latRef: number) => ((lng - a[1]) * Math.PI * 6371000 * Math.cos((latRef * Math.PI) / 180)) / 180;
  const ax = 0, ay = 0;
  const bx = lngm(b[1], (a[0] + b[0]) / 2);
  const by = latm(b[0]);
  const px = lngm(p[1], (a[0] + b[0]) / 2);
  const py = latm(p[0]);
  const vx = bx - ax, vy = by - ay;
  const wx = px - ax, wy = py - ay;
  const c1 = vx * wx + vy * wy;
  const c2 = vx * vx + vy * vy;
  const t = c2 === 0 ? 0 : Math.max(0, Math.min(1, c1 / c2));
  const dx = ax + t * vx - px;
  const dy = ay + t * vy - py;
  return Math.sqrt(dx * dx + dy * dy);
}

function routePassesNearBlocked(coords: [number, number][], blocked: [number, number][], thresholdM = 60) {
  if (!blocked.length || coords.length < 2) return false;
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];
    for (const p of blocked) {
      if (pointToSegmentDistance(p, a, b) <= thresholdM) return true;
    }
  }
  return false;
}

export default function MapPage() {
  const center = useMemo(() => new L.LatLng(26.8467, 80.9462), []);

  // Start/End/Route
  const [start, setStart] = useState<LatLng | null>(null);
  const [end, setEnd] = useState<LatLng | null>(null);
  const [route, setRoute] = useState<LatLngExpression[]>([]);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [picking, setPicking] = useState<"start" | "end" | "blockage">("start");
  const blockageMode = picking === "blockage";
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Heatmap
  const initialHeat = useMemo(() => {
    const base: HeatPoint[] = Array.isArray(populationHeat) ? (populationHeat as HeatPoint[]) : [];
    return [...base, ...generateRegionalHeat(center)];
  }, [center]);
  const [heatEnabled, setHeatEnabled] = useState(true);
  const [heatPoints, setHeatPoints] = useState<HeatPoint[]>(initialHeat);

  // Blockages
  const [blockedPoints, setBlockedPoints] = useState<[number, number][]>([]);
  const [blockedZones, setBlockedZones] = useState<Blockage[]>([]);

  // Emergency dialog
  const [emergencyOpen, setEmergencyOpen] = useState(false);

  // Add blockage immediately (no modal)
  const addBlockage = (lat: number, lng: number) => {
    const radius = 70; // default impact radius
    const type: BlockageType = "Road accident"; // default label
    const severity: Severity = "minor"; // internal use only, no prompt
    setBlockedZones((z) => [{ lat, lng, radius, type, severity }, ...z]);
    setBlockedPoints((b) => [[lat, lng], ...b]);
    // emphasize as hotspot
    setHeatPoints((p) => [{ lat, lng, intensity: 0.9 }, ...p]);
    toast.message("Blockage added");
  };

  const onPick = (latlng: LatLng) => {
    if (picking === "blockage") {
      addBlockage(latlng.lat, latlng.lng);
      return;
    }
    if (picking === "start") setStart(latlng);
    else setEnd(latlng);
  };

  const onContext = (latlng: LatLng) => {
    // Right-click shortcut also adds a blockage
    addBlockage(latlng.lat, latlng.lng);
  };

  const reset = () => {
    setStart(null);
    setEnd(null);
    setRoute([]);
    setDistanceKm(null);
    setDurationMin(null);
    setPicking("start");
  };

  const getCurrent = () =>
    new Promise<GeolocationPosition | null>((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (ok) => resolve(ok),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 6000 }
      );
    });

  const useMyLocationAsStart = async () => {
    const pos = await getCurrent();
    if (!pos) {
      toast.error("Location unavailable");
      return;
    }
    const latlng = new L.LatLng(pos.coords.latitude, pos.coords.longitude);
    setStart(latlng);
  };

  const startEvacuation = async () => {
    if (!start || !end) return;
    setLoadingRoute(true);
    try {
      const base = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}`;
      const url = `${base}?overview=full&geometries=geojson&alternatives=true`;
      const res = await fetch(url);
      const data = await res.json();
      const routes: any[] = data?.routes || [];
      if (!routes.length) {
        toast.error("No route found");
        setRoute([]);
        setDistanceKm(null);
        setDurationMin(null);
        return;
      }

      const candidates = routes
        .map((r) => ({
          route: r,
          meters: r.distance as number,
          coords: (r.geometry.coordinates as [number, number][])
            .map(([lng, lat]) => [lat, lng] as [number, number]),
        }))
        .sort((a, b) => a.meters - b.meters);

      const candidate = candidates.find((r) => !routePassesNearBlocked(r.coords, blockedPoints));
      if (!candidate) {
        toast.error("All routes are blocked nearby. Remove a blockage or adjust points.");
        setRoute([]);
        setDistanceKm(null);
        setDurationMin(null);
        return;
      }

      setRoute(candidate.coords as LatLngExpression[]);
      setDistanceKm(Math.round((candidate.meters / 1000) * 10) / 10);
      setDurationMin(Math.round(((candidate.route.duration as number) / 60) * 10) / 10);
    } catch (e) {
      console.error(e);
      toast.error("Failed to compute route");
    } finally {
      setLoadingRoute(false);
    }
  };

  const startText = start ? `${start.lat.toFixed(5)}, ${start.lng.toFixed(5)}` : "Click map";
  const endText = end ? `${end.lat.toFixed(5)}, ${end.lng.toFixed(5)}` : "Click map";

  return (
    <main className="container py-8">
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <StartEvacuationPanel
            startText={startText}
            endText={endText}
            picking={picking}
            setPicking={setPicking}
            onStart={startEvacuation}
            onReset={reset}
            loading={loadingRoute}
            distanceKm={distanceKm}
            durationMin={durationMin}
            useMyLocationAsStart={useMyLocationAsStart}
          />
          <Card>
            <CardHeader>
              <CardTitle>Map Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                variant={blockageMode ? "default" : "secondary"}
                onClick={() => setPicking(blockageMode ? "start" : "blockage")}
                title="Toggle blockage mode"
              >
                {blockageMode ? "Blockage mode ON" : "Add blockage"}
              </Button>
              <Button variant="secondary" onClick={() => setHeatPoints(generateRegionalHeat(center))}>
                Reseed heat
              </Button>
              <Button variant="secondary" onClick={() => setHeatEnabled((v) => !v)}>
                {heatEnabled ? "Hide Heatmap" : "Show Heatmap"}
              </Button>
              <Button onClick={() => setEmergencyOpen(true)} className="bg-gradient-to-r from-cyan-600 to-blue-600">
                Emergency
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-xl border bg-card p-2 shadow-sm">
          <div className="relative aspect-[16/10] overflow-hidden rounded-lg">
            <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapClickHandlers onPick={onPick} onContext={onContext} />

              {start && <Marker position={start} />}
              {end && <Marker position={end} />}
              {route.length > 1 && <Polyline positions={route} pathOptions={{ color: "#2563eb", weight: 5 }} />}

              <HeatmapLayer points={heatPoints} enabled={heatEnabled} />

              {blockedZones.map((z, i) => (
                <Circle
                  key={i}
                  center={[z.lat, z.lng]}
                  radius={z.radius}
                  pathOptions={{ color: "#f97316", opacity: 0.6 }}
                />
              ))}
            </MapContainer>

            {/* Bottom status bar */}
            <div className="pointer-events-none absolute left-2 bottom-2 z-[1000]">
              <div className="pointer-events-auto rounded-md bg-black/60 text-white text-xs px-3 py-2 backdrop-blur">
                <div>Blockages: {blockedZones.length}</div>
                <div>Heat points: {heatPoints.length}</div>
                <div>Tip: Click while in Blockage mode, or right-click.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Dialog (kept; no blur/focus trap on blockage anymore) */}
      <Dialog open={emergencyOpen} onOpenChange={setEmergencyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Nearby Rescue Teams</DialogTitle>
          </DialogHeader>
          <EmergencyPanel center={{ lat: center.lat, lng: center.lng }} />
        </DialogContent>
      </Dialog>
    </main>
  );
}
