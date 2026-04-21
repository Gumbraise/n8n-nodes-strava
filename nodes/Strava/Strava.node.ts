import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { stravaApiRequest, stravaApiRequestAllItems, stravaDownloadAsBinary } from './GenericFunctions';

const paginationOperations = [
	'listStarredSegments',
	'listSegmentEfforts',
	'listAthleteActivities',
	'listActivityComments',
	'listActivityKudoers',
	'listClubMembers',
	'listClubAdmins',
	'listClubActivities',
	'listAthleteClubs',
	'listRoutesByAthlete',
];

function appendResponse(
	returnData: INodeExecutionData[],
	itemIndex: number,
	responseData: IDataObject | IDataObject[],
) {
	const outputData = Array.isArray(responseData) ? responseData : [responseData];
	for (const entry of outputData) {
		returnData.push({
			json: entry,
			pairedItem: { item: itemIndex },
		});
	}
}

export class Strava implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Strava',
		name: 'strava',
		icon: { light: 'file:../../icons/github.svg', dark: 'file:../../icons/github.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Strava API v3',
		defaults: {
			name: 'Strava',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [{ name: 'stravaOAuth2Api', required: true }],
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
				],
				default: 'activity',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['athlete'] } },
				options: [
					{ name: 'Get Logged-In Athlete', value: 'getLoggedInAthlete', action: 'Get the logged in athlete' },
					{ name: 'Get Logged-In Athlete Zones', value: 'getLoggedInAthleteZones', action: 'Get logged in athlete zones' },
					{ name: 'Get Stats', value: 'getAthleteStats', action: 'Get athlete stats' },
					{ name: 'Update Logged-In Athlete', value: 'updateLoggedInAthlete', action: 'Update the logged in athlete' },
				],
				default: 'getLoggedInAthlete',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['activity'] } },
				options: [
					{ name: 'Create', value: 'createActivity', action: 'Create an activity' },
					{ name: 'Get', value: 'getActivity', action: 'Get an activity by ID' },
					{ name: 'Get Laps', value: 'getActivityLaps', action: 'Get laps by activity ID' },
					{ name: 'Get Zones', value: 'getActivityZones', action: 'Get activity zones by ID' },
					{ name: 'List Comments', value: 'listActivityComments', action: 'List comments by activity ID' },
					{ name: 'List Kudos', value: 'listActivityKudoers', action: 'List kudoers by activity ID' },
					{ name: 'List Logged-In Athlete Activities', value: 'listAthleteActivities', action: 'List logged in athlete activities' },
					{ name: 'Update', value: 'updateActivity', action: 'Update an activity by ID' },
				],
				default: 'createActivity',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['segment'] } },
				options: [
					{ name: 'Explore', value: 'exploreSegments', action: 'Explore segments' },
					{ name: 'Get', value: 'getSegment', action: 'Get a segment by ID' },
					{ name: 'List Starred', value: 'listStarredSegments', action: 'List starred segments' },
					{ name: 'Star/Unstar', value: 'starSegment', action: 'Star or unstar a segment' },
				],
				default: 'getSegment',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['segmentEffort'] } },
				options: [
					{ name: 'Get', value: 'getSegmentEffort', action: 'Get a segment effort by ID' },
					{ name: 'List by Segment', value: 'listSegmentEfforts', action: 'List segment efforts by segment ID' },
				],
				default: 'getSegmentEffort',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['club'] } },
				options: [
					{ name: 'Get', value: 'getClub', action: 'Get a club by ID' },
					{ name: 'List Activities', value: 'listClubActivities', action: 'List club activities by ID' },
					{ name: 'List Admins', value: 'listClubAdmins', action: 'List club admins by ID' },
					{ name: 'List Logged-In Athlete Clubs', value: 'listAthleteClubs', action: 'List logged in athlete clubs' },
					{ name: 'List Members', value: 'listClubMembers', action: 'List club members by ID' },
				],
				default: 'getClub',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['gear'] } },
				options: [{ name: 'Get', value: 'getGear', action: 'Get a gear by ID' }],
				default: 'getGear',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['route'] } },
				options: [
					{ name: 'Export GPX', value: 'exportRouteGpx', action: 'Export route as GPX' },
					{ name: 'Export TCX', value: 'exportRouteTcx', action: 'Export route as TCX' },
					{ name: 'Get', value: 'getRoute', action: 'Get a route by ID' },
					{ name: 'List by Athlete', value: 'listRoutesByAthlete', action: 'List routes by athlete ID' },
				],
				default: 'getRoute',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['upload'] } },
				options: [
					{ name: 'Create', value: 'createUpload', action: 'Create an upload' },
					{ name: 'Get', value: 'getUpload', action: 'Get an upload by ID' },
				],
				default: 'createUpload',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['stream'] } },
				options: [
					{ name: 'Get Activity Streams', value: 'getActivityStreams', action: 'Get activity streams by ID' },
					{ name: 'Get Route Streams', value: 'getRouteStreams', action: 'Get route streams by ID' },
					{ name: 'Get Segment Effort Streams', value: 'getSegmentEffortStreams', action: 'Get segment effort streams by ID' },
					{ name: 'Get Segment Streams', value: 'getSegmentStreams', action: 'Get segment streams by ID' },
				],
				default: 'getActivityStreams',
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: {
					show: {
						operation: [
							'getAthleteStats',
							'getActivity',
							'updateActivity',
							'getActivityLaps',
							'getActivityZones',
							'listActivityComments',
							'listActivityKudoers',
							'getSegment',
							'starSegment',
							'getSegmentEffort',
							'getClub',
							'listClubMembers',
							'listClubAdmins',
							'listClubActivities',
							'getRoute',
							'exportRouteGpx',
							'exportRouteTcx',
							'getActivityStreams',
							'getSegmentEffortStreams',
							'getSegmentStreams',
							'getRouteStreams',
						],
					},
				},
			},
			{ displayName: 'Weight (Kg)', name: 'weight', type: 'number', default: 70, required: true, displayOptions: { show: { operation: ['updateLoggedInAthlete'] } } },
			{ displayName: 'Name', name: 'name', type: 'string', default: '', required: true, displayOptions: { show: { operation: ['createActivity'] } } },
			{ displayName: 'Sport Type', name: 'sport_type', type: 'string', default: 'Run', required: true, description: 'Strava sport type (for example Run, Ride, Walk)', displayOptions: { show: { operation: ['createActivity'] } } },
			{ displayName: 'Legacy Type', name: 'type', type: 'options', default: 'Run', options: [{ name: 'Ride', value: 'Ride' }, { name: 'Run', value: 'Run' }, { name: 'Swim', value: 'Swim' }, { name: 'Workout', value: 'Workout' }], description: 'Legacy type field accepted by Strava', displayOptions: { show: { operation: ['createActivity'] } } },
			{ displayName: 'Start Date Local', name: 'start_date_local', type: 'string', default: '', required: true, description: 'ISO 8601 date-time in local time, e.g. 2018-02-16T14:52:54Z', displayOptions: { show: { operation: ['createActivity', 'listSegmentEfforts'] } } },
			{ displayName: 'Elapsed Time (Seconds)', name: 'elapsed_time', type: 'number', default: 0, required: true, displayOptions: { show: { operation: ['createActivity'] } } },
			{ displayName: 'End Date Local', name: 'end_date_local', type: 'string', default: '', description: 'ISO 8601 local date-time', displayOptions: { show: { operation: ['listSegmentEfforts'] } } },
			{ displayName: 'Include All Efforts', name: 'include_all_efforts', type: 'boolean', default: false, displayOptions: { show: { operation: ['getActivity'] } } },
			{ displayName: 'Before (Unix Seconds)', name: 'before', type: 'number', default: 0, description: 'Only return activities before this Unix timestamp in seconds', displayOptions: { show: { operation: ['listAthleteActivities'] } } },
			{ displayName: 'After (Unix Seconds)', name: 'after', type: 'number', default: 0, description: 'Only return activities after this Unix timestamp in seconds', displayOptions: { show: { operation: ['listAthleteActivities'] } } },
			{ displayName: 'Segment ID', name: 'segment_id', type: 'number', default: 0, required: true, displayOptions: { show: { operation: ['listSegmentEfforts'] } } },
			{ displayName: 'Starred', name: 'starred', type: 'boolean', default: true, required: true, displayOptions: { show: { operation: ['starSegment'] } } },
			{ displayName: 'Activity Type', name: 'activity_type', type: 'options', default: 'riding', options: [{ name: 'Riding', value: 'riding' }, { name: 'Running', value: 'running' }], displayOptions: { show: { operation: ['exploreSegments'] } } },
			{ displayName: 'Southwest Latitude', name: 'sw_lat', type: 'number', typeOptions: { numberPrecision: 6 }, default: 37.7, required: true, displayOptions: { show: { operation: ['exploreSegments'] } } },
			{ displayName: 'Southwest Longitude', name: 'sw_lng', type: 'number', typeOptions: { numberPrecision: 6 }, default: -122.5, required: true, displayOptions: { show: { operation: ['exploreSegments'] } } },
			{ displayName: 'Northeast Latitude', name: 'ne_lat', type: 'number', typeOptions: { numberPrecision: 6 }, default: 37.9, required: true, displayOptions: { show: { operation: ['exploreSegments'] } } },
			{ displayName: 'Northeast Longitude', name: 'ne_lng', type: 'number', typeOptions: { numberPrecision: 6 }, default: -122.3, required: true, displayOptions: { show: { operation: ['exploreSegments'] } } },
			{ displayName: 'Athlete ID', name: 'athleteId', type: 'number', default: 0, required: true, displayOptions: { show: { operation: ['listRoutesByAthlete'] } } },
			{ displayName: 'Upload ID', name: 'uploadId', type: 'number', default: 0, required: true, displayOptions: { show: { operation: ['getUpload'] } } },
			{ displayName: 'Gear ID', name: 'gearId', type: 'string', default: '', required: true, displayOptions: { show: { operation: ['getGear'] } } },
			{ displayName: 'Binary Property', name: 'binaryPropertyName', type: 'string', default: 'data', required: true, displayOptions: { show: { operation: ['exportRouteGpx', 'exportRouteTcx'] } } },
			{ displayName: 'Upload Binary Property', name: 'uploadBinaryProperty', type: 'string', default: 'data', required: true, displayOptions: { show: { operation: ['createUpload'] } } },
			{
				displayName: 'Data Type',
				name: 'data_type',
				type: 'options',
				default: 'fit',
				options: [{ name: 'Fit', value: 'fit' }, { name: 'fit.gz', value: 'fit.gz' }, { name: 'Gpx', value: 'gpx' }, { name: 'gpx.gz', value: 'gpx.gz' }, { name: 'Tcx', value: 'tcx' }, { name: 'tcx.gz', value: 'tcx.gz' }],
				displayOptions: { show: { operation: ['createUpload'] } },
			},
			{
				displayName: 'Keys',
				name: 'keys',
				type: 'multiOptions',
				default: ['time', 'distance'],
				displayOptions: { show: { operation: ['getActivityStreams', 'getSegmentEffortStreams', 'getSegmentStreams'] } },
				options: [{ name: 'Altitude', value: 'altitude' }, { name: 'Cadence', value: 'cadence' }, { name: 'Distance', value: 'distance' }, { name: 'Grade Smooth', value: 'grade_smooth' }, { name: 'Heartrate', value: 'heartrate' }, { name: 'Lat/Lng', value: 'latlng' }, { name: 'Moving', value: 'moving' }, { name: 'Temperature', value: 'temp' }, { name: 'Time', value: 'time' }, { name: 'Velocity Smooth', value: 'velocity_smooth' }, { name: 'Watts', value: 'watts' }],
				required: true,
			},
			{ displayName: 'Key by Type', name: 'key_by_type', type: 'boolean', default: true, required: true, displayOptions: { show: { operation: ['getActivityStreams', 'getSegmentEffortStreams', 'getSegmentStreams'] } } },
			{
				displayName: 'Create Activity Additional Fields',
				name: 'createActivityAdditionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { operation: ['createActivity'] } },
				options: [
					{ displayName: 'Commute', name: 'commute', type: 'boolean', default: false },
					{ displayName: 'Description', name: 'description', type: 'string', default: '' },
					{ displayName: 'Distance (Meters)', name: 'distance', type: 'number', default: 0 },
					{ displayName: 'Trainer', name: 'trainer', type: 'boolean', default: false },
				],
			},
			{
				displayName: 'Update Fields',
				name: 'updateActivityFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { operation: ['updateActivity'] } },
				options: [
					{ displayName: 'Commute', name: 'commute', type: 'boolean', default: false },
					{ displayName: 'Description', name: 'description', type: 'string', default: '' },
					{ displayName: 'Gear ID', name: 'gear_id', type: 'string', default: '' },
					{ displayName: 'Hide From Home', name: 'hide_from_home', type: 'boolean', default: false },
					{ displayName: 'Name', name: 'name', type: 'string', default: '' },
					{ displayName: 'Sport Type', name: 'sport_type', type: 'string', default: '' },
					{ displayName: 'Trainer', name: 'trainer', type: 'boolean', default: false },
					{ displayName: 'Type', name: 'type', type: 'string', default: '' },
				],
			},
			{
				displayName: 'Segment Explore Additional Fields',
				name: 'segmentExploreAdditionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { operation: ['exploreSegments'] } },
				options: [
					{ displayName: 'Max Category', name: 'max_cat', type: 'number', default: 5 },
					{ displayName: 'Min Category', name: 'min_cat', type: 'number', default: 0 },
				],
			},
			{
				displayName: 'Activity Comments Additional Fields',
				name: 'activityCommentsAdditionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { operation: ['listActivityComments'] } },
				options: [
					{ displayName: 'After Cursor', name: 'after_cursor', type: 'string', default: '' },
					{ displayName: 'Page Size', name: 'page_size', type: 'number', default: 30 },
				],
			},
			{
				displayName: 'Upload Additional Fields',
				name: 'uploadAdditionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { operation: ['createUpload'] } },
				options: [
					{ displayName: 'Commute', name: 'commute', type: 'boolean', default: false },
					{ displayName: 'Description', name: 'description', type: 'string', default: '' },
					{ displayName: 'External ID', name: 'external_id', type: 'string', default: '' },
					{ displayName: 'Name', name: 'name', type: 'string', default: '' },
					{ displayName: 'Trainer', name: 'trainer', type: 'boolean', default: false },
				],
			},
			{ displayName: 'Return All', name: 'returnAll', type: 'boolean',
																																																			description: 'Whether to return all results or only up to a given limit', default: false, displayOptions: { show: { operation: paginationOperations } } },
			{ displayName: 'Limit', name: 'limit', type: 'number',
																																										description: 'Max number of results to return', default: 50, typeOptions: { minValue: 1, maxValue: 1000 }, displayOptions: { show: { operation: paginationOperations, returnAll: [false] } } },
			{ displayName: 'Page', name: 'page', type: 'number', default: 1, typeOptions: { minValue: 1 }, displayOptions: { show: { operation: paginationOperations, returnAll: [false] } } },
			{ displayName: 'Per Page', name: 'per_page', type: 'number', default: 30, typeOptions: { minValue: 1, maxValue: 200 }, displayOptions: { show: { operation: paginationOperations } } },
		] as INodeProperties[],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const resource = this.getNodeParameter('resource', itemIndex) as string;
				const operation = this.getNodeParameter('operation', itemIndex) as string;
				let responseData: IDataObject | IDataObject[] = {};

				if (resource === 'athlete') {
					if (operation === 'getLoggedInAthlete') responseData = (await stravaApiRequest.call(this, 'GET', '/athlete')) as IDataObject;
					if (operation === 'getAthleteStats') responseData = (await stravaApiRequest.call(this, 'GET', `/athletes/${this.getNodeParameter('id', itemIndex) as number}/stats`)) as IDataObject;
					if (operation === 'updateLoggedInAthlete') responseData = (await stravaApiRequest.call(this, 'PUT', '/athlete', { form: { weight: this.getNodeParameter('weight', itemIndex) as number } })) as IDataObject;
					if (operation === 'getLoggedInAthleteZones') responseData = (await stravaApiRequest.call(this, 'GET', '/athlete/zones')) as IDataObject;
				}

				if (resource === 'activity') {
					const id = this.getNodeParameter('id', itemIndex, 0) as number;
					if (operation === 'createActivity') {
						const additional = this.getNodeParameter('createActivityAdditionalFields', itemIndex) as IDataObject;
						responseData = (await stravaApiRequest.call(this, 'POST', '/activities', {
							form: { ...additional, name: this.getNodeParameter('name', itemIndex) as string, type: this.getNodeParameter('type', itemIndex) as string, sport_type: this.getNodeParameter('sport_type', itemIndex) as string, start_date_local: this.getNodeParameter('start_date_local', itemIndex) as string, elapsed_time: this.getNodeParameter('elapsed_time', itemIndex) as number, ...(typeof additional.commute === 'boolean' ? { commute: additional.commute ? 1 : 0 } : {}), ...(typeof additional.trainer === 'boolean' ? { trainer: additional.trainer ? 1 : 0 } : {}) },
						})) as IDataObject;
					}
					if (operation === 'getActivity') responseData = (await stravaApiRequest.call(this, 'GET', `/activities/${id}`, { qs: { include_all_efforts: this.getNodeParameter('include_all_efforts', itemIndex) as boolean } })) as IDataObject;
					if (operation === 'updateActivity') responseData = (await stravaApiRequest.call(this, 'PUT', `/activities/${id}`, { body: this.getNodeParameter('updateActivityFields', itemIndex) as IDataObject })) as IDataObject;
					if (operation === 'getActivityLaps') responseData = (await stravaApiRequest.call(this, 'GET', `/activities/${id}/laps`)) as IDataObject[];
					if (operation === 'getActivityZones') responseData = (await stravaApiRequest.call(this, 'GET', `/activities/${id}/zones`)) as IDataObject[];
					if (operation === 'listAthleteActivities') {
						const before = this.getNodeParameter('before', itemIndex) as number;
						const after = this.getNodeParameter('after', itemIndex) as number;
						const perPage = this.getNodeParameter('per_page', itemIndex) as number;
						const qs: IDataObject = { ...(before ? { before } : {}), ...(after ? { after } : {}) };
						responseData = (this.getNodeParameter('returnAll', itemIndex) as boolean)
							? await stravaApiRequestAllItems.call(this, '/athlete/activities', qs, perPage)
							: ((await stravaApiRequest.call(this, 'GET', '/athlete/activities', { qs: { ...qs, page: this.getNodeParameter('page', itemIndex) as number, per_page: Math.min(this.getNodeParameter('limit', itemIndex) as number, perPage) } })) as IDataObject[]).slice(0, this.getNodeParameter('limit', itemIndex) as number);
					}
					if (operation === 'listActivityComments' || operation === 'listActivityKudoers') {
						const perPage = this.getNodeParameter('per_page', itemIndex) as number;
						const endpoint = operation === 'listActivityComments' ? `/activities/${id}/comments` : `/activities/${id}/kudos`;
						const additional = operation === 'listActivityComments' ? (this.getNodeParameter('activityCommentsAdditionalFields', itemIndex) as IDataObject) : {};
						responseData = (this.getNodeParameter('returnAll', itemIndex) as boolean)
							? await stravaApiRequestAllItems.call(this, endpoint, {}, perPage)
							: ((await stravaApiRequest.call(this, 'GET', endpoint, { qs: { page: this.getNodeParameter('page', itemIndex) as number, per_page: Math.min(this.getNodeParameter('limit', itemIndex) as number, perPage), ...additional } })) as IDataObject[]).slice(0, this.getNodeParameter('limit', itemIndex) as number);
					}
				}

				if (resource === 'segment') {
					const id = this.getNodeParameter('id', itemIndex, 0) as number;
					if (operation === 'getSegment') responseData = (await stravaApiRequest.call(this, 'GET', `/segments/${id}`)) as IDataObject;
					if (operation === 'listStarredSegments') {
						const perPage = this.getNodeParameter('per_page', itemIndex) as number;
						responseData = (this.getNodeParameter('returnAll', itemIndex) as boolean)
							? await stravaApiRequestAllItems.call(this, '/segments/starred', {}, perPage)
							: ((await stravaApiRequest.call(this, 'GET', '/segments/starred', { qs: { page: this.getNodeParameter('page', itemIndex) as number, per_page: Math.min(this.getNodeParameter('limit', itemIndex) as number, perPage) } })) as IDataObject[]).slice(0, this.getNodeParameter('limit', itemIndex) as number);
					}
					if (operation === 'starSegment') responseData = (await stravaApiRequest.call(this, 'PUT', `/segments/${id}/starred`, { form: { starred: this.getNodeParameter('starred', itemIndex) as boolean } })) as IDataObject;
					if (operation === 'exploreSegments') {
						const additional = this.getNodeParameter('segmentExploreAdditionalFields', itemIndex) as IDataObject;
						const bounds = `${this.getNodeParameter('sw_lat', itemIndex) as number},${this.getNodeParameter('sw_lng', itemIndex) as number},${this.getNodeParameter('ne_lat', itemIndex) as number},${this.getNodeParameter('ne_lng', itemIndex) as number}`;
						responseData = (await stravaApiRequest.call(this, 'GET', '/segments/explore', { qs: { bounds, activity_type: this.getNodeParameter('activity_type', itemIndex) as string, ...additional } })) as IDataObject;
					}
				}

				if (resource === 'segmentEffort') {
					if (operation === 'getSegmentEffort') responseData = (await stravaApiRequest.call(this, 'GET', `/segment_efforts/${this.getNodeParameter('id', itemIndex) as number}`)) as IDataObject;
					if (operation === 'listSegmentEfforts') {
						const perPage = this.getNodeParameter('per_page', itemIndex) as number;
						const qs: IDataObject = { segment_id: this.getNodeParameter('segment_id', itemIndex) as number, ...(this.getNodeParameter('start_date_local', itemIndex) ? { start_date_local: this.getNodeParameter('start_date_local', itemIndex) as string } : {}), ...(this.getNodeParameter('end_date_local', itemIndex) ? { end_date_local: this.getNodeParameter('end_date_local', itemIndex) as string } : {}) };
						responseData = (this.getNodeParameter('returnAll', itemIndex) as boolean)
							? await stravaApiRequestAllItems.call(this, '/segment_efforts', qs, perPage)
							: ((await stravaApiRequest.call(this, 'GET', '/segment_efforts', { qs: { ...qs, page: this.getNodeParameter('page', itemIndex) as number, per_page: Math.min(this.getNodeParameter('limit', itemIndex) as number, perPage) } })) as IDataObject[]).slice(0, this.getNodeParameter('limit', itemIndex) as number);
					}
				}

				if (resource === 'club') {
					if (operation === 'getClub') responseData = (await stravaApiRequest.call(this, 'GET', `/clubs/${this.getNodeParameter('id', itemIndex) as number}`)) as IDataObject;
					if (operation === 'listAthleteClubs') {
						const perPage = this.getNodeParameter('per_page', itemIndex) as number;
						responseData = (this.getNodeParameter('returnAll', itemIndex) as boolean)
							? await stravaApiRequestAllItems.call(this, '/athlete/clubs', {}, perPage)
							: ((await stravaApiRequest.call(this, 'GET', '/athlete/clubs', { qs: { page: this.getNodeParameter('page', itemIndex) as number, per_page: Math.min(this.getNodeParameter('limit', itemIndex) as number, perPage) } })) as IDataObject[]).slice(0, this.getNodeParameter('limit', itemIndex) as number);
					}
					if (['listClubMembers', 'listClubAdmins', 'listClubActivities'].includes(operation)) {
						const id = this.getNodeParameter('id', itemIndex) as number;
						const endpointMap: Record<string, string> = { listClubMembers: `/clubs/${id}/members`, listClubAdmins: `/clubs/${id}/admins`, listClubActivities: `/clubs/${id}/activities` };
						const perPage = this.getNodeParameter('per_page', itemIndex) as number;
						responseData = (this.getNodeParameter('returnAll', itemIndex) as boolean)
							? await stravaApiRequestAllItems.call(this, endpointMap[operation], {}, perPage)
							: ((await stravaApiRequest.call(this, 'GET', endpointMap[operation], { qs: { page: this.getNodeParameter('page', itemIndex) as number, per_page: Math.min(this.getNodeParameter('limit', itemIndex) as number, perPage) } })) as IDataObject[]).slice(0, this.getNodeParameter('limit', itemIndex) as number);
					}
				}

				if (resource === 'gear') responseData = (await stravaApiRequest.call(this, 'GET', `/gear/${this.getNodeParameter('gearId', itemIndex) as string}`)) as IDataObject;

				if (resource === 'route') {
					if (operation === 'getRoute') responseData = (await stravaApiRequest.call(this, 'GET', `/routes/${this.getNodeParameter('id', itemIndex) as number}`)) as IDataObject;
					if (operation === 'listRoutesByAthlete') {
						const id = this.getNodeParameter('athleteId', itemIndex) as number;
						const perPage = this.getNodeParameter('per_page', itemIndex) as number;
						responseData = (this.getNodeParameter('returnAll', itemIndex) as boolean)
							? await stravaApiRequestAllItems.call(this, `/athletes/${id}/routes`, {}, perPage)
							: ((await stravaApiRequest.call(this, 'GET', `/athletes/${id}/routes`, { qs: { page: this.getNodeParameter('page', itemIndex) as number, per_page: Math.min(this.getNodeParameter('limit', itemIndex) as number, perPage) } })) as IDataObject[]).slice(0, this.getNodeParameter('limit', itemIndex) as number);
					}
					if (operation === 'exportRouteGpx' || operation === 'exportRouteTcx') {
						const id = this.getNodeParameter('id', itemIndex) as number;
						const extension = operation === 'exportRouteGpx' ? 'gpx' : 'tcx';
						const binaryData = await stravaDownloadAsBinary.call(this, `/routes/${id}/export_${extension}`, `route-${id}.${extension}`, operation === 'exportRouteGpx' ? 'application/gpx+xml' : 'application/vnd.garmin.tcx+xml');
						returnData.push({ json: { id, format: extension }, binary: { [this.getNodeParameter('binaryPropertyName', itemIndex) as string]: binaryData }, pairedItem: { item: itemIndex } });
						continue;
					}
				}

				if (resource === 'upload') {
					if (operation === 'createUpload') {
						const binaryProperty = this.getNodeParameter('uploadBinaryProperty', itemIndex) as string;
						const dataType = this.getNodeParameter('data_type', itemIndex) as string;
						const additional = this.getNodeParameter('uploadAdditionalFields', itemIndex) as IDataObject;
						const binaryData = await this.helpers.getBinaryDataBuffer(itemIndex, binaryProperty);
						const fileName = (items[itemIndex].binary?.[binaryProperty]?.fileName as string | undefined) ?? `upload.${dataType}`;
						responseData = (await stravaApiRequest.call(this, 'POST', '/uploads', {
							formData: {
								file: { value: binaryData, options: { filename: fileName } },
								data_type: dataType,
								...additional,
								// Swagger marks these as strings in multipart; Strava accepts boolean-like 0/1 values.
								...(typeof additional.commute === 'boolean' ? { commute: additional.commute ? '1' : '0' } : {}),
								...(typeof additional.trainer === 'boolean' ? { trainer: additional.trainer ? '1' : '0' } : {}),
							},
							json: false,
						})) as IDataObject;
					}
					if (operation === 'getUpload') responseData = (await stravaApiRequest.call(this, 'GET', `/uploads/${this.getNodeParameter('uploadId', itemIndex) as number}`)) as IDataObject;
				}

				if (resource === 'stream') {
					const id = this.getNodeParameter('id', itemIndex) as number;
					if (operation === 'getRouteStreams') responseData = (await stravaApiRequest.call(this, 'GET', `/routes/${id}/streams`)) as IDataObject;
					if (['getActivityStreams', 'getSegmentEffortStreams', 'getSegmentStreams'].includes(operation)) {
						const endpointMap: Record<string, string> = { getActivityStreams: `/activities/${id}/streams`, getSegmentEffortStreams: `/segment_efforts/${id}/streams`, getSegmentStreams: `/segments/${id}/streams` };
						responseData = (await stravaApiRequest.call(this, 'GET', endpointMap[operation], { qs: { keys: (this.getNodeParameter('keys', itemIndex) as string[]).join(','), key_by_type: this.getNodeParameter('key_by_type', itemIndex) as boolean } })) as IDataObject;
					}
				}

				appendResponse(returnData, itemIndex, responseData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: itemIndex } });
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex });
			}
		}

		return [returnData];
	}
}
