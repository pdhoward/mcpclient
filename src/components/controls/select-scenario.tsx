"use client";

import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslations } from "@/contexts/translations-context";
import { Label } from "@/components/ui/label";
// Agent configs
import { allAgentSets, defaultAgentSetKey } from "@/config/agents";

interface SelectorProps {
    value: string;
    onValueChange: (value: string) => void;
    options?: { label: string; value: string }[];
    label?: string;
  }
  

export function ScenarioSelector({ value, onValueChange }: SelectorProps) {
  const { t } = useTranslations();
  return (
    <div className="form-group space-y-1.5 sm:space-y-2">
      <Label 
        htmlFor="scenarioSelect" 
        className="text-xs sm:text-sm font-medium text-foreground/90"
      >
        {t('scenario.select')}
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger 
          className="w-full h-8 sm:h-10 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
        >
          <SelectValue placeholder={t('scenario.select')} />
        </SelectTrigger>
        <SelectContent 
          className="min-w-[180px] sm:min-w-[240px]"
          position="popper"
          sideOffset={4}
          align="start"
        >
          {Object.keys(allAgentSets).map((agentKey) => (
            <SelectItem 
              key={agentKey} 
              value={agentKey}
              className="text-xs sm:text-sm py-1.5 sm:py-2"
            >
              {agentKey}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}