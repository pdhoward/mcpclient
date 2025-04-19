import timeAgent from './timeAgent';
import introduce from "./machine";
import backgroundAgent from './backgroundAgent';
import celebrateAgent from './celebrateAgent';
import clipboardAgent from './clipboardAgent';
import fetchSiteAgent from './fetchSiteAgent';
import { injectTransferTools } from '../utils';

introduce.downstreamAgents = [
    timeAgent, 
    backgroundAgent, 
    celebrateAgent,
    clipboardAgent,
    fetchSiteAgent
]
timeAgent.downstreamAgents = [introduce]
backgroundAgent.downstreamAgents = [introduce]
celebrateAgent.downstreamAgents = [introduce]
clipboardAgent.downstreamAgents = [introduce]
fetchSiteAgent.downstreamAgents = [introduce]

const agents = injectTransferTools([
    introduce,
    timeAgent,
    backgroundAgent,
    celebrateAgent,
    clipboardAgent,
    fetchSiteAgent
]);

export default agents;