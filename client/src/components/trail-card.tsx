import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trail } from "@shared/schema";
import { MapPin, Clock, Ruler, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface TrailCardProps {
  trail: Trail;
  onClick: () => void;
  onEditClick?: () => void;
}

export function TrailCard({ trail, onClick, onEditClick }: TrailCardProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <button 
            onClick={onClick} 
            className="text-left hover:text-primary cursor-pointer"
          >
            {trail.name}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-normal px-2 py-1 bg-primary/10 rounded-full">
              {trail.difficulty}
            </span>
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditClick?.();
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
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