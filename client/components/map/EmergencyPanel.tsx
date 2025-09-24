import { Button } from "@/components/ui/button";
import { nearestServices, haversine } from "@/data/services";

export default function EmergencyPanel({ center }: { center: { lat: number; lng: number } }) {
  const origin: [number, number] = [center.lat, center.lng];
  const list = nearestServices(origin, 5).map((s) => ({
    s,
    d: haversine(origin, [s.lat, s.lng]),
  }));

  const share = async () => {
    const link = `https://maps.google.com/?q=${center.lat},${center.lng}`;
    const txt = `Emergency at ${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}. Need rescue.`;
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({ title: "Emergency", text: txt, url: link });
        return;
      } catch {}
    }
    window.location.href = `mailto:?subject=Emergency&body=${encodeURIComponent(txt + "\n" + link)}`;
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        {list.map(({ s, d }) => (
          <div key={s.name} className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="font-medium">{s.name}</div>
              <div className="text-xs text-muted-foreground capitalize">
                {s.type} · {(d / 1000).toFixed(1)} km
              </div>
            </div>
            <Button asChild><a href={`tel:${s.phone}`}>Call {s.phone}</a></Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" asChild><a href="tel:112">Call 112</a></Button>
        <Button variant="outline" asChild><a href="tel:101">Fire 101</a></Button>
        <Button variant="outline" asChild><a href="tel:108">Ambulance 108</a></Button>
      </div>
      <Button onClick={share} className="w-full">Share My Location</Button>
    </div>
  );
}
