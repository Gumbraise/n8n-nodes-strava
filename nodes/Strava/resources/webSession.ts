import type { INodeProperties } from 'n8n-workflow';

export const webSessionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['webSession'] } },
		options: [
			{
				name: 'Get Activity Group Athletes',
				value: 'getActivityGroupAthletes',
				description:
					'[Undocumented] Return athletes who share a group activity. Requires a valid Strava web session cookie.',
				action: 'Get activity group athletes',
			},
			{
				name: 'Get Activity Kudos Extended',
				value: 'getActivityKudosExtended',
				description:
					'[Undocumented] Return extended kudos data including athlete profiles. Requires a valid Strava web session cookie.',
				action: 'Get activity kudos extended',
			},
		],
		default: 'getActivityKudosExtended',
	},
];

export const webSessionFields: INodeProperties[] = [
	// ── getActivityKudosExtended ───────────────────────────────────────────────
	{
		displayName: 'Activity ID',
		name: 'activityId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: { resource: ['webSession'], operation: ['getActivityKudosExtended'] },
		},
		description: 'The numeric ID of the Strava activity',
	},
	{
		displayName: 'Split Athletes Into Items',
		name: 'splitIntoItems',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: { resource: ['webSession'], operation: ['getActivityKudosExtended'] },
		},
		description:
			'Whether to return one n8n item per athlete. When off, the full response is returned as one item.',
	},

	// ── getActivityGroupAthletes ───────────────────────────────────────────────
	{
		displayName: 'Activity ID',
		name: 'activityId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: { resource: ['webSession'], operation: ['getActivityGroupAthletes'] },
		},
		description: 'The numeric ID of the Strava activity',
	},
	{
		displayName: 'Split Athletes Into Items',
		name: 'splitIntoItems',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: { resource: ['webSession'], operation: ['getActivityGroupAthletes'] },
		},
		description:
			'Whether to return one n8n item per athlete. When off, the full response is returned as one item.',
	},
];
