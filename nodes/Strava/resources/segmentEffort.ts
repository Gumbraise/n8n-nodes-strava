import type { INodeProperties } from 'n8n-workflow';

export const segmentEffortOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['segmentEffort'] } },
		options: [
			{
				name: 'Get Segment Effort',
				value: 'getSegmentEffortById',
				description: 'Return a segment effort from an activity owned by the authenticated athlete',
				action: 'Get segment effort',
			},
			{
				name: 'List Segment Efforts',
				value: 'getEffortsBySegmentId',
				description:
					"Return the authenticated athlete's segment efforts for a given segment. Requires subscription.",
				action: 'List segment efforts',
			},
		],
		default: 'getEffortsBySegmentId',
	},
];

export const segmentEffortFields: INodeProperties[] = [
	// ── getSegmentEffortById ──────────────────────────────────────────────────
	{
		displayName: 'Segment Effort ID',
		name: 'segmentEffortId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: { resource: ['segmentEffort'], operation: ['getSegmentEffortById'] },
		},
		description: 'The identifier of the segment effort',
	},

	// ── getEffortsBySegmentId ─────────────────────────────────────────────────
	{
		displayName: 'Segment ID',
		name: 'segmentId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: { resource: ['segmentEffort'], operation: ['getEffortsBySegmentId'] },
		},
		description: 'The identifier of the segment',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: { resource: ['segmentEffort'], operation: ['getEffortsBySegmentId'] },
		},
		options: [
			{
				displayName: 'End Date (Local)',
				name: 'end_date_local',
				type: 'string',
				default: '',
				placeholder: '2024-12-31T23:59:59Z',
				description: 'ISO 8601 formatted date time. Filter efforts before this time.',
			},
			{
				displayName: 'Per Page',
				name: 'per_page',
				type: 'number',
				default: 30,
				description: 'Number of items per page. Defaults to 30.',
			},
			{
				displayName: 'Start Date (Local)',
				name: 'start_date_local',
				type: 'string',
				default: '',
				placeholder: '2024-01-01T00:00:00Z',
				description: 'ISO 8601 formatted date time. Filter efforts after this time.',
			},
		],
	},
];
