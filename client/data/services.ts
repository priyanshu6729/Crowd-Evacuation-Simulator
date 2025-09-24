export interface Service {
  name: string;
  type: "police" | "fire" | "hospital";
  phone: string;
  lat: number;
  lng: number;
}

export function haversine(a: [number, number], b: [number, number]) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const services: Service[] = [
  { name: "Hazratganj Police Station", type: "police", phone: "112", lat: 26.8537, lng: 80.9458 },
  { name: "Alambagh Police Station", type: "police", phone: "112", lat: 26.8151, lng: 80.8934 },
  { name: "Gomti Nagar Police Station", type: "police", phone: "112", lat: 26.8678, lng: 81.0227 },
  { name: "Charbagh Fire Station", type: "fire", phone: "101", lat: 26.8309, lng: 80.9214 },
  { name: "Gomti Nagar Fire Station", type: "fire", phone: "101", lat: 26.8624, lng: 81.0232 },
  { name: "Civil Hospital (Hazratganj)", type: "hospital", phone: "108", lat: 26.8615, lng: 80.9436 },
  { name: "KGMU Trauma Center", type: "hospital", phone: "108", lat: 26.8787, lng: 80.918 },
  { name: "SGPGI Hospital", type: "hospital", phone: "108", lat: 26.7489, lng: 80.9433 },
];

export function nearestServices(origin: [number, number], count = 5) {
  return [...services]
    .map((s) => ({ s, d: haversine(origin, [s.lat, s.lng]) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, count)
    .map((x) => x.s);
}

export default services;
