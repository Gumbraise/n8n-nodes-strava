import type { INodeProperties } from 'n8n-workflow';

export const clubOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['club'] } },
		options: [
			{
				name: 'Get Club',
				value: 'getClubById',
				description: 'Return a given club using its identifier',
				action: 'Get club',
			},
			{
				name: 'List Activities',
				value: 'getClubActivitiesById',
				description: 'Return the recent activities performed by members of a specific club',
				action: 'List club activities',
			},
			{
				name: 'List Admins',
				value: 'getClubAdminsById',
				description: 'Return a list of the administrators of a given club',
				action: 'List club admins',
			},
			{
				name: 'List Athlete Clubs',
				value: 'getLoggedInAthleteClubs',
				description: "Return the clubs the authenticated athlete belongs to. Requires profile:read_all.",
				action: 'List athlete clubs',
			},
			{
				name: 'List Members',
				value: 'getClubMembersById',
				description: 'Return a list of the members of a given club',
				action: 'List club members',
			},
		],
		default: 'getClubById',
	},
];

export const clubFields: INodeProperties[] = [
	// ── getClubById ───────────────────────────────────────────────────────────
	{
		displayName: 'Club ID',
		name: 'clubId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: { show: { resource: ['club'], operation: ['getClubById'] } },
		description: 'The identifier of the club',
	},

	// ── getClubActivitiesById, getClubAdminsById, getClubMembersById ──────────
	{
		displayName: 'Club ID',
		name: 'clubId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: ['club'],
				operation: ['getClubActivitiesById', 'getClubAdminsById', 'getClubMembersById'],
			},
		},
		description: 'The identifier of the club',
	},
	{
		displayName: 'Pagination',
		name: 'pagination',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['club'],
				operation: ['getClubActivitiesById', 'getClubAdminsById', 'getClubMembersById'],
			},
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

	// ── getLoggedInAthleteClubs ───────────────────────────────────────────────
	{
		displayName: 'Pagination',
		name: 'pagination',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: { resource: ['club'], operation: ['getLoggedInAthleteClubs'] },
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
