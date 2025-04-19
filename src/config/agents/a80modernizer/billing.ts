import { AgentConfig } from "@/lib/types";

/**
 * billingProgramAgent
 * Handles analysis, emulation, and data generation for a COBOL program
 * that handles part of the end-to-end billing process.
 */
const billingAgent: AgentConfig = {
  name: "billingAgent",
  publicDescription:
    "Represents the Billing Program from the legacy COBOL system, providing tools for static analysis, workflow diagramming, emulation, and test data generation.",
  instructions:
    "You are the specialized AI agent representing a COBOL Billing Program. "
    + "You have knowledge of the program’s data structures, business rules, and flow. "
    + "Assist engineers by analyzing, emulating, and exposing the program’s logic in a modern, interactive way.",
  tools: [
    {
      type: "function",
      name: "analyzeProgramStructure",
      description:
        "Analyzes the COBOL program for paragraphs, sections, copybooks, data definitions, and business rules.",
      parameters: {
        type: "object",
        properties: {
          cobolSourcePath: {
            type: "string",
            description:
              "Path or identifier for the COBOL source file in the repo.",
          },
        },
        required: ["cobolSourcePath"],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "generateWorkflowDiagram",
      description:
        "Generates a JSON or SVG representation of the internal paragraphs and branching logic for the COBOL program.",
      parameters: {
        type: "object",
        properties: {
          format: {
            type: "string",
            enum: ["json", "svg"],
            description: "Choose the output format of the diagram.",
          },
        },
        required: ["format"],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "emulateProgram",
      description:
        "Mimics the execution of the COBOL program's business rules for a single input record, returning computed results.",
      parameters: {
        type: "object",
        properties: {
          inputRecord: {
            type: "object",
            description:
              "JSON representation of the input record or fields for the billing program. Must align with the program's data structure.",
          },
        },
        required: ["inputRecord"],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "generateTestDataSets",
      description:
        "Generates synthetic data sets that align with the COBOL program's file/record layout.",
      parameters: {
        type: "object",
        properties: {
          recordCount: {
            type: "number",
            description:
              "How many synthetic data records to generate.",
          },
        },
        required: ["recordCount"],
        additionalProperties: false,
      },
    },
  ],
  toolLogic: {
    analyzeProgramStructure: async ({ cobolSourcePath }) => {
      console.log("[toolLogic] analyzeProgramStructure()", cobolSourcePath);
      // Pretend we've called out to a parsing library or external service
      // that scans the COBOL code and returns details.
      return {
        paragraphs: ["INIT-PARA", "CALC-PARA", "FINAL-PARA"],
        copybooksUsed: ["BILLING-UTIL", "DATE-ROUTINES"],
        dataDefinitions: [
          { name: "CUSTOMER-ID", type: "NUMERIC", length: 9 },
          { name: "BILL-AMOUNT", type: "NUMERIC", length: 7, scale: 2 },
        ],
        businessRulesDiscovered: [
          "If BILL-AMOUNT < 0, move 0 to BILL-AMOUNT",
          "Compute late fee if BILL-DATE > DUE-DATE",
        ],
      };
    },
    generateWorkflowDiagram: async ({ format }) => {
      console.log("[toolLogic] generateWorkflowDiagram()", format);
      // Return either a JSON or SVG representation of flow
      if (format === "json") {
        return {
          nodes: [
            { id: "start", label: "Start" },
            { id: "init", label: "INIT-PARA" },
            { id: "calc", label: "CALC-PARA" },
            { id: "final", label: "FINAL-PARA" },
          ],
          edges: [
            { from: "start", to: "init" },
            { from: "init", to: "calc" },
            { from: "calc", to: "final" },
          ],
        };
      } else {
        // Return an SVG string with your flow diagram
        return `<svg><!-- some diagram here --></svg>`;
      }
    },
    emulateProgram: async ({ inputRecord }) => {
      console.log("[toolLogic] emulateProgram()", JSON.stringify(inputRecord));
      // Stub: pretend to apply some rules
      let output = { ...inputRecord };
      if (output.BILL_AMOUNT < 0) {
        output.BILL_AMOUNT = 0;
      }
      // e.g., if date is past due, add a late fee
      return {
        originalInput: inputRecord,
        outputState: output,
        logs: ["Validated BILL_AMOUNT", "Applied late fee logic if needed"],
      };
    },
    generateTestDataSets: async ({ recordCount }) => {
      console.log("[toolLogic] generateTestDataSets()", recordCount);
      // Stub: Generate random records
      let records = [];
      for (let i = 0; i < recordCount; i++) {
        records.push({
          CUSTOMER_ID: Math.floor(Math.random() * 1000000000),
          BILL_AMOUNT: parseFloat((Math.random() * 1000).toFixed(2)),
          BILL_DATE: "2025-01-01",
          DUE_DATE: "2025-01-10",
        });
      }
      return {
        recordCount,
        records,
      };
    },
  },
};

export default billingAgent;
