import type {
IDataObject,
IExecuteFunctions,
INodeExecutionData,
INodeType,
INodeTypeDescription,
JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError, sleep } from 'n8n-workflow';

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

/** Write operations that carry safety guards (bulk-check, delay, dry-run). */
const WEB_WRITE_OPERATIONS = ['followAthleteWeb', 'kudoActivityWeb', 'unfollowAthleteWeb'] as const;

export class Strava implements INodeType {
description: INodeTypeDescription = {
displayName: 'Strava',
name: 'strava',
icon: 'file:strava.svg',
group: ['input'],
version: 1,
subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
description: 'Consume the official Strava API v3. Also includes undocumented Web Session operations (marked ⚠️) that use a browser session cookie and may break without notice.',
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

// Pre-flight bulk guard: reject multiple items for write operations when
// preventBulk is enabled — checked once before any request is sent.
if (items.length > 1) {
const resource0 = this.getNodeParameter('resource', 0) as string;
const operation0 = this.getNodeParameter('operation', 0) as string;
if (
resource0 === 'webSession' &&
(WEB_WRITE_OPERATIONS as readonly string[]).includes(operation0)
) {
const preventBulk = this.getNodeParameter('preventBulk', 0, true) as boolean;
if (preventBulk) {
throw new NodeOperationError(
this.getNode(),
`Bulk write is disabled for "${operation0}". Set "Prevent Bulk Actions" to false to process multiple items.`,
);
}
}
}

for (let i = 0; i < items.length; i++) {
try {
const resource = this.getNodeParameter('resource', i) as string;
const operation = this.getNodeParameter('operation', i) as string;

let responseData: IDataObject | IDataObject[] = {};

if (resource === 'athlete') {
if (operation === 'getLoggedInAthlete') {
responseData = await stravaApiRequest.call(this, 'GET', '/athlete');
} else if (operation === 'getStats') {
const athleteId = this.getNodeParameter('athleteId', i) as number;
responseData = await stravaApiRequest.call(this, 'GET', `/athletes/${athleteId}/stats`);
} else if (operation === 'updateLoggedInAthlete') {
const weight = this.getNodeParameter('weight', i) as number;
// Strava PUT /athlete expects weight as a query parameter, not a JSON body
responseData = await stravaApiRequest.call(this, 'PUT', '/athlete', {}, { weight });
} else if (operation === 'getLoggedInAthleteZones') {
responseData = await stravaApiRequest.call(this, 'GET', '/athlete/zones');
}
} else if (resource === 'activity') {
if (operation === 'createActivity') {
const name = this.getNodeParameter('name', i) as string;
const sport_type = this.getNodeParameter('sport_type', i) as string;
const start_date_local = this.getNodeParameter('start_date_local', i) as string;
const elapsed_time = this.getNodeParameter('elapsed_time', i) as number;
const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
const body: IDataObject = { name, sport_type, start_date_local, elapsed_time };
if (additionalFields.type) body.type = additionalFields.type;
if (additionalFields.description) body.description = additionalFields.description;
if (additionalFields.distance) body.distance = additionalFields.distance;
if (additionalFields.trainer !== undefined) body.trainer = additionalFields.trainer ? 1 : 0;
if (additionalFields.commute !== undefined) body.commute = additionalFields.commute ? 1 : 0;
responseData = await stravaApiRequest.call(this, 'POST', '/activities', body);
} else if (operation === 'getActivityById') {
const activityId = this.getNodeParameter('activityId', i) as number;
const include_all_efforts = this.getNodeParameter('include_all_efforts', i) as boolean;
responseData = await stravaApiRequest.call(this, 'GET', `/activities/${activityId}`, {}, { include_all_efforts });
} else if (operation === 'updateActivityById') {
const activityId = this.getNodeParameter('activityId', i) as number;
const fields = this.getNodeParameter('body', i) as IDataObject;
const body: IDataObject = {};
if (fields.name) body.name = fields.name;
if (fields.sport_type) body.sport_type = fields.sport_type;
if (fields.description) body.description = fields.description;
if (fields.gear_id) body.gear_id = fields.gear_id;
if (fields.trainer !== undefined) body.trainer = fields.trainer;
if (fields.commute !== undefined) body.commute = fields.commute;
if (fields.hide_from_home !== undefined) body.hide_from_home = fields.hide_from_home;
if (fields.type) body.type = fields.type;
responseData = await stravaApiRequest.call(this, 'PUT', `/activities/${activityId}`, body);
} else if (operation === 'getLoggedInAthleteActivities') {
const filters = this.getNodeParameter('filters', i) as IDataObject;
const qs: IDataObject = {};
if (filters.before) qs.before = filters.before;
if (filters.after) qs.after = filters.after;
if (filters.page) qs.page = filters.page;
if (filters.per_page) qs.per_page = filters.per_page;
responseData = await stravaApiRequest.call(this, 'GET', '/athlete/activities', {}, qs);
} else if (operation === 'getLapsByActivityId') {
const activityId = this.getNodeParameter('activityId', i) as number;
responseData = await stravaApiRequest.call(this, 'GET', `/activities/${activityId}/laps`);
} else if (operation === 'getZonesByActivityId') {
const activityId = this.getNodeParameter('activityId', i) as number;
responseData = await stravaApiRequest.call(this, 'GET', `/activities/${activityId}/zones`);
} else if (operation === 'getCommentsByActivityId') {
const activityId = this.getNodeParameter('activityId', i) as number;
const pagination = this.getNodeParameter('pagination', i) as IDataObject;
const qs: IDataObject = {};
if (pagination.page_size) qs.page_size = pagination.page_size;
if (pagination.after_cursor) qs.after_cursor = pagination.after_cursor;
responseData = await stravaApiRequest.call(this, 'GET', `/activities/${activityId}/comments`, {}, qs);
} else if (operation === 'getKudoersByActivityId') {
const activityId = this.getNodeParameter('activityId', i) as number;
const pagination = this.getNodeParameter('pagination', i) as IDataObject;
const qs: IDataObject = {};
if (pagination.page) qs.page = pagination.page;
if (pagination.per_page) qs.per_page = pagination.per_page;
responseData = await stravaApiRequest.call(this, 'GET', `/activities/${activityId}/kudos`, {}, qs);
}
} else if (resource === 'segment') {
if (operation === 'getSegmentById') {
const segmentId = this.getNodeParameter('segmentId', i) as number;
responseData = await stravaApiRequest.call(this, 'GET', `/segments/${segmentId}`);
} else if (operation === 'getLoggedInAthleteStarredSegments') {
const pagination = this.getNodeParameter('pagination', i) as IDataObject;
const qs: IDataObject = {};
if (pagination.page) qs.page = pagination.page;
if (pagination.per_page) qs.per_page = pagination.per_page;
responseData = await stravaApiRequest.call(this, 'GET', '/segments/starred', {}, qs);
} else if (operation === 'starSegment') {
const segmentId = this.getNodeParameter('segmentId', i) as number;
const starred = this.getNodeParameter('starred', i) as boolean;
responseData = await stravaApiRequest.call(this, 'PUT', `/segments/${segmentId}/starred`, { starred });
} else if (operation === 'exploreSegments') {
const bounds = this.getNodeParameter('bounds', i) as string;
const additionalFilters = this.getNodeParameter('additionalFilters', i) as IDataObject;
const qs: IDataObject = { bounds };
if (additionalFilters.activity_type) qs.activity_type = additionalFilters.activity_type;
if (additionalFilters.min_cat !== undefined) qs.min_cat = additionalFilters.min_cat;
if (additionalFilters.max_cat !== undefined) qs.max_cat = additionalFilters.max_cat;
responseData = await stravaApiRequest.call(this, 'GET', '/segments/explore', {}, qs);
}
} else if (resource === 'segmentEffort') {
if (operation === 'getEffortsBySegmentId') {
const segmentId = this.getNodeParameter('segmentId', i) as number;
const filters = this.getNodeParameter('filters', i) as IDataObject;
const qs: IDataObject = { segment_id: segmentId };
if (filters.start_date_local) qs.start_date_local = filters.start_date_local;
if (filters.end_date_local) qs.end_date_local = filters.end_date_local;
if (filters.per_page) qs.per_page = filters.per_page;
responseData = await stravaApiRequest.call(this, 'GET', '/segment_efforts', {}, qs);
} else if (operation === 'getSegmentEffortById') {
const segmentEffortId = this.getNodeParameter('segmentEffortId', i) as number;
responseData = await stravaApiRequest.call(this, 'GET', `/segment_efforts/${segmentEffortId}`);
}
} else if (resource === 'club') {
if (operation === 'getClubById') {
const clubId = this.getNodeParameter('clubId', i) as number;
responseData = await stravaApiRequest.call(this, 'GET', `/clubs/${clubId}`);
} else if (operation === 'getClubMembersById') {
const clubId = this.getNodeParameter('clubId', i) as number;
const pagination = this.getNodeParameter('pagination', i) as IDataObject;
const qs: IDataObject = {};
if (pagination.page) qs.page = pagination.page;
if (pagination.per_page) qs.per_page = pagination.per_page;
responseData = await stravaApiRequest.call(this, 'GET', `/clubs/${clubId}/members`, {}, qs);
} else if (operation === 'getClubAdminsById') {
const clubId = this.getNodeParameter('clubId', i) as number;
const pagination = this.getNodeParameter('pagination', i) as IDataObject;
const qs: IDataObject = {};
if (pagination.page) qs.page = pagination.page;
if (pagination.per_page) qs.per_page = pagination.per_page;
responseData = await stravaApiRequest.call(this, 'GET', `/clubs/${clubId}/admins`, {}, qs);
} else if (operation === 'getClubActivitiesById') {
const clubId = this.getNodeParameter('clubId', i) as number;
const pagination = this.getNodeParameter('pagination', i) as IDataObject;
const qs: IDataObject = {};
if (pagination.page) qs.page = pagination.page;
if (pagination.per_page) qs.per_page = pagination.per_page;
responseData = await stravaApiRequest.call(this, 'GET', `/clubs/${clubId}/activities`, {}, qs);
} else if (operation === 'getLoggedInAthleteClubs') {
const pagination = this.getNodeParameter('pagination', i) as IDataObject;
const qs: IDataObject = {};
if (pagination.page) qs.page = pagination.page;
if (pagination.per_page) qs.per_page = pagination.per_page;
responseData = await stravaApiRequest.call(this, 'GET', '/athlete/clubs', {}, qs);
}
} else if (resource === 'gear') {
if (operation === 'getGearById') {
const gearId = this.getNodeParameter('gearId', i) as string;
responseData = await stravaApiRequest.call(this, 'GET', `/gear/${gearId}`);
}
} else if (resource === 'route') {
if (operation === 'getRouteById') {
const routeId = this.getNodeParameter('routeId', i) as number;
responseData = await stravaApiRequest.call(this, 'GET', `/routes/${routeId}`);
} else if (operation === 'getRoutesByAthleteId') {
const athleteId = this.getNodeParameter('athleteId', i) as number;
const pagination = this.getNodeParameter('pagination', i) as IDataObject;
const qs: IDataObject = {};
if (pagination.page) qs.page = pagination.page;
if (pagination.per_page) qs.per_page = pagination.per_page;
responseData = await stravaApiRequest.call(this, 'GET', `/athletes/${athleteId}/routes`, {}, qs);
} else if (operation === 'getRouteAsGPX' || operation === 'getRouteAsTCX') {
const routeId = this.getNodeParameter('routeId', i) as number;
const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
const isGpx = operation === 'getRouteAsGPX';
const exportPath = isGpx ? 'export_gpx' : 'export_tcx';
const fileName = isGpx ? `route-${routeId}.gpx` : `route-${routeId}.tcx`;
const mimeType = isGpx ? 'application/gpx+xml' : 'application/tcx+xml';
const fileResponse = await this.helpers.httpRequestWithAuthentication.call(
this,
'stravaOAuth2Api',
{
method: 'GET',
url: `https://www.strava.com/api/v3/routes/${routeId}/${exportPath}`,
encoding: 'arraybuffer',
},
);
const binaryData = await this.helpers.prepareBinaryData(
Buffer.from(fileResponse as ArrayBuffer),
fileName,
mimeType,
);
returnData.push({
json: {},
binary: { [binaryPropertyName]: binaryData },
pairedItem: { item: i },
});
continue;
}
} else if (resource === 'upload') {
if (operation === 'getUploadById') {
const uploadId = this.getNodeParameter('uploadId', i) as number;
responseData = await stravaApiRequest.call(this, 'GET', `/uploads/${uploadId}`);
} else if (operation === 'createUpload') {
const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
const data_type = this.getNodeParameter('data_type', i) as string;
const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
const binaryMeta = this.helpers.assertBinaryData(i, binaryPropertyName);
const fileBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
const fd = new FormData();
fd.append(
'file',
new Blob([fileBuffer], { type: binaryMeta.mimeType ?? 'application/octet-stream' }),
binaryMeta.fileName ?? `upload.${data_type.replace('.gz', '')}`,
);
fd.append('data_type', data_type);
if (additionalFields.activity_type) fd.append('activity_type', String(additionalFields.activity_type));
if (additionalFields.name) fd.append('name', String(additionalFields.name));
if (additionalFields.description) fd.append('description', String(additionalFields.description));
if (additionalFields.external_id) fd.append('external_id', String(additionalFields.external_id));
if (additionalFields.trainer !== undefined) fd.append('trainer', additionalFields.trainer ? '1' : '0');
if (additionalFields.commute !== undefined) fd.append('commute', additionalFields.commute ? '1' : '0');
responseData = (await this.helpers.httpRequestWithAuthentication.call(
this,
'stravaOAuth2Api',
{
method: 'POST',
url: 'https://www.strava.com/api/v3/uploads',
body: fd,
},
)) as IDataObject;
}
} else if (resource === 'stream') {
if (operation === 'getActivityStreams') {
const activityId = this.getNodeParameter('activityId', i) as number;
const keys = (this.getNodeParameter('keys', i) as string[]).join(',');
const key_by_type = this.getNodeParameter('key_by_type', i) as boolean;
responseData = await stravaApiRequest.call(this, 'GET', `/activities/${activityId}/streams`, {}, { keys, key_by_type });
} else if (operation === 'getSegmentEffortStreams') {
const segmentEffortId = this.getNodeParameter('segmentEffortId', i) as number;
const keys = (this.getNodeParameter('keys', i) as string[]).join(',');
const key_by_type = this.getNodeParameter('key_by_type', i) as boolean;
responseData = await stravaApiRequest.call(this, 'GET', `/segment_efforts/${segmentEffortId}/streams`, {}, { keys, key_by_type });
} else if (operation === 'getSegmentStreams') {
const segmentId = this.getNodeParameter('segmentId', i) as number;
const keys = (this.getNodeParameter('keys', i) as string[]).join(',');
const key_by_type = this.getNodeParameter('key_by_type', i) as boolean;
responseData = await stravaApiRequest.call(this, 'GET', `/segments/${segmentId}/streams`, {}, { keys, key_by_type });
} else if (operation === 'getRouteStreams') {
const routeId = this.getNodeParameter('routeId', i) as number;
responseData = await stravaApiRequest.call(this, 'GET', `/routes/${routeId}/streams`);
}
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

// Throttle write operations between items to avoid hammering Strava
if (
resource === 'webSession' &&
(WEB_WRITE_OPERATIONS as readonly string[]).includes(operation) &&
i < items.length - 1
) {
const delayMs = this.getNodeParameter('requestDelayMs', i, 1000) as number;
if (delayMs > 0) await sleep(delayMs);
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

function executeBuildFollowRequestData(
this: IExecuteFunctions,
itemIndex: number,
): IDataObject[] {
const mode = this.getNodeParameter('mode', itemIndex) as string;
const followerId = this.getNodeParameter('followerId', itemIndex) as number;

if (!followerId) {
throw new NodeOperationError(this.getNode(), 'Follower ID is required.', { itemIndex });
}

if (mode === 'follow') {
const followingId = this.getNodeParameter('followingId', itemIndex) as number;
if (!followingId) {
throw new NodeOperationError(this.getNode(), 'Following ID is required for follow mode.', { itemIndex });
}
return [
{
method: 'POST',
endpoint: buildFollowUrl(followerId),
body: { follow: { following_id: followingId, follower_id: followerId } },
},
];
}

if (mode === 'unfollow') {
const followId = this.getNodeParameter('followId', itemIndex) as number;
if (!followId) {
throw new NodeOperationError(this.getNode(), 'Follow ID is required for unfollow mode.', { itemIndex });
}
return [
{
method: 'DELETE',
endpoint: buildUnfollowUrl(followerId, followId),
},
];
}

throw new NodeOperationError(this.getNode(), `Unknown mode: "${mode}"`, { itemIndex });
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
// ── Read / utility operations ──────────────────────────────────────────────
if (operation === 'buildFollowRequestData') {
return executeBuildFollowRequestData.call(this, itemIndex);
}

if (operation === 'getActivityKudosExtended' || operation === 'getActivityGroupAthletes') {
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

if (!splitIntoItems) return [response];

const athletes = (response.athletes ?? []) as IDataObject[];
return athletes.map((athlete) => ({
...athlete,
is_owner: response.is_owner,
kudosable: response.kudosable,
}));
}

// getActivityGroupAthletes
const response = (await stravaWebRequest.call(
this,
'GET',
`/feed/activity/${activityId}/group_athletes`,
)) as IDataObject;

if (!splitIntoItems) return [response];

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

// ── Write operations ───────────────────────────────────────────────────────
if (operation === 'followAthleteWeb') {
return executeFollowAthlete.call(this, itemIndex);
}

if (operation === 'kudoActivityWeb') {
return executeKudoActivity.call(this, itemIndex);
}

if (operation === 'unfollowAthleteWeb') {
return executeUnfollowAthlete.call(this, itemIndex);
}

throw new NodeOperationError(
this.getNode(),
`The operation "${operation}" for resource "webSession" is not yet implemented`,
{ itemIndex },
);
}

async function executeFollowAthlete(
this: IExecuteFunctions,
itemIndex: number,
): Promise<IDataObject[]> {
const followerId = this.getNodeParameter('followerId', itemIndex) as number;
const followingId = this.getNodeParameter('followingId', itemIndex) as number;
const confirmAction = this.getNodeParameter('confirmAction', itemIndex, false) as boolean;
const dryRun = this.getNodeParameter('dryRun', itemIndex, false) as boolean;

if (!confirmAction) {
throw new NodeOperationError(
this.getNode(),
'Confirm Follow Action must be enabled to send the follow request.',
{ itemIndex },
);
}

const url = buildFollowUrl(followerId);
const body = { follow: { following_id: followingId, follower_id: followerId } };

if (dryRun) {
return [{ dryRun: true, method: 'POST', url: `https://www.strava.com${url}`, body }];
}

const response = (await stravaWebRequest.call(this, 'POST', url, body as IDataObject)) as IDataObject;
return [response];
}

async function executeKudoActivity(
this: IExecuteFunctions,
itemIndex: number,
): Promise<IDataObject[]> {
const activityId = this.getNodeParameter('activityId', itemIndex) as number;
const confirmAction = this.getNodeParameter('confirmAction', itemIndex, false) as boolean;
const dryRun = this.getNodeParameter('dryRun', itemIndex, false) as boolean;

if (!confirmAction) {
throw new NodeOperationError(
this.getNode(),
'Confirm Kudo Action must be enabled to send the kudo request.',
{ itemIndex },
);
}

const url = `/feed/activity/${activityId}/kudo`;

if (dryRun) {
return [{ dryRun: true, method: 'POST', url: `https://www.strava.com${url}`, body: {} }];
}

const response = (await stravaWebRequest.call(this, 'POST', url)) as IDataObject;

// Strava may return an empty body (200/204) for a successful kudo
if (Object.keys(response).length === 0) {
return [{ success: true, activityId, operation: 'kudoActivityWeb' }];
}

return [response];
}

async function executeUnfollowAthlete(
this: IExecuteFunctions,
itemIndex: number,
): Promise<IDataObject[]> {
const followerId = this.getNodeParameter('followerId', itemIndex) as number;
const followId = this.getNodeParameter('followId', itemIndex) as number;
const confirmAction = this.getNodeParameter('confirmAction', itemIndex, false) as boolean;
const dryRun = this.getNodeParameter('dryRun', itemIndex, false) as boolean;

if (!confirmAction) {
throw new NodeOperationError(
this.getNode(),
'Confirm Unfollow Action must be enabled to send the unfollow request.',
{ itemIndex },
);
}

const url = buildUnfollowUrl(followerId, followId);

if (dryRun) {
return [{ dryRun: true, method: 'DELETE', url: `https://www.strava.com${url}`, body: {} }];
}

const response = (await stravaWebRequest.call(this, 'DELETE', url)) as IDataObject;
return [response ?? {}];
}

/**
 * Builds the POST follow URL.  Isolated so the path can be changed in one
 * place if Strava changes the route.
 */
function buildFollowUrl(followerId: number): string {
return `/athletes/${followerId}/follows`;
}

/**
 * Builds the DELETE unfollow URL.  The first segment is followerId (the
 * authenticated user), the second is followId (the follow relationship ID).
 */
function buildUnfollowUrl(followerId: number, followId: number): string {
return `/athletes/${followerId}/follows/${followId}`;
}
