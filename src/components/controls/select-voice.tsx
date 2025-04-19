import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslations } from "@/contexts/translations-context"
import { Label } from "@/components/ui/label"

interface VoiceSelectorProps {
  value: string
  onValueChange: (value: string) => void
}

export function VoiceSelector({ value, onValueChange }: VoiceSelectorProps) {
  const { t } = useTranslations()
  return (
    <div className="form-group space-y-1.5 sm:space-y-2">
      <Label 
        htmlFor="voiceSelect"
        className="text-xs sm:text-sm font-medium text-foreground/90"
      >
        {t('voice.select')}
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger 
          className="w-full h-9 sm:h-10 text-xs sm:text-sm px-3 py-1.5 sm:py-2"
        >
          <SelectValue className="text-xs sm:text-sm" placeholder={t('voice.select')} />
        </SelectTrigger>
        <SelectContent 
          className="min-w-[200px] sm:min-w-[240px]"
          position="popper"
          sideOffset={4}
          align="start"
        >
          <SelectItem 
            value="ash"
            className="text-xs sm:text-sm py-2 sm:py-2.5"
          >
            {t('voice.ash')}
          </SelectItem>
          <SelectItem 
            value="ballad"
            className="text-xs sm:text-sm py-2 sm:py-2.5"
          >
            {t('voice.ballad')}
          </SelectItem>
          <SelectItem 
            value="coral"
            className="text-xs sm:text-sm py-2 sm:py-2.5"
          >
            {t('voice.coral')}
          </SelectItem>
          <SelectItem 
            value="sage"
            className="text-xs sm:text-sm py-2 sm:py-2.5"
          >
            {t('voice.sage')}
          </SelectItem>
          <SelectItem 
            value="verse"
            className="text-xs sm:text-sm py-2 sm:py-2.5"
          >
            {t('voice.verse')}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
} 