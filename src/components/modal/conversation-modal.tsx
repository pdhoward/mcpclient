"use client"
import { useEffect, useRef } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  getMessageStatus,
  getMessageText,
 } from "@/lib/utils"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Message, MessageStatus } from "@/lib/types";

interface ConversationModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  conversation: Message[]
}

export function ConversationModal({ isOpen, onOpenChange, conversation }: ConversationModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      // Scroll to bottom smoothly when the modal opens
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [isOpen]);
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Conversation History</DialogTitle>
        </DialogHeader>       
          {/* Outer div must allow horizontal overflow */}
          <div className="relative w-full p-4">   
          <ScrollArea className="flex-1 rounded-md border h-[400px] ref={scrollRef}">        
              <Table className="min-w-[900px] w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Role</TableHead>
                    <TableHead className="w-[400px]">Text</TableHead>
                    <TableHead className="w-[120px]">Time</TableHead>
                    <TableHead className="w-[100px]">Final</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>                
                  {conversation
                    .filter((entry) => entry.role === "user" || entry.role === "assistant")
                    .map((entry) => {
                      const text = getMessageText(entry);
                      const status = getMessageStatus(entry);
                      const formattedTimestamp = entry.timestamp
                        ? new Date(entry.timestamp).toLocaleTimeString("en-US", { hour12: false })
                        : "N/A";
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium whitespace-nowrap">{entry.role}</TableCell>
                          <TableCell className="w-[400px] break-words">{text}</TableCell>
                          <TableCell className="whitespace-nowrap">{formattedTimestamp}</TableCell>
                          <TableCell className="whitespace-nowrap">{status}</TableCell>
                        </TableRow>
                      );
                    })}
                 
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>        
       
      </DialogContent>
    </Dialog>
  )
}