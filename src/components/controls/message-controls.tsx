import { useRef, useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import Transcriber from "@/components/ui/transcriber";
import { Message as MessageType, LoggedEvent } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Terminal, History } from "lucide-react";
import { useTranslations } from "@/contexts/translations-context";
import { useEvent } from "@/contexts/EventContext";
import { ConversationModal } from "./modal/conversation-modal";

interface FilterControlsProps { 
  eventFilter: string;
  setEventFilter: (value: string) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void; 
  eventTypes: string[];
}

function FilterControls({ 
  eventFilter,
  setEventFilter,
  searchQuery,
  setSearchQuery, 
  eventTypes,
}: FilterControlsProps) {
  const { t } = useTranslations();

  return (
    <div className="flex flex-wrap gap-4 mb-4">     

      {/* Filter by Event Type */}
      <Select value={eventFilter} onValueChange={setEventFilter}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Filter by Event" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Events</SelectItem>
          {eventTypes.map(event => (
            <SelectItem key={event} value={event}>
              {event}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Search Field */}
      <Input
        placeholder={t("messageControls.search")}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="flex-1"
      />

      <Button variant="outline">
        <Terminal />
        {t("messageControls.log")}
      </Button>
    </div>
  );
}

export function MessageControls({ conversation, msgs }: { conversation: MessageType[], msgs: MessageType[] }) {
  const { t } = useTranslations();
  const { loggedEvents } = useEvent();
  const [isExpanded, setIsExpanded] = useState(false);  
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const eventLogsContainerRef = useRef<HTMLDivElement | null>(null);

  // Extract unique session IDs and event types 
  const eventTypes = useMemo(() => Array.from(new Set(loggedEvents.map(e => e.eventName))), [loggedEvents]);

  // Filter messages based on selected filters
  const filteredMsgs = useMemo(() => {
    return loggedEvents.filter(msg => {     
      const matchesEvent = eventFilter === "all" || msg.eventName === eventFilter;
      const matchesSearch = searchQuery === "" || JSON.stringify(msg).toLowerCase().includes(searchQuery.toLowerCase());

      return matchesEvent && matchesSearch;
    });
  }, [loggedEvents, eventFilter, searchQuery]);

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-xs sm:text-sm font-medium text-foreground/90">
          {t("messageControls.logs")}
        </h3>

        <Dialog modal={false} onOpenChange={setIsExpanded}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm">
              {t("messageControls.view")}
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] sm:w-[90vw] max-w-5xl p-3 sm:p-4 mx-auto">
            <DialogHeader>
              <DialogTitle className="text-sm sm:text-base">
                {t("messageControls.logs")}
              </DialogTitle>
            </DialogHeader>

            {/* Filters */}
            <FilterControls              
              eventFilter={eventFilter}
              setEventFilter={setEventFilter}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}             
              eventTypes={eventTypes}
            />

            {/* Message Table */}
            <div className="mt-3 sm:mt-4">
              <ScrollArea className="h-[60vh] sm:h-[70vh]">
                <Table className="text-xs sm:text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px] sm:w-[150px]">Event Name</TableHead>
                      <TableHead className="w-[120px] sm:w-[150px]">Event</TableHead>                     
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMsgs.map((msg, i) => (
                      <TableRow key={i}>                        
                        <TableCell className="font-medium py-2 sm:py-3">{msg.eventName}</TableCell>
                        <TableCell className="font-mono text-[10px] sm:text-xs whitespace-pre-wrap break-words">
                          {JSON.stringify(msg, null, 2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Conversation Summary */}
      <Transcriber conversation={conversation.slice(-1)} />

      {/* History Button */}
      <div className="w-full flex items-center justify-between px-2">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsModalOpen(true)}>
          <History className="h-5 w-5" />
        </Button>
        <ConversationModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} conversation={conversation} />
      </div>
    </div>
  );
}
