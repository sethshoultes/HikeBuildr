import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Trail } from "@shared/schema";

interface AITrailSuggestionModalProps {
  onSuggestionApply: (suggestion: Partial<Trail>) => void;
}

export function AITrailSuggestionModal({ onSuggestionApply }: AITrailSuggestionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [location, setLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
    try {
      const response = await apiRequest("POST", "/api/trails/ai-suggest", { location });
      const suggestion = await response.json();

      if (!response.ok) {
        throw new Error(suggestion.message || "Failed to generate suggestion");
      }

      // Map the AI response to our form fields
      const formattedSuggestion: Partial<Trail> = {
        name: suggestion.name || suggestion.trailName || suggestion.trail_name,
        description: suggestion.description || suggestion.trail_description,
        difficulty: suggestion.difficulty || suggestion.difficulty_level,
        distance: suggestion.distance || suggestion.trail_distance,
        elevation: suggestion.elevation || suggestion.elevation_gain,
        duration: suggestion.duration || suggestion.estimated_duration,
        location: location,
        bestSeason: suggestion.bestSeason || suggestion.best_season,
        parkingInfo: suggestion.parkingInfo || suggestion.parking_information,
      };

      onSuggestionApply(formattedSuggestion);
      setIsOpen(false);
      toast({
        title: "Suggestion generated",
        description: "AI has generated trail suggestions based on the location.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate suggestion",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          🤖 Generate Trail with AI
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Trail Suggestion</DialogTitle>
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
              "Generate Suggestion"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}