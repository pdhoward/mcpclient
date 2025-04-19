"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table"
import { useTranslations } from "@/contexts/translations-context"


export function ToolsEducation() {
  const { t } = useTranslations();

  const AVAILABLE_TOOLS = [
    {
      name: t('tools.availableTools.copyFn.name'),
      description: t('tools.availableTools.copyFn.description'),
    },
    {
      name: t('tools.availableTools.getTime.name'),
      description: t('tools.availableTools.getTime.description'),
    },
    {
      name: t('tools.availableTools.themeSwitcher.name'),
      description: t('tools.availableTools.themeSwitcher.description'),
    },
    {
      name: t('tools.availableTools.partyMode.name'),
      description: t('tools.availableTools.partyMode.description'),
    },   
    {
      name: t('tools.availableTools.fetchSite.name'),
      description: t('tools.availableTools.fetchSite.description'),
    },
  ] as const;

  return (
    <div className="w-full max-w-lg mt-2 sm:mt-4">
      <Accordion type="single" collapsible>
        <AccordionItem value="tools" className="border-b-0">
          <AccordionTrigger className="py-2 sm:py-3">
            <span className="text-xs sm:text-sm font-medium">
              {t('tools.availableTools.title')}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="rounded-lg border bg-card">
              <Table>
                <TableBody>
                  {AVAILABLE_TOOLS.map((tool) => (
                    <TableRow key={tool.name}>
                      <TableCell className="py-2 sm:py-3 px-2 sm:px-4">
                        <span className="text-xs sm:text-sm font-medium">
                          {tool.name}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 sm:py-3 px-2 sm:px-4">
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {tool.description}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
} 