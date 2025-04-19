import { AgentConfig } from "@/lib/types";
import { toast } from "sonner"
import FirecrawlApp, { ScrapeResponse } from "@mendable/firecrawl-js";


const fetchSiteAgent: AgentConfig = {
  name: "fetchSiteAgent",
  publicDescription:
    "Scrapes a website and returns its content in markdown and HTML formats.",
  instructions:
    "You are an assistant that fetches website content. When given a URL, invoke the fetchSite tool to scrape the website and retrieve its content. Respond by presenting the scraped content along with a confirmation message.",
  tools: [
    {
      type: "function",
      name: "fetchSite",
      description: "Returns content in markdown and HTML formats for a URL",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The URL to scrape",
          },
        },
        required: ["url"],
        additionalProperties: false,
      },
    },
  ],
  toolLogic: {
    fetchSite: async ({ url }: { url: string }) => {
      const apiKey = process.env.NEXT_PUBLIC_FIRECRAWL_API_KEY;
      try {
        const app = new FirecrawlApp({ apiKey });
        const scrapeResult = (await app.scrapeUrl(url, {
          formats: ["markdown", "html"],
        })) as ScrapeResponse;

        if (!scrapeResult.success) {
          console.log(scrapeResult.error);
          return {
            success: false,
            message: `Failed to scrape: ${scrapeResult.error}`,
          };
        }

        toast.success("tools.fetchSite.toast" + " 📋", {
          description: "tools.fetchSite.success",
        });

        return {
          success: true,
          message:
            "Here is the scraped website content: " +
            JSON.stringify(scrapeResult.markdown) +
            " Let the user know you have successfully fetched the site content and if there are specific questions on the content that you can answer.",
        };
      } catch (error: any) {
        return {
          success: false,
          message: `Error scraping website: ${error.message}`,
        };
      }
    },
  },
};

export default fetchSiteAgent;
