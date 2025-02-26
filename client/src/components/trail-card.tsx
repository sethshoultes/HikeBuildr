import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trail } from "@shared/schema";
import { MapPin, Clock, Ruler } from "lucide-react";

interface TrailCardProps {
  trail: Trail;
  onClick?: (trail: Trail) => void;
}

export function TrailCard({ trail, onClick }: TrailCardProps) {
  const content = (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{trail.name}</span>
          <span className="text-sm font-normal px-2 py-1 bg-primary/10 rounded-full">
            {trail.difficulty}
          </span>
        </CardTitle>
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
        </div>
      </CardContent>
    </Card>
  );

  if (onClick) {
    return <div onClick={() => onClick(trail)}>{content}</div>;
  }

  return (
    <Link href={`/trails/${trail.id}`}>
      {content}
    </Link>
  );
}