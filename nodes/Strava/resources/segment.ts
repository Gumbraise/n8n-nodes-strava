import type { INodeProperties } from 'n8n-workflow';

export const segmentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['segment'] } },
		options: [
			{
				name: 'Explore Segments',
				value: 'exploreSegments',
				description: 'Return the top 10 segments matching a specified query',
				action: 'Explore segments',
			},
			{
				name: 'Get Segment',
				value: 'getSegmentById',
				description:
					'Return the specified segment. read_all scope required for private segments.',
				action: 'Get segment',
			},
			{
				name: 'List Starred Segments',
				value: 'getLoggedInAthleteStarredSegments',
				description:
					"Return the authenticated athlete's starred segments. Requires read_all for private.",
				action: 'List starred segments',
			},
			{
				name: 'Star Segment',
				value: 'starSegment',
				description: 'Star or unstar a segment for the authenticated athlete. Requires profile:write.',
				action: 'Star segment',
			},
		],
		default: 'getSegmentById',
	},
];

export const segmentFields: INodeProperties[] = [
	// ── getSegmentById ────────────────────────────────────────────────────────
	{
		displayName: 'Segment ID',
		name: 'segmentId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: { show: { resource: ['segment'], operation: ['getSegmentById'] } },
		description: 'The identifier of the segment',
	},

	// ── getLoggedInAthleteStarredSegments ─────────────────────────────────────
	{
		displayName: 'Pagination',
		name: 'pagination',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: { resource: ['segment'], operation: ['getLoggedInAthleteStarredSegments'] },
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

	// ── starSegment ───────────────────────────────────────────────────────────
	{
		displayName: 'Segment ID',
		name: 'segmentId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: { show: { resource: ['segment'], operation: ['starSegment'] } },
		description: 'The identifier of the segment to star',
	},
	{
		displayName: 'Starred',
		name: 'starred',
		type: 'boolean',
		required: true,
		default: false,
		displayOptions: { show: { resource: ['segment'], operation: ['starSegment'] } },
		description: 'Whether to star the segment. Set to false to unstar.',
	},

	// ── exploreSegments ───────────────────────────────────────────────────────
	{
		displayName: 'Bounds',
		name: 'bounds',
		type: 'string',
		required: true,
		default: '',
		placeholder: '37.791264,-122.405480,37.842023,-122.273748',
		displayOptions: { show: { resource: ['segment'], operation: ['exploreSegments'] } },
		description: 'Comma-separated lat/lng for two bounding box corners: sw_lat,sw_lng,ne_lat,ne_lng',
	},
	{
		displayName: 'Additional Filters',
		name: 'additionalFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['segment'], operation: ['exploreSegments'] } },
		options: [
			{
				displayName: 'Activity Type',
				name: 'activity_type',
				type: 'options',
				default: 'riding',
				options: [
					{ name: 'Riding', value: 'riding' },
					{ name: 'Running', value: 'running' },
				],
				description: 'Desired activity type',
			},
			{
				displayName: 'Max Climbing Category',
				name: 'max_cat',
				type: 'number',
				default: 5,
				description: 'The maximum climbing category (0–5)',
			},
			{
				displayName: 'Min Climbing Category',
				name: 'min_cat',
				type: 'number',
				default: 0,
				description: 'The minimum climbing category (0–5)',
			},
		],
	},
];
