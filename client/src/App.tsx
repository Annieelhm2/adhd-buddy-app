import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ActionNudgeProvider } from "./contexts/ActionNudgeContext";
import Home from "./pages/Home";
import Tasks from "./pages/Tasks";
import Chat from "./pages/Chat";
import BrainDump from "./pages/BrainDump";
import Templates from "./pages/Templates";
import DashboardLayout from "./components/DashboardLayout";

function AuthenticatedApp() {
  return (
    <ActionNudgeProvider>
      <DashboardLayout>
        <Switch>
          <Route path="/tasks" component={Tasks} />
          <Route path="/chat" component={Chat} />
          <Route path="/brain-dump" component={BrainDump} />
          <Route path="/templates" component={Templates} />
          <Route component={NotFound} />
        </Switch>
      </DashboardLayout>
    </ActionNudgeProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      {/* Single wrapper for all authenticated routes — keeps ActionNudgeProvider alive across navigation */}
      <Route>
        <AuthenticatedApp />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster
            position="top-center"
            richColors
            closeButton
            toastOptions={{
              className: "font-sans",
            }}
          />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
