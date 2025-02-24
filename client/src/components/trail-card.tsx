import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trail } from "@shared/schema";
import { MapPin, Clock, Ruler } from "lucide-react";
import { FavoriteButton } from "./favorite-button";

interface TrailCardProps {
  trail: Trail;
}

export function TrailCard({ trail }: TrailCardProps) {
  return (
    <Card className="relative hover:shadow-lg transition-shadow cursor-pointer">
      <Link href={`/trail/${trail.id}`}>
        <CardHeader>
          <CardTitle>{trail.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center text-muted-foreground">
              <MapPin className="h-4 w-4 mr-2" />
              <span>{trail.location}</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              <Ruler className="h-4 w-4 mr-2" />
              <span>{trail.distance}</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              <Clock className="h-4 w-4 mr-2" />
              <span>{trail.duration}</span>
            </div>
            <div className="flex justify-end mt-2">
              <span className="text-sm font-normal px-2 py-1 bg-primary/10 rounded-full">
                {trail.difficulty}
              </span>
            </div>
          </div>
        </CardContent>
      </Link>
      <FavoriteButton trailId={trail.id} variant="icon" />
    </Card>
  );
}