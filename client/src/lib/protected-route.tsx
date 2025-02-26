import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, useLocation } from "wouter";

interface ProtectedRouteProps {
  path: string;
  component: () => React.JSX.Element;
  roles?: string[];
}

export function ProtectedRoute({
  path,
  component: Component,
  roles,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  console.log('Protected Route:', { path, isLoading, user, currentLocation: location });

  return (
    <Route path={path}>
      {(params) => {
        console.log('Route Params:', params);

        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-[50vh]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }

        if (!user) {
          const returnPath = encodeURIComponent(location);
          return <Redirect to={`/auth?returnTo=${returnPath}`} />;
        }

        if (roles && !roles.includes(user.role)) {
          return <Redirect to="/" />;
        }

        return <Component />;
      }}
    </Route>
  );
}