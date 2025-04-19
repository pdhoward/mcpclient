import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { useTranslations } from "@/contexts/translations-context"
import { Message } from "@/lib/types"

interface TokenUsageDisplayProps {
  messages: Message[]
}

export function TokenUsageDisplay({ messages }: TokenUsageDisplayProps) {
  const { t } = useTranslations();
  return (
    <>
      {messages.length > 0 && (
        <Accordion type="single" collapsible key="token-usage" className="w-full">
          <AccordionItem value="token-usage">
            <AccordionTrigger className="py-2 sm:py-3">
              <CardTitle className="text-xs sm:text-sm font-medium">
                {t('tokenUsage.usage')}
              </CardTitle>
            </AccordionTrigger>
            <AccordionContent>
              <Card className="border-0 sm:border">
                <CardContent className="p-2 sm:p-4">
                  <div className="space-y-1 mt-2 sm:mt-4">
                    {messages
                      .filter((msg) => msg.type === 'response.done')
                      .slice(-1)
                      .map((msg) => {
                        const tokenData = [
                          { label: t('tokenUsage.total'), value: msg.response?.usage?.total_tokens },
                          { label: t('tokenUsage.input'), value: msg.response?.usage?.input_tokens },
                          { label: t('tokenUsage.output'), value: msg.response?.usage?.output_tokens }
                        ];

                        return (
                          <Table key="token-usage-table" className="text-xs sm:text-sm">
                            <TableBody>
                              {tokenData.map(({label, value}) => (
                                <TableRow key={label}>
                                  <TableCell className="py-2 sm:py-3 px-2 sm:px-4 font-medium motion-preset-focus">
                                    {label}
                                  </TableCell>
                                  <TableCell className="py-2 sm:py-3 px-2 sm:px-4">
                                    {value}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </>
  );
} 