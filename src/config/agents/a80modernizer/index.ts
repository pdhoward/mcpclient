import introduce from "./introduce";
import projectmanager from "./projectmanager";
import CBACT04C from "./CBACT04C";
import architect from "./architect";
import { injectTransferTools } from "../utils";

introduce.downstreamAgents = [projectmanager, architect];
CBACT04C.downstreamAgents = [projectmanager, architect];
projectmanager.downstreamAgents = [CBACT04C, architect]
architect.downstreamAgents = [CBACT04C, projectmanager]

const agents = injectTransferTools([
introduce,
CBACT04C,
projectmanager,
architect
]);

export default agents;