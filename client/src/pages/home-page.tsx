import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ViewOnlyMap } from "@/components/view-only-map";
import { SearchBar } from "@/components/search-bar";
import { TrailCard } from "@/components/trail-card";
import { Trail } from "@shared/schema";
import { Loader2, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: trails, isLoading } = useQuery<Trail[]>({
    queryKey: [searchQuery ? `/api/trails/search?q=${searchQuery}` : "/api/trails"],
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const handleTrailClick = (trail: Trail) => {
    setLocation(`/trail/${trail.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-foreground">
            Discover Amazing Trails
          </h1>
          {isAdmin && (
            <Button onClick={() => setLocation("/trail/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Add Trail
            </Button>
          )}
        </div>

        <SearchBar onSearch={setSearchQuery} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <div className="lg:col-span-1 h-[600px]">
            <ViewOnlyMap
              trails={trails || []}
              onTrailClick={handleTrailClick}
            />
          </div>

          <div className="lg:col-span-1 space-y-4 overflow-y-auto max-h-[600px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : trails?.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-lg text-muted-foreground">
                  No trails found. Try a different search term.
                </p>
              </div>
            ) : (
              trails?.map((trail) => (
                <TrailCard
                  key={trail.id}
                  trail={trail}
                  onClick={() => handleTrailClick(trail)}
                />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}