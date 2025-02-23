import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trail } from "@shared/schema";
import { MapPin, Clock, Ruler, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface TrailCardProps {
  trail: Trail;
  onSelect?: (trail: Trail) => void;
  selected?: boolean;
}

export function TrailCard({ trail, onSelect, selected }: TrailCardProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const handleClick = () => {
    if (onSelect) {
      onSelect(trail);
    }
  };

  return (
    <Card 
      className={`hover:shadow-lg transition-shadow cursor-pointer ${selected ? 'ring-2 ring-primary' : ''}`}
      onClick={handleClick}
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{trail.name}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-normal px-2 py-1 bg-primary/10 rounded-full">
              {trail.difficulty}
            </span>
            {isAdmin && (
              <Link href={`/trail/${trail.id}`}>
                <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                  <Edit className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
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
}