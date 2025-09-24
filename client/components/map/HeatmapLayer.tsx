import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "@/components/map/leaflet-setup";
import "leaflet.heat";

// Accept object or tuple points
export type HeatTuple = [number, number, number?];
export type HeatPoint = { lat: number; lng: number; intensity?: number } | HeatTuple;

type Props = {
  points: HeatPoint[];
  enabled?: boolean;
  radius?: number;
  blur?: number;
  maxZoom?: number;
  gradient?: Record<number, string>;
};

export default function HeatmapLayer({
  points,
  enabled = true,
  radius = 25,
  blur = 15,
  maxZoom = 17,
  gradient = { 0: "#22c55e", 0.5: "#fde047", 1: "#ef4444" },
}: Props) {
  const map = useMap();
  const layerRef = useRef<any>(null);

  const normalize = (p: HeatPoint): [number, number, number] => {
    if (Array.isArray(p)) return [p[0], p[1], p[2] ?? 0.6];
    return [p.lat, p.lng, p.intensity ?? 0.6];
  };

  const build = () =>
    points
      .map(normalize)
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));

  useEffect(() => {
    if (!enabled) {
      if (layerRef.current) {
        try { map.removeLayer(layerRef.current); } catch {}
        layerRef.current = null;
      }
      return;
    }
    if (layerRef.current) {
      try { map.removeLayer(layerRef.current); } catch {}
      layerRef.current = null;
    }
    // @ts-expect-error leaflet.heat augments L at runtime
    layerRef.current = (L as any).heatLayer(build(), { radius, blur, maxZoom, gradient });
    layerRef.current.addTo(map);

    return () => {
      if (layerRef.current) {
        try { map.removeLayer(layerRef.current); } catch {}
        layerRef.current = null;
      }
    };
  }, [enabled, points, radius, blur, maxZoom, gradient, map]);

  return null;
}
