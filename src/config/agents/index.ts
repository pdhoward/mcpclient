import { AllAgentConfigsType } from "@/lib/types";
import frontDeskAuthentication from "./universitysecurity";
import cypressResorts from "./cypressResorts";
import introduction from "./strategicmachines"
import a80modernizer from "./a80modernizer"

export const allAgentSets: AllAgentConfigsType = {
  frontDeskAuthentication,
  cypressResorts, 
  introduction,
  a80modernizer
};

export const defaultAgentSetKey = "cypressResorts";
