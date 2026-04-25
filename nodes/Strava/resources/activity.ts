import type { INodeProperties } from 'n8n-workflow';

export const activityOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['activity'] } },
		options: [
			{
				name: 'Create Activity',
				value: 'createActivity',
				description: 'Create a manual activity for an athlete. Requires activity:write.',
				action: 'Create activity',
			},
			{
				name: 'Get Activity',
				value: 'getActivityById',
				description: 'Return the given activity owned by the authenticated athlete',
				action: 'Get activity',
			},
			{
				name: 'Get Kudoers',
				value: 'getKudoersByActivityId',
				description: 'Return the athletes who kudoed an activity',
				action: 'Get kudoers by activity',
			},
			{
				name: 'Get Laps',
				value: 'getLapsByActivityId',
				description: 'Return the laps of an activity',
				action: 'Get laps by activity',
			},
			{
				name: 'Get Zones',
				value: 'getZonesByActivityId',
				description: 'Return the zones of a given activity. Summit Feature.',
				action: 'Get zones by activity',
			},
			{
				name: 'List Activities',
				value: 'getLoggedInAthleteActivities',
				description:
					'Return the activities of the authenticated athlete. Requires activity:read.',
				action: 'List activities',
			},
			{
				name: 'List Comments',
				value: 'getCommentsByActivityId',
				description: 'Return the comments on the given activity',
				action: 'List comments by activity',
			},
			{
				name: 'Update Activity',
				value: 'updateActivityById',
				description:
					'Update the given activity owned by the authenticated athlete. Requires activity:write.',
				action: 'Update activity',
			},
		],
		default: 'getActivityById',
	},
];

