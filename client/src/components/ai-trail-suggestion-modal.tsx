import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { Trail } from "@shared/schema";

interface AITrailSuggestionModalProps {
  onSuggestionApply: (suggestion: Partial<Trail>) => void;
}

interface TrailSuggestion {
  trail_name?: string;
  description?: string;
  distance_miles?: number;
  estimated_duration_hours?: number;
  difficulty_level?: string;
  elevation_gain_feet?: number;
  best_season?: string;
  parking_info?: string;
  starting_coordinates?: string;
}

export function AITrailSuggestionModal({ onSuggestionApply }: AITrailSuggestionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [location, setLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<TrailSuggestion[]>([]);
  const { toast } = useToast();

  const handleGenerateSuggestion = async () => {
    if (!location.trim()) {
      toast({
        title: "Location required",
        description: "Please enter a location to generate trail suggestions.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setSuggestions([]);

    try {
      const response = await apiRequest("POST", "/api/trails/ai-suggest", { location });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to generate suggestions");
      }

      setSuggestions(data.suggestions || []);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate suggestions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSuggestion = (suggestion: TrailSuggestion) => {
    // Get current form values
    const formattedSuggestion: Partial<Trail> = {
      name: suggestion.trail_name || '',
      description: suggestion.description || '',
      difficulty: suggestion.difficulty_level || 'Easy',
      distance: suggestion.distance_miles ? `${suggestion.distance_miles} miles` : '',
      elevation: suggestion.elevation_gain_feet ? `${suggestion.elevation_gain_feet} feet` : '',
      duration: suggestion.estimated_duration_hours ? `${suggestion.estimated_duration_hours} hours` : '',
      location: location,
      bestSeason: suggestion.best_season || '',
      parkingInfo: suggestion.parking_info || '',
      // Map starting_coordinates directly to coordinates field
      coordinates: suggestion.starting_coordinates || '',
    };

    onSuggestionApply(formattedSuggestion);
    setIsOpen(false);
    toast({
      title: "Suggestion applied",
      description: "The selected trail suggestion has been applied to the form.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          🤖 Generate Trail with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Generate Trail Suggestions</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Input
              placeholder="Enter location (e.g., Yosemite Valley, CA)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Enter a location to generate AI suggestions for trail details
            </p>
          </div>
          <Button
            className="w-full"
            onClick={handleGenerateSuggestion}
            disabled={isLoading || !location.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Suggestions"
            )}
          </Button>

          {suggestions.length > 0 && (
            <ScrollArea className="h-[400px] w-full rounded-md border p-4">
              <div className="space-y-4">
                {suggestions.map((suggestion, index) => (
                  <Card
                    key={index}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleSelectSuggestion(suggestion)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {suggestion.trail_name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <p>
                          <strong>Difficulty:</strong>{" "}
                          {suggestion.difficulty_level}
                        </p>
                        <p>
                          <strong>Distance:</strong>{" "}
                          {suggestion.distance_miles} miles
                        </p>
                        <p>
                          <strong>Duration:</strong>{" "}
                          {suggestion.estimated_duration_hours} hours
                        </p>
                        <p className="line-clamp-2">
                          <strong>Description:</strong>{" "}
                          {suggestion.description}
                        </p>
                        {suggestion.starting_coordinates && (
                          <p>
                            <strong>Starting Point:</strong>{" "}
                            {suggestion.starting_coordinates}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}