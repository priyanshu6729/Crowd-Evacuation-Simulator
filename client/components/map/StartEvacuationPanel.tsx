import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StartEvacuationPanel({
  startText,
  endText,
  picking,
  setPicking,
  onStart,
  onReset,
  loading,
  distanceKm,
  durationMin,
}: {
  startText: string;
  endText: string;
  picking: "start" | "end";
  setPicking: (p: "start" | "end") => void;
  onStart: () => void;
  onReset: () => void;
  loading: boolean;
  distanceKm: number | null;
  durationMin: number | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Start Evacuation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground">Start</div>
            <div className="font-medium">{startText}</div>
          </div>
          <div>
            <div className="text-muted-foreground">End</div>
            <div className="font-medium">{endText}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setPicking("start")} variant={picking === "start" ? "default" : "outline"}>
            Pick Start
          </Button>
          <Button onClick={() => setPicking("end")} variant={picking === "end" ? "default" : "outline"}>
            Pick End
          </Button>
          <Button onClick={onStart} disabled={loading}>
            {loading ? "Calculating..." : "Start"}
          </Button>
          <Button variant="ghost" onClick={onReset}>
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
  );
}
