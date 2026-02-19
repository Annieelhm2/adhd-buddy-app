import { Button } from "@/components/ui/button";
import { Rocket } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ActionNudgeBannerProps {
  show: boolean;
  message: string;
  onDismiss: () => void;
  /** Optional extra context line below the message */
  contextLine?: string;
}

export function ActionNudgeBanner({
  show,
  message,
  onDismiss,
  contextLine,
}: ActionNudgeBannerProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          className="overflow-hidden"
        >
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
            <Rocket className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-orange-800">{message}</p>
              {contextLine && (
                <p className="text-xs text-orange-600 mt-1">{contextLine}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-orange-600 hover:text-orange-800 shrink-0 text-xs"
              onClick={onDismiss}
            >
              Got it!
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
