import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import { NavHeader } from "@/components/nav-header";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import TrailDetails from "@/pages/trail-details";
import ProfilePage from "@/pages/profile-page";
import AdminPage from "@/pages/admin-page";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <NavHeader currentPath={location} />
      <main className="container mx-auto px-4 py-8">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/auth">
            {() => <AuthPage returnTo={location} />}
          </Route>
          <ProtectedRoute path="/profile" component={ProfilePage} />
          <ProtectedRoute path="/admin" component={AdminPage} roles={["admin"]} />
          <ProtectedRoute path="/trail/:id" component={TrailDetails} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;