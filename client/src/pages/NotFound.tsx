import { Button } from "@/components/ui/button";
import { BuddyCharacter } from "@/components/BuddyCharacter";
import { Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-orange-50 via-background to-teal-50">
      <div className="flex flex-col items-center gap-6 p-8 max-w-md w-full text-center">
        <BuddyCharacter mood="thinking" size={120} message="Hmm, I can't find that page..." />

        <div className="mt-4">
          <h1 className="text-4xl font-extrabold text-foreground mb-2">404</h1>
          <p className="text-muted-foreground">
            This page seems to have wandered off. Let's get you back on track!
          </p>
        </div>

        <Button
          onClick={() => setLocation("/")}
          size="lg"
          className="rounded-xl font-bold"
        >
          <Home className="w-4 h-4 mr-2" />
          Go Home
        </Button>
      </div>
    </div>
  );
}
