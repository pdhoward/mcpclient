import authentication from "./authentication";
import modifications from "./modifications";
import reservations from "./reservations";
import guestservices from "./guestservices";
import simulatedHuman from "./simulatedHuman";
import { injectTransferTools } from "../utils";

authentication.downstreamAgents = [modifications, reservations, simulatedHuman, guestservices];
modifications.downstreamAgents = [authentication, reservations, simulatedHuman, guestservices];
reservations.downstreamAgents = [authentication, modifications, simulatedHuman, guestservices];
simulatedHuman.downstreamAgents = [authentication, modifications, reservations, guestservices];
guestservices.downstreamAgents = [authentication, modifications, reservations, simulatedHuman];

const agents = injectTransferTools([
  authentication,
  modifications,
  reservations,
  simulatedHuman,
  guestservices
]);

export default agents;