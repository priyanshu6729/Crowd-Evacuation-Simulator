import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L, { LatLng, LatLngExpression, LeafletMouseEvent } from "leaflet";
import HeatmapLayer, { type HeatPoint } from "@/components/map/HeatmapLayer";

// Fix default marker icons (Vite + Leaflet)
// @ts-expect-error - accessing undocumented property to set icon paths at runtime
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapClicks({
  onPick,
  onContext,
}: {
  onPick: (latlng: LatLng) => void;
  onContext: (latlng: LatLng) => void;
}) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      onPick(e.latlng);
    },
    contextmenu(e: LeafletMouseEvent) {
      onContext(e.latlng);
    },
  });
  return null;
}

export default function Index() {
  // Map and routing state
  const [start, setStart] = useState<LatLng | null>(null);
  const [end, setEnd] = useState<LatLng | null>(null);
  const [route, setRoute] = useState<LatLngExpression[]>([]);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [picking, setPicking] = useState<"start" | "end">("start");
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Heatmap & alerts
  const [heatEnabled, setHeatEnabled] = useState(true);
  const [heatPoints, setHeatPoints] = useState<HeatPoint[]>([
    { lat: 28.6139, lng: 77.209, intensity: 0.6 },
    { lat: 28.61, lng: 77.205, intensity: 0.5 },
    { lat: 28.617, lng: 77.215, intensity: 0.7 },
  ]);

  // Blockage reporting
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMsg, setReportMsg] = useState("");
  const [reportImage, setReportImage] = useState<string | null>(null);
  const lastPickRef = useRef<LatLng | null>(null);

  // Emergency contact
  const [contactOpen, setContactOpen] = useState(false);

  const center = useMemo<LatLng>(() => new L.LatLng(28.6139, 77.209), []); // New Delhi default

  const canRoute = start && end;

  const handlePick = (latlng: LatLng) => {
    lastPickRef.current = latlng;
    if (picking === "start") setStart(latlng);
    else setEnd(latlng);
  };
  const handleContext = (latlng: LatLng) => {
    // Right-click to quickly report a blockage at a location
    lastPickRef.current = latlng;
    setReportOpen(true);
  };

  const resetRoute = () => {
    setStart(null);
    setEnd(null);
    setRoute([]);
    setDistanceKm(null);
    setDurationMin(null);
    setPicking("start");
  };

  const routeWithOSRM = async () => {
    if (!start || !end) return;
    setLoadingRoute(true);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      const coords: [number, number][] = data.routes?.[0]?.geometry?.coordinates ?? [];
      const latlngs: LatLngExpression[] = coords.map(([lng, lat]) => [lat, lng]);
      setRoute(latlngs);
      if (data.routes?.[0]) {
        setDistanceKm(Math.round((data.routes[0].distance / 1000) * 10) / 10);
        setDurationMin(Math.round(data.routes[0].duration / 60));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRoute(false);
    }
  };

  const handleReportSubmit = () => {
    const at = lastPickRef.current ?? start ?? center;
    setHeatPoints((p) => [{ lat: at.lat, lng: at.lng, intensity: 0.9 } as HeatPoint, ...p]);
    setReportOpen(false);
    setReportMsg("");
    setReportImage(null);
  };

  const onImageChange: React.ChangeEventHandler<HTMLInputElement> = async (
    e,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setReportImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const shareLocation = async () => {
    const pos = await new Promise<GeolocationPosition | null>((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (ok) => resolve(ok),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000 },
      );
    });
    const lat = pos?.coords.latitude ?? center.lat;
    const lng = pos?.coords.longitude ?? center.lng;
    const link = `https://maps.google.com/?q=${lat},${lng}`;
    const txt = `Emergency: assistance requested at ${lat.toFixed(5)}, ${lng.toFixed(5)}. ${link}`;
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({ title: "Emergency location", text: txt, url: link });
        return;
      } catch {}
    }
    window.location.href = `mailto:?subject=Emergency location&body=${encodeURIComponent(txt)}`;
  };

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(1200px_600px_at_10%_-10%,theme(colors.cyan.500/30),transparent_60%),radial-gradient(800px_400px_at_90%_10%,theme(colors.blue.600/30),transparent_60%)]" />
        <div className="container py-16 md:py-24">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <h1 className="text-balance bg-gradient-to-br from-cyan-600 to-blue-700 bg-clip-text text-4xl font-extrabold leading-tight text-transparent md:text-6xl">
                MODEL PEOPLE MOVEMENT
              </h1>
              <p className="mt-4 max-w-prose text-muted-foreground">
                Efficient city planning reduces strain on resources. During emergencies, evacuation and
                crowd flow become critical. Plan contingencies in advance to avoid last-minute hassle.
                Design movement routes to predict and mitigate foreseeable challenges.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button className="bg-gradient-to-r from-cyan-600 to-blue-600" asChild>
                  <a href="/map">Open Live Map</a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="#alerts">Report Blockage</a>
                </Button>
                <Button variant="ghost" onClick={() => setContactOpen(true)}>
                  Contact Rescue
                </Button>
              </div>
              {distanceKm !== null && (
                <div className="mt-6 text-sm text-muted-foreground">
                  Current route: {distanceKm} km · ~{durationMin} min
                </div>
              )}
            </div>
            <div className="rounded-xl border bg-card p-2 shadow-sm">
              <div className="aspect-[16/10] overflow-hidden rounded-lg">
                <MapContainer id="map" center={center} zoom={13} className="h-full w-full" scrollWheelZoom>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapClicks onPick={handlePick} onContext={handleContext} />
                  {start && <Marker position={start} />} 
                  {end && <Marker position={end} />} 
                  {route.length > 0 && (
                    <Polyline positions={route} pathOptions={{ color: "#0891b2", weight: 5 }} />
                  )}
                  <HeatmapLayer points={heatPoints} enabled={heatEnabled} />
                </MapContainer>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Controls under map */}
      <section id="map" className="border-t bg-muted/30 py-6">
        <div className="container grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Evacuation Planner</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Start</div>
                  <div className="font-medium">
                    {start ? `${start.lat.toFixed(5)}, ${start.lng.toFixed(5)}` : "Click map"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">End</div>
                  <div className="font-medium">
                    {end ? `${end.lat.toFixed(5)}, ${end.lng.toFixed(5)}` : "Click map"}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setPicking("start")} variant={picking === "start" ? "default" : "outline"}>
                  Pick Start
                </Button>
                <Button onClick={() => setPicking("end")} variant={picking === "end" ? "default" : "outline"}>
                  Pick End
                </Button>
                <Button disabled={!canRoute || loadingRoute} onClick={routeWithOSRM}>
                  {loadingRoute ? "Calculating..." : "Start Evacuation"}
                </Button>
                <Button variant="ghost" onClick={resetRoute}>
                  Reset
                </Button>
              </div>
              {distanceKm !== null && (
                <div className="rounded-md bg-secondary p-3 text-sm">
                  Best route: <span className="font-semibold">{distanceKm} km</span> · ~
                  <span className="font-semibold">{durationMin} min</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card id="alerts">
            <CardHeader>
              <CardTitle>Report Pathway Blockage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Right-click the map to quickly open this dialog at that location. Add a note and optional photo.
              </p>
              <Dialog open={reportOpen} onOpenChange={setReportOpen}>
                <div className="flex items-center gap-2">
                  <DialogTrigger asChild>
                    <Button>New Report</Button>
                  </DialogTrigger>
                  <Button variant="outline" onClick={() => setReportOpen(true)}>
                    Attach Photo
                  </Button>
                </div>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Report Blockage</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="grid gap-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea id="message" value={reportMsg} onChange={(e) => setReportMsg(e.target.value)} placeholder="Describe the blockage, e.g., fallen tree, flood, crowding..." />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="photo">Photo</Label>
                      <Input id="photo" type="file" accept="image/*" onChange={onImageChange} />
                      {reportImage && (
                        <img src={reportImage} alt="Uploaded" className="mt-2 h-32 w-auto rounded-md object-cover" />
                      )}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setReportOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleReportSubmit}>Submit</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <Card id="hotspots">
            <CardHeader>
              <CardTitle>Heatmap & Hotspots</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Display Heatmap</div>
                  <div className="text-xs text-muted-foreground">Shows areas with high population density or reports</div>
                </div>
                <Switch checked={heatEnabled} onCheckedChange={(v) => setHeatEnabled(!!v)} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    setHeatPoints((p) => [
                      { lat: center.lat + Math.random() * 0.02 - 0.01, lng: center.lng + Math.random() * 0.02 - 0.01, intensity: 0.7 },
                      ...p,
                    ])
                  }
                >
                  Add Hotspot
                </Button>
                <Button variant="ghost" onClick={() => setHeatPoints([])}>
                  Clear Heatmap
                </Button>
                <Button onClick={() => setContactOpen(true)}>Contact Nearby Services</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Contact dialog */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Nearby Emergency Services</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Reach local responders immediately. Your current map center location will be shared.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild className="bg-gradient-to-r from-cyan-600 to-blue-600">
                <a href="tel:112">Call 112</a>
              </Button>
              <Button asChild variant="outline">
                <a href="tel:108">Call Ambulance (108)</a>
              </Button>
              <Button asChild variant="outline">
                <a href="sms:?&body=Emergency%20assistance%20requested">Send SMS</a>
              </Button>
              <Button onClick={shareLocation}>Share My Location</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Info section */}
      <section className="border-t py-12">
        <div className="container grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Plan</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Model evacuation routes proactively. Simulate flows, identify bottlenecks, and reduce last-minute chaos.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Respond</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              During emergencies, compute best paths instantly, broadcast blockages, and guide crowds safely.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Coordinate</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Share live locations and contact nearest rescue teams. Heatmaps reveal hotspot pressure in real time.
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
