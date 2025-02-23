import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { MapView } from "@/components/map-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trail } from "@shared/schema";
import { Loader2 } from "lucide-react";

export default function TrailDetails() {
  const { id } = useParams();

  const { data: trail, isLoading } = useQuery<Trail>({
    queryKey: [`/api/trails/${id}`],
  });

  const { data: aiDescription, isLoading: isLoadingAI } = useQuery<{
    description: string;
  }>({
    queryKey: [`/api/trails/${id}/ai-description`],
    enabled: !!trail,
  });

  const { data: gearList, isLoading: isLoadingGear } = useQuery<{
    gearList: string[];
  }>({
    queryKey: [`/api/trails/${id}/gear`],
    enabled: !!trail,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!trail) {
    return <div>Trail not found</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-foreground mb-4">{trail.name}</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold mb-2">Details</h2>
                    <p>Location: {trail.location}</p>
                    <p>Distance: {trail.distance}</p>
                    <p>Duration: {trail.duration}</p>
                    <p>Difficulty: {trail.difficulty}</p>
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold mb-2">Description</h2>
                    {isLoadingAI ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <p>{aiDescription?.description}</p>
                    )}
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold mb-2">
                      Recommended Gear
                    </h2>
                    {isLoadingGear ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <ul className="list-disc list-inside">
                        {gearList?.gearList.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <Button className="w-full">Download GPX</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="h-[600px]">
            <MapView trails={[trail]} centered />
          </div>
        </div>
      </main>
    </div>
  );
}
