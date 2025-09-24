import { useMapEvents } from "react-leaflet";
import type { LatLng } from "leaflet";

export default function MapClickHandlers({
  onPick,
  onContext,
}: {
  onPick?: (latlng: LatLng) => void;
  onContext?: (latlng: LatLng) => void;
}) {
  useMapEvents({
    click: (e) => onPick?.(e.latlng),
    contextmenu: (e) => {
      const ev = e.originalEvent as MouseEvent;
      ev.preventDefault();
      ev.stopPropagation();
      onContext?.(e.latlng);
    },
  });
  return null;
}
