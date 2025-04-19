import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTranslations } from "@/contexts/translations-context";

interface BroadcastButtonProps {
  isSessionActive: boolean
  onClick: () => void
}
export function BroadcastButton({ isSessionActive, onClick }: BroadcastButtonProps) {
  const { t } = useTranslations()
  return (
    <Button
      variant={isSessionActive ? "destructive" : "activate"}
      className="w-auto h-8 sm:h-10 px-2 sm:px-4 text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 sm:gap-2 motion-preset-shake"
      onClick={onClick}
    >
      <Badge 
        className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 animate-pulse ${
          isSessionActive 
            ? "bg-red-100 text-red-700" 
            : "bg-green-100 text-green-700"
        }`}
      >
        {isSessionActive ? t("broadcast.live") : t("broadcast.offline")}
      </Badge>
      <span className="hidden sm:inline">
        {isSessionActive ? t("broadcast.end") : t("broadcast.start")}
      </span>
    </Button>
  );
}