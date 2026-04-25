import type { INodeProperties } from 'n8n-workflow';

export const routeOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['route'] } },
		options: [
			{
				name: 'Export as GPX',
				value: 'getRouteAsGPX',
				description: 'Return a GPX file of the route. Requires read_all scope.',
				action: 'Export route as GPX',
			},
			{
				name: 'Export as TCX',
				value: 'getRouteAsTCX',
				description: 'Return a TCX file of the route. Requires read_all scope.',
				action: 'Export route as TCX',
			},
			{
				name: 'Get Route',
				value: 'getRouteById',
				description: 'Return a route using its identifier. Requires read_all scope.',
				action: 'Get route',
			},
			{
				name: 'List Athlete Routes',
				value: 'getRoutesByAthleteId',
				description: 'Return the routes created by the given athlete. Requires read_all scope.',
				action: 'List athlete routes',
			},
		],
		default: 'getRouteById',
	},
];

export const routeFields: INodeProperties[] = [
	// ── getRouteById, getRouteAsGPX, getRouteAsTCX ────────────────────────────
	{
		displayName: 'Route ID',
		name: 'routeId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: ['route'],
				operation: ['getRouteById', 'getRouteAsGPX', 'getRouteAsTCX'],
			},
		},
		description: 'The identifier of the route',
	},

	// ── getRouteAsGPX / getRouteAsTCX – binary output property name ──────────
	{
		displayName: 'Put Output File in Field',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		displayOptions: {
			show: {
				resource: ['route'],
				operation: ['getRouteAsGPX', 'getRouteAsTCX'],
			},
		},
		description: 'The name of the output binary field that will contain the file data',
	},

	// ── getRoutesByAthleteId ──────────────────────────────────────────────────
	{
		displayName: 'Athlete ID',
		name: 'athleteId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: { resource: ['route'], operation: ['getRoutesByAthleteId'] },
		},
		description: 'The identifier of the athlete whose routes to list',
	},
	{
		displayName: 'Pagination',
		name: 'pagination',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: ['route'], operation: ['getRoutesByAthleteId'] } },
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
