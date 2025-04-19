import { AgentConfig } from "@/lib/types";

const reservationAgent: AgentConfig = {
    name: "reservationAgent",
    publicDescription:
      "Handles reservation-related inquiries, including available villas, pricing, special packages, and booking flows",
    instructions:
      "You are a helpful resort assistant who handles reservation details. Provide comprehensive information about Cypress Resorts, available villas, and special reservation packages. Imagine you've spent countless hours and trips visiting the top resorts worldwide, and now you are here, in Jasper, Georgia, applying your insights and expert knowledge to guide customers on their reservations and stays.",
    tools: [
      {
        type: "function",
        name: "checkAvailability",
        description:
          "Checks for available villas based on the user's preferred dates and preferences.",
        parameters: {
          type: "object",
          properties: {
            check_in_date: {
              type: "string",
              description: "The check-in date in YYYY-MM-DD format.",
            },
            check_out_date: {
              type: "string",
              description: "The check-out date in YYYY-MM-DD format.",
            },
            villa_type: {
              type: "string",
              enum: ["freestanding_luxury_villa", "any"],
              description: "The type of villa the user is interested in (optional).",
            },
          },
          required: ["check_in_date", "check_out_date"],
          additionalProperties: false,
        },
      },
      {
        type: "function",
        name: "bookReservation",
        description: "Completes a reservation for the selected villa.",
        parameters: {
          type: "object",
          properties: {
            villa_id: {
              type: "string",
              description: "The ID of the villa to book.",
            },
            guest_name: {
              type: "string",
              description: "The full name of the guest making the reservation.",
            },
            phone_number: {
              type: "string",
              description:
                "User's phone number used for confirmation. Formatted like '(111) 222-3333'",
              pattern: "^\\(\\d{3}\\) \\d{3}-\\d{4}$",
            },
            special_requests: {
              type: "string",
              description:
                "Any special requests or preferences for the stay (optional).",
            },
          },
          required: ["villa_id", "guest_name", "phone_number"],
          additionalProperties: false,
        },
      },
    ],
    toolLogic: {
      checkAvailability: ({ check_in_date, check_out_date, villa_type }) => {
        console.log(
          "[toolLogic] calling checkAvailability(), dates:",
          check_in_date,
          check_out_date,
          "villa type:",
          villa_type
        );

        const availableVillas = [
          {
            villa_id: "101",
            name: "Forest Haven Villa",
            nightly_rate_usd: 875,
            availability: true,
          },
          {
            villa_id: "102",
            name: "Cypress Falls View Retreat",
            nightly_rate_usd: 950,
            availability: true,
          },
          {
            villa_id: "103",
            name: "Cypress Serenity",
            nightly_rate_usd: 1025,
            availability: true,
          },
        ];

        const filteredVillas =
          villa_type === "any"
            ? availableVillas.filter((villa) => villa.availability)
            : availableVillas.filter(
                (villa) => villa.availability && villa_type === "freestanding_luxury_villa"
              );

        return {
          availableVillas: filteredVillas,
        };
      },
    },
  };

export default reservationAgent;