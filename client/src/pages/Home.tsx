import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BuddyCharacter } from "@/components/BuddyCharacter";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  MessageCircle,
  Sparkles,
  ListTodo,
  Heart,
  Zap,
} from "lucide-react";
import { useEffect } from "react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect authenticated users to tasks
  useEffect(() => {
    if (!loading && isAuthenticated) {
      setLocation("/tasks");
    }
  }, [loading, isAuthenticated, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <BuddyCharacter mood="thinking" size={100} message="Loading..." />
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-background to-teal-50 opacity-80" />

        <div className="relative container mx-auto px-4 pt-12 pb-16 sm:pt-20 sm:pb-24">
          <div className="flex flex-col items-center text-center">
            {/* Buddy character */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <BuddyCharacter mood="waving" size={140} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-6 space-y-4"
            >
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                Meet Your{" "}
                <span className="text-primary">ADHD Buddy</span>
              </h1>
              <p className="text-base sm:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed px-2">
                Your friendly accountability partner that helps you get things done
                — with encouragement, not pressure.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-8"
            >
              <Button
                size="lg"
                className="text-base px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all animate-pulse-glow font-bold"
                onClick={() => {
                  window.location.href = getLoginUrl();
                }}
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Get Started — It's Free
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                Sign in with your account to begin
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-bold">
            Designed for ADHD Brains
          </h2>
          <p className="text-base sm:text-base text-muted-foreground mt-2 max-w-lg mx-auto px-2">
            Every feature is built with understanding and care for how ADHD minds work best.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            {
              icon: <ListTodo className="h-6 w-6" />,
              title: "Smart Task Lists",
              description:
                "Separate 'Must Do' and 'Could Do' lists so you know what matters most. Drag to reorder anytime.",
              color: "text-orange-500 bg-orange-100",
            },
            {
              icon: <Sparkles className="h-6 w-6" />,
              title: "Task Breakdown",
              description:
                "Feeling overwhelmed? Let Buddy break big tasks into small, manageable steps you can actually start.",
              color: "text-purple-500 bg-purple-100",
            },
            {
              icon: <MessageCircle className="h-6 w-6" />,
              title: "Chat with Buddy",
              description:
                "Talk to your ADHD Buddy anytime for motivation, advice, or just to vent. No judgment, ever.",
              color: "text-teal-500 bg-teal-100",
            },
            {
              icon: <CheckCircle2 className="h-6 w-6" />,
              title: "Celebrate Every Win",
              description:
                "Confetti, animations, and encouraging messages for every task you complete — because you deserve it!",
              color: "text-green-500 bg-green-100",
            },
            {
              icon: <Heart className="h-6 w-6" />,
              title: "Gentle Check-Ins",
              description:
                "Your Buddy checks in with encouragement and helps you when you're feeling stuck or tired.",
              color: "text-pink-500 bg-pink-100",
            },
            {
              icon: <Zap className="h-6 w-6" />,
              title: "Built for Focus",
              description:
                "Clean, distraction-free design with warm colors and clear layouts that work with your brain.",
              color: "text-amber-500 bg-amber-100",
            },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              viewport={{ once: true }}
              className="bg-card border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div
                className={`inline-flex p-2.5 rounded-xl ${feature.color} mb-4`}
              >
                {feature.icon}
              </div>
              <h3 className="font-bold text-lg sm:text-base mb-2">{feature.title}</h3>
              <p className="text-base sm:text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-orange-50 to-teal-50 rounded-3xl p-8 sm:p-12 text-center border"
        >
          <BuddyCharacter mood="encouraging" size={80} />
          <h2 className="text-2xl sm:text-3xl font-bold mt-4">
            Ready to Get Things Done?
          </h2>
          <p className="text-base text-muted-foreground mt-2 max-w-md mx-auto">
            Your ADHD Buddy is waiting to help you tackle your day with confidence.
          </p>
          <Button
            size="lg"
            className="mt-6 text-base px-8 py-6 rounded-xl shadow-lg font-bold"
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
          >
            Start Your Journey
          </Button>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-base sm:text-sm text-muted-foreground">
          <p>
            Made with care for ADHD minds everywhere.
          </p>
        </div>
      </footer>
    </div>
  );
}
