import type { INodeProperties } from 'n8n-workflow';

const activityStreamKeyOptions = [
	{ name: 'Altitude', value: 'altitude' },
	{ name: 'Cadence', value: 'cadence' },
	{ name: 'Distance', value: 'distance' },
	{ name: 'Grade Smooth', value: 'grade_smooth' },
	{ name: 'Heartrate', value: 'heartrate' },
	{ name: 'Lat/Lng', value: 'latlng' },
	{ name: 'Moving', value: 'moving' },
	{ name: 'Temperature', value: 'temp' },
	{ name: 'Time', value: 'time' },
	{ name: 'Velocity Smooth', value: 'velocity_smooth' },
	{ name: 'Watts', value: 'watts' },
];

const segmentStreamKeyOptions = [
	{ name: 'Altitude', value: 'altitude' },
	{ name: 'Distance', value: 'distance' },
	{ name: 'Lat/Lng', value: 'latlng' },
];

export const streamOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['stream'] } },
		options: [
			{
				name: 'Get Activity Streams',
				value: 'getActivityStreams',
				description: 'Return a set of streams for the given activity',
				action: 'Get activity streams',
			},
			{
				name: 'Get Route Streams',
				value: 'getRouteStreams',
				description:
					'Return the distance, altitude, and coordinates of a route. Requires read_all.',
				action: 'Get route streams',
			},
			{
				name: 'Get Segment Effort Streams',
				value: 'getSegmentEffortStreams',
				description: 'Return a set of streams for a segment effort',
				action: 'Get segment effort streams',
			},
			{
				name: 'Get Segment Streams',
				value: 'getSegmentStreams',
				description: 'Return a set of streams for a segment. Requires read_all.',
				action: 'Get segment streams',
			},
		],
		default: 'getActivityStreams',
	},
];

export const streamFields: INodeProperties[] = [
	// ── getActivityStreams ────────────────────────────────────────────────────
	{
		displayName: 'Activity ID',
		name: 'activityId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: { show: { resource: ['stream'], operation: ['getActivityStreams'] } },
		description: 'The identifier of the activity',
	},
	{
		displayName: 'Stream Keys',
		name: 'keys',
		type: 'multiOptions',
		required: true,
		default: [],
		displayOptions: { show: { resource: ['stream'], operation: ['getActivityStreams'] } },
		options: activityStreamKeyOptions,
		description: 'Types of streams to return',
	},
	{
		displayName: 'Key By Type',
		name: 'key_by_type',
		type: 'boolean',
		default: true,
		displayOptions: { show: { resource: ['stream'], operation: ['getActivityStreams'] } },
		description: 'Whether to return a dictionary of stream type to stream values',
	},

	// ── getSegmentEffortStreams ────────────────────────────────────────────────
	{
		displayName: 'Segment Effort ID',
		name: 'segmentEffortId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: { resource: ['stream'], operation: ['getSegmentEffortStreams'] },
		},
		description: 'The identifier of the segment effort',
	},
	{
		displayName: 'Stream Keys',
		name: 'keys',
		type: 'multiOptions',
		required: true,
		default: [],
		displayOptions: {
			show: { resource: ['stream'], operation: ['getSegmentEffortStreams'] },
		},
		options: activityStreamKeyOptions,
		description: 'Types of streams to return',
	},
	{
		displayName: 'Key By Type',
		name: 'key_by_type',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: { resource: ['stream'], operation: ['getSegmentEffortStreams'] },
		},
		description: 'Whether to return a dictionary of stream type to stream values',
	},

	// ── getSegmentStreams ──────────────────────────────────────────────────────
	{
		displayName: 'Segment ID',
		name: 'segmentId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: { show: { resource: ['stream'], operation: ['getSegmentStreams'] } },
		description: 'The identifier of the segment',
	},
	{
		displayName: 'Stream Keys',
		name: 'keys',
		type: 'multiOptions',
		required: true,
		default: [],
		displayOptions: { show: { resource: ['stream'], operation: ['getSegmentStreams'] } },
		options: segmentStreamKeyOptions,
		description: 'Types of streams to return',
	},
	{
		displayName: 'Key By Type',
		name: 'key_by_type',
		type: 'boolean',
		default: true,
		displayOptions: { show: { resource: ['stream'], operation: ['getSegmentStreams'] } },
		description: 'Whether to return a dictionary of stream type to stream values',
	},

	// ── getRouteStreams ────────────────────────────────────────────────────────
	{
		displayName: 'Route ID',
		name: 'routeId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: { show: { resource: ['stream'], operation: ['getRouteStreams'] } },
		description: 'The identifier of the route',
	},
];