export const activityFields: INodeProperties[] = [
	// ── createActivity – required fields ──────────────────────────────────────
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['activity'], operation: ['createActivity'] } },
		description: 'The name of the activity',
	},
	{
		displayName: 'Sport Type',
		name: 'sport_type',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'Run, Ride, MountainBikeRide…',
		displayOptions: { show: { resource: ['activity'], operation: ['createActivity'] } },
		description: 'Sport type of the activity (e.g. Run, MountainBikeRide, Ride)',
	},
	{
		displayName: 'Start Date (Local)',
		name: 'start_date_local',
		type: 'string',
		required: true,
		default: '',
		placeholder: '2024-01-01T08:00:00Z',
		displayOptions: { show: { resource: ['activity'], operation: ['createActivity'] } },
		description: 'ISO 8601 formatted date time representing the local start time',
	},
	{
		displayName: 'Elapsed Time (Seconds)',
		name: 'elapsed_time',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: { show: { resource: ['activity'], operation: ['createActivity'] } },
		description: 'Duration of the activity in seconds',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['activity'], operation: ['createActivity'] } },
		options: [
			{
				displayName: 'Commute',
				name: 'commute',
				type: 'boolean',
				default: false,
				description: 'Whether to mark the activity as a commute',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the activity',
			},
			{
				displayName: 'Distance (Meters)',
				name: 'distance',
				type: 'number',
				default: 0,
				description: 'Distance of the activity in meters',
			},
			{
				displayName: 'Trainer',
				name: 'trainer',
				type: 'boolean',
				default: false,
				description: 'Whether to mark the activity as a trainer activity',
			},
			{
				displayName: 'Type (Deprecated)',
				name: 'type',
				type: 'string',
				default: '',
				placeholder: 'Ride',
				description:
					'Deprecated. Use Sport Type instead. Type of activity, e.g. Run, Ride.',
			},
		],
	},

	// ── getActivityById ───────────────────────────────────────────────────────
	{
		displayName: 'Activity ID',
		name: 'activityId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['getActivityById', 'getLapsByActivityId', 'getZonesByActivityId'],
			},
		},
		description: 'The identifier of the activity',
	},
	{
		displayName: 'Include All Efforts',
		name: 'include_all_efforts',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['activity'], operation: ['getActivityById'] } },
		description: 'Whether to include all segment efforts',
	},

	// ── updateActivityById ────────────────────────────────────────────────────
	{
		displayName: 'Activity ID',
		name: 'activityId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: { show: { resource: ['activity'], operation: ['updateActivityById'] } },
		description: 'The identifier of the activity',
	},
	{
		displayName: 'Fields to Update',
		name: 'body',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['activity'], operation: ['updateActivityById'] } },
		options: [
			{
				displayName: 'Commute',
				name: 'commute',
				type: 'boolean',
				default: false,
				description: 'Whether this activity is a commute',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'The description of the activity',
			},
			{
				displayName: 'Gear ID',
				name: 'gear_id',
				type: 'string',
				default: '',
				description:
					'Identifier for the gear associated with the activity. Provide "none" to clear.',
			},
			{
				displayName: 'Hide From Home',
				name: 'hide_from_home',
				type: 'boolean',
				default: false,
				description: 'Whether to exclude the activity from the athlete\'s home feed',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name of the activity',
			},
			{
				displayName: 'Sport Type',
				name: 'sport_type',
				type: 'string',
				default: '',
				placeholder: 'Run, Ride, MountainBikeRide…',
				description: 'Sport type of the activity',
			},
			{
				displayName: 'Trainer',
				name: 'trainer',
				type: 'boolean',
				default: false,
				description: 'Whether this activity was performed on a trainer',
			},
			{
				displayName: 'Type (Deprecated)',
				name: 'type',
				type: 'string',
				default: '',
				description: 'Deprecated. Use Sport Type instead.',
			},
		],
	},

	// ── getLoggedInAthleteActivities ──────────────────────────────────────────
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: { resource: ['activity'], operation: ['getLoggedInAthleteActivities'] },
		},
		options: [
			{
				displayName: 'After (Epoch)',
				name: 'after',
				type: 'number',
				default: 0,
				description:
					'Epoch timestamp. Only return activities that have taken place after this time.',
			},
			{
				displayName: 'Before (Epoch)',
				name: 'before',
				type: 'number',
				default: 0,
				description:
					'Epoch timestamp. Only return activities that have taken place before this time.',
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				default: 1,
				description: 'Page number. Defaults to 1.',
			},
			{
				displayName: 'Per Page',
				name: 'per_page',
				type: 'number',
				default: 30,
				description: 'Number of items per page. Defaults to 30.',
			},
		],
	},

	// ── getCommentsByActivityId ───────────────────────────────────────────────
	{
		displayName: 'Activity ID',
		name: 'activityId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: { resource: ['activity'], operation: ['getCommentsByActivityId'] },
		},
		description: 'The identifier of the activity',
	},
	{
		displayName: 'Pagination',
		name: 'pagination',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: { resource: ['activity'], operation: ['getCommentsByActivityId'] },
		},
		options: [
			{
				displayName: 'After Cursor',
				name: 'after_cursor',
				type: 'string',
				default: '',
				description:
					'Cursor of the last item in the previous page of results. Used to request the subsequent page.',
			},
			{
				displayName: 'Page Size',
				name: 'page_size',
				type: 'number',
				default: 30,
				description: 'Number of items per page. Defaults to 30.',
			},
		],
	},

	// ── getKudoersByActivityId ────────────────────────────────────────────────
	{
		displayName: 'Activity ID',
		name: 'activityId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: { resource: ['activity'], operation: ['getKudoersByActivityId'] },
		},
		description: 'The identifier of the activity',
	},
	{
		displayName: 'Pagination',
		name: 'pagination',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: { resource: ['activity'], operation: ['getKudoersByActivityId'] },
		},
		options: [
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				default: 1,
				description: 'Page number. Defaults to 1.',
			},
			{
				displayName: 'Per Page',
				name: 'per_page',
				type: 'number',
				default: 30,
				description: 'Number of items per page. Defaults to 30.',
			},
		],
	},
];
