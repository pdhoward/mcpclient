"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"

interface TextInputProps {
  value: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function TextInput({ value, onChange, onSubmit, disabled = false }: TextInputProps) {
 
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      console.log(`----- inside of TextInput, submitting: -----`, value);
      onSubmit(); // Calls `handleSendTextMessage`
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full gap-1.5 sm:gap-2">
      <Input
        type="text"
        placeholder="Type a message..."
        value={value}
        onChange={(e) => onChange(e.target.value)} // Updating parent state
        disabled={disabled}
        className="flex-1 h-8 sm:h-10 text-xs sm:text-sm px-2.5 sm:px-3"
      />
      <Button 
        type="submit" 
        disabled={disabled || !value.trim()}
        size="icon"
        className="h-8 w-8 sm:h-10 sm:w-10"
      >
        <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </Button>
    </form>
  );
}
