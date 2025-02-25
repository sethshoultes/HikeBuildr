import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import { NavHeader } from "@/components/nav-header";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import TrailDetails from "@/pages/trail-details";
import DashboardPage from "@/pages/dashboard-page";
import NotFound from "@/pages/not-found";
import AdminPage from "@/pages/admin-page"; // Added import
import ProfilePage from "@/pages/profile-page"; // Added import
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <NavHeader currentPath={location} />
      <main>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/auth">
            {() => <AuthPage returnTo={location} />}
          </Route>
          <ProtectedRoute path="/dashboard" component={DashboardPage} />
          <ProtectedRoute path="/trails/:id" component={TrailDetails} />
          <Route path="/admin" component={AdminPage} /> {/* Added route */}
          <Route path="/profile" component={ProfilePage} /> {/* Added route */}
          <Route component={NotFound} />
        </Switch>
      </main>
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;