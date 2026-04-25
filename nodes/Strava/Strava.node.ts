import type {
IDataObject,
IExecuteFunctions,
INodeExecutionData,
INodeType,
INodeTypeDescription,
JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { stravaApiRequest } from './GenericFunctions';
import { stravaWebRequest } from './WebSessionFunctions';
import { activityFields, activityOperations } from './resources/activity';
import { athleteFields, athleteOperations } from './resources/athlete';
import { clubFields, clubOperations } from './resources/club';
import { gearFields, gearOperations } from './resources/gear';
import { routeFields, routeOperations } from './resources/route';
import { segmentFields, segmentOperations } from './resources/segment';
import { segmentEffortFields, segmentEffortOperations } from './resources/segmentEffort';
import { streamFields, streamOperations } from './resources/stream';
import { uploadFields, uploadOperations } from './resources/upload';
import { webSessionFields, webSessionOperations } from './resources/webSession';

export class Strava implements INodeType {
description: INodeTypeDescription = {
displayName: 'Strava',
name: 'strava',
icon: 'file:strava.svg',
group: ['input'],
version: 1,
subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
description: 'Consume Strava API',
defaults: {
name: 'Strava',
},
usableAsTool: true,
inputs: [NodeConnectionTypes.Main],
outputs: [NodeConnectionTypes.Main],
credentials: [
{
name: 'stravaOAuth2Api',
required: true,
},
{
name: 'stravaWebSessionApi',
required: false,
displayOptions: {
show: {
resource: ['webSession'],
},
},
},
],
properties: [
{
displayName: 'Resource',
name: 'resource',
type: 'options',
noDataExpression: true,
options: [
{ name: 'Activity', value: 'activity' },
{ name: 'Athlete', value: 'athlete' },
{ name: 'Club', value: 'club' },
{ name: 'Gear', value: 'gear' },
{ name: 'Route', value: 'route' },
{ name: 'Segment', value: 'segment' },
{ name: 'Segment Effort', value: 'segmentEffort' },
{ name: 'Stream', value: 'stream' },
{ name: 'Upload', value: 'upload' },
{ name: 'Web Session (Undocumented)', value: 'webSession' },
],
default: 'athlete',
},
...activityOperations,
...activityFields,
...athleteOperations,
...athleteFields,
...clubOperations,
...clubFields,
...gearOperations,
...gearFields,
...routeOperations,
...routeFields,
...segmentOperations,
...segmentFields,
...segmentEffortOperations,
...segmentEffortFields,
...streamOperations,
...streamFields,
...uploadOperations,
...uploadFields,
...webSessionOperations,
...webSessionFields,
],
};

async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
const items = this.getInputData();
const returnData: INodeExecutionData[] = [];

for (let i = 0; i < items.length; i++) {
try {
const resource = this.getNodeParameter('resource', i) as string;
const operation = this.getNodeParameter('operation', i) as string;

let responseData: IDataObject | IDataObject[] = {};

if (resource === 'athlete' && operation === 'getLoggedInAthlete') {
responseData = await stravaApiRequest.call(this, 'GET', '/athlete');
} else if (resource === 'webSession') {
responseData = await executeWebSessionOperation.call(this, operation, i);
} else {
throw new NodeOperationError(
this.getNode(),
`The operation "${operation}" for resource "${resource}" is not yet implemented`,
{ itemIndex: i },
);
}

const outputItems = Array.isArray(responseData) ? responseData : [responseData];
for (const item of outputItems) {
returnData.push({ json: item as IDataObject, pairedItem: { item: i } });
}
} catch (error) {
if (this.continueOnFail()) {
returnData.push({
json: { error: (error as Error).message },
pairedItem: { item: i },
});
continue;
}

if (error instanceof NodeOperationError) {
throw error;
}

throw new NodeApiError(this.getNode(), error as unknown as JsonObject, {
itemIndex: i,
});
}
}

return [returnData];
}
}

/** Extracts inner text from an HTML anchor tag, e.g. <a href="...">text</a> → "text" */
function extractAnchorText(html: string): string {
const match = /<a[^>]*>([^<]*)<\/a>/i.exec(html);
return match ? match[1].trim() : html;
}

async function executeWebSessionOperation(
this: IExecuteFunctions,
operation: string,
itemIndex: number,
): Promise<IDataObject[]> {
const activityId = this.getNodeParameter('activityId', itemIndex) as number;
if (!activityId) {
throw new NodeOperationError(this.getNode(), 'Activity ID is required', { itemIndex });
}

const splitIntoItems = this.getNodeParameter('splitIntoItems', itemIndex, true) as boolean;

if (operation === 'getActivityKudosExtended') {
const response = (await stravaWebRequest.call(
this,
'GET',
`/feed/activity/${activityId}/kudos`,
)) as IDataObject;

if (!splitIntoItems) {
return [response];
}

const athletes = (response.athletes ?? []) as IDataObject[];
const isOwner = response.is_owner;
const kudosable = response.kudosable;

return athletes.map((athlete) => ({
...athlete,
is_owner: isOwner,
kudosable,
}));
}

if (operation === 'getActivityGroupAthletes') {
const response = (await stravaWebRequest.call(
this,
'GET',
`/feed/activity/${activityId}/group_athletes`,
)) as IDataObject;

if (!splitIntoItems) {
return [response];
}

const athletes = (response.athletes ?? []) as IDataObject[];

return athletes.map((athlete) => {
const activityLink = athlete.activity_link as string | undefined;
return {
...athlete,
source_activity_id: activityId,
activity_title: activityLink ? extractAnchorText(activityLink) : undefined,
};
});
}

throw new NodeOperationError(
this.getNode(),
`The operation "${operation}" for resource "webSession" is not yet implemented`,
{ itemIndex },
);
}
