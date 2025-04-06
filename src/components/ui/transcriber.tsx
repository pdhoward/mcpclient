"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import ThreeDotsWave from "@/components/ui/three-dots-wave";
import { Message, MessageStatus } from "@/lib/types";
import { useTranslations } from "@/contexts/translations-context";
import { 
  getMessageStatus, 
  getMessageText, 
  isMessageFinal, 
  shouldDisplayMessage 
} from "@/lib/utils";

/**
* Avatar building blocks with Radix
*/
const Avatar = React.forwardRef<
 React.ElementRef<typeof AvatarPrimitive.Root>,
 React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
 <AvatarPrimitive.Root
   ref={ref}
   className={cn(
     "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
     className,
   )}
   {...props}
 />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
 React.ElementRef<typeof AvatarPrimitive.Image>,
 React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
 <AvatarPrimitive.Image
   ref={ref}
   className={cn("aspect-square h-full w-full", className)}
   {...props}
 />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
 React.ElementRef<typeof AvatarPrimitive.Fallback>,
 React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
 <AvatarPrimitive.Fallback
   ref={ref}
   className={cn(
     "flex h-full w-full items-center justify-center rounded-full bg-muted",
     className,
   )}
   {...props}
 />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

/**
* Single conversation item
*/
function ConversationItem({ message }: { message: Message }) {
 const isUser = message.role === "user";
 const isAssistant = message.role === "assistant";
 const text = getMessageText(message);
 const status = getMessageStatus(message);

 return (
  <motion.div
    initial={{ opacity: 0, x: isUser ? 20 : -20, y: 10 }}
    animate={{ opacity: 1, x: 0, y: 0 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
    className={`flex items-start gap-2 sm:gap-3 ${isUser ? "justify-end" : ""}`}
  >
    {/* Assistant Avatar */}
    {isAssistant && (
      <Avatar className="w-6 h-6 sm:w-8 sm:h-8 shrink-0">
        <AvatarFallback className="text-xs sm:text-sm">AI</AvatarFallback>
      </Avatar>
    )}

    {/* Message Bubble */}
    <div
      className={`${
        isUser
          ? "bg-primary text-primary-foreground"
          : "bg-secondary dark:text-foreground"
      } px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg max-w-[75%] sm:max-w-[70%] motion-preset-slide-up-right`}
    >
      {status === "processing" ? (
        <ThreeDotsWave />
      ) : (
        <p className="text-xs sm:text-xs leading-relaxed">{text}</p>
      )}

      {/* Timestamp */}
      <div className="text-[8px] sm:text-[10px] mt-1 sm:mt-1.5 opacity-70">
        {new Date(message.timestamp).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "numeric",
        })}
      </div>
    </div>

    {/* User Avatar */}
    {isUser && (
      <Avatar className="w-6 h-6 sm:w-8 sm:h-8 shrink-0">
        <AvatarFallback className="text-xs sm:text-sm">You</AvatarFallback>
      </Avatar>
    )}
  </motion.div>
);
}

interface TranscriberProps {
 conversation: Message[];
}

export default function Transcriber({ conversation }: TranscriberProps) {
 const scrollRef = React.useRef<HTMLDivElement>(null);
 const { t } = useTranslations();

 // Scroll to bottom whenever conversation updates
 React.useEffect(() => {
   if (scrollRef.current) {
     scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
   }
 }, [conversation]);

 // Filter out messages that we do not want to display
 const displayableMessages = React.useMemo(() => {
   return conversation.filter(shouldDisplayMessage);
 }, [conversation]);

 return (
  <div className="flex flex-col w-full h-full mx-auto bg-background rounded-lg shadow-sm sm:shadow-lg overflow-hidden dark:bg-background">
    {/* Header */}
    <div className="bg-secondary px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between dark:bg-secondary">
      <div className="text-xs sm:text-sm font-medium text-foreground/90 dark:text-foreground">
        {t('transcriber.title')}
      </div>
    </div>

    {/* Body */}
    <div
      ref={scrollRef}
      className="flex-1 h-full overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-4 z-50 scrollbar-thin scrollbar-thumb-primary"
    >
      <AnimatePresence>
        {displayableMessages.map((message) => (
          <ConversationItem 
            key={message.id} 
            message={message}
          />
        ))}
      </AnimatePresence>
    </div>
  </div>
);
}

export { Avatar, AvatarImage, AvatarFallback };