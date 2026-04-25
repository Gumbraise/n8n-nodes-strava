import type { INodeProperties } from 'n8n-workflow';

export const uploadOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['upload'] } },
		options: [
			{
				name: 'Get Upload',
				value: 'getUploadById',
				description: 'Return the upload details for a given upload. Requires activity:write.',
				action: 'Get upload',
			},
			{
				name: 'Upload Activity',
				value: 'createUpload',
				description:
					'Upload a .fit, .tcx, .gpx or compressed activity file. Requires activity:write.',
				action: 'Upload activity',
			},
		],
		default: 'createUpload',
	},
];

export const uploadFields: INodeProperties[] = [
	// ── getUploadById ─────────────────────────────────────────────────────────
	{
		displayName: 'Upload ID',
		name: 'uploadId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: { show: { resource: ['upload'], operation: ['getUploadById'] } },
		description: 'The identifier of the upload',
	},

	// ── createUpload ──────────────────────────────────────────────────────────
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		displayOptions: { show: { resource: ['upload'], operation: ['createUpload'] } },
		description: 'The name of the input binary field that contains the activity file to upload',
	},
	{
		displayName: 'Data Type',
		name: 'data_type',
		type: 'options',
		required: true,
		default: 'fit',
		displayOptions: { show: { resource: ['upload'], operation: ['createUpload'] } },
		options: [
			{ name: 'Fit', value: 'fit' },
			{ name: 'fit.gz', value: 'fit.gz' },
			{ name: 'Gpx', value: 'gpx' },
			{ name: 'gpx.gz', value: 'gpx.gz' },
			{ name: 'Tcx', value: 'tcx' },
			{ name: 'tcx.gz', value: 'tcx.gz' },
		],
		description: 'The format of the uploaded file',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['upload'], operation: ['createUpload'] } },
		options: [
			{
				displayName: 'Activity Type',
				name: 'activity_type',
				type: 'string',
				default: '',
				placeholder: 'ride',
				description:
					'The desired activity type. If not provided, may be detected from the activity file.',
			},
			{
				displayName: 'Commute',
				name: 'commute',
				type: 'boolean',
				default: false,
				description: 'Whether the activity is a commute',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'The desired description of the resulting activity',
			},
			{
				displayName: 'External ID',
				name: 'external_id',
				type: 'string',
				default: '',
				description:
					'The desired external identifier of the resulting activity. Unique per-athlete.',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The desired name of the resulting activity',
			},
			{
				displayName: 'Trainer',
				name: 'trainer',
				type: 'boolean',
				default: false,
				description: 'Whether the activity was performed on a stationary trainer',
			},
		],
	},
];
