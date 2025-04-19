export const apiCatalog = [
    {
      id: "api_project_status_chart",
      description: "Show a chart of project status",
      endpoint: "/api/query/mongo/test",
      parameters: {
        query: {
          type: "string",
          description: "The database query to fetch relevant project status statistics."
        },
        viewType: {
          type: "string",
          enum: ["table", "graph"],
          description: "Choose whether to display results as a table or a graph."
        }
      },
      required: ["query", "viewType"],
      event: "openVisualization"
    },
    {
      id: "api_summarize_business_rules",
      description: "Summarize the set of business rules extracted by a program and present in a table",
      endpoint: "/api/query/summarize-business-rules",
      parameters: {
        program: {
          type: "string",
          description: "The name of the COBOL program whose business rules need to be summarized."
        },
        viewType: {
          type: "string",
          enum: ["table"],
          description: "Choose whether to display results as a table."
        }
      },
      required: ["program", "viewType"],
      event: "openVisualization"
    },
    {
      id: "api_refactor_progress",
      description: "Retrieve a count of refactored components and show remaining work",
      endpoint: "/api/query/refactor-progress",
      parameters: {
        projectId: {
          type: "string",
          description: "The unique ID of the project to track refactoring progress."
        },
        viewType: {
          type: "string",
          enum: ["table", "graph"],
          description: "Choose whether to display results as a table or a graph."
        }
      },
      required: ["projectId", "viewType"],
      event: "openVisualization"
    },
    {
      id: "api_mermaid_charts",
      description: "Render architectural diagrams for modernization program",
      endpoint: "/api/query/diagrams/mermaid",
      parameters: {
        diagramName: {
          type: "string",          
          description: "The unique name of the diagram to be displayed."
        }
       },
      required: ["diagram"],
      event: "openVisualization"
    }
  ];
  
  // Convert API catalog to a string for AI prompt ingestion
  export const apiCatalogString = apiCatalog
    .map(
      (api) =>
        `ID: ${api.id}\nDescription: ${api.description}\nEndpoint: ${api.endpoint}\nParameters:\n${Object.entries(api.parameters)
          .map(([key, value]) => `  - ${key}: ${value.description} (Type: ${value.type}${value.enum ? `, Options: ${value.enum.join(", ")}` : ""})`)
          .join("\n")}\nRequired: ${api.required.join(", ")}\nEvent: ${api.event}\n`
    )
    .join("\n---\n");
  