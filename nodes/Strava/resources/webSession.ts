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
				name: 'Follow Athlete',
				value: 'followAthleteWeb',
				description:
					'[Undocumented] Follow an athlete using a Strava web session. Requires confirmAction to be enabled.',
				action: 'Follow athlete',
			},
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
			{
				name: 'Give Activity Kudo',
				value: 'kudoActivityWeb',
				description:
					'[Undocumented] Give a kudo to a Strava activity via a web session. This route may break without notice. Requires confirmAction to be enabled.',
				action: 'Give activity kudo',
			},
			{
				name: 'Unfollow Athlete',
				value: 'unfollowAthleteWeb',
				description:
					'[Undocumented] Unfollow an athlete using a Strava web session. Requires confirmAction to be enabled.',
				action: 'Unfollow athlete',
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

	// ── kudoActivityWeb ───────────────────────────────────────────────────────
	{
		displayName: 'Activity ID',
		name: 'activityId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: { resource: ['webSession'], operation: ['kudoActivityWeb'] },
		},
		description: 'The numeric ID of the Strava activity to give a kudo to',
	},
	{
		displayName: 'Confirm Kudo Action',
		name: 'confirmAction',
		type: 'boolean',
		required: true,
		default: false,
		displayOptions: {
			show: { resource: ['webSession'], operation: ['kudoActivityWeb'] },
		},
		description:
			'Whether to actually send the kudo request. Must be enabled — acts as a safety gate. ⚠️ This is an undocumented Strava web route and may break without notice',
	},
	{
		displayName: 'Prevent Bulk Actions',
		name: 'preventBulk',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: { resource: ['webSession'], operation: ['kudoActivityWeb'] },
		},
		description: 'Whether to block execution when more than one input item is passed. Disable only if you intentionally want to process multiple items.',
	},
	{
		displayName: 'Dry Run',
		name: 'dryRun',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: { resource: ['webSession'], operation: ['kudoActivityWeb'] },
		},
		description: 'Whether to return the computed method and URL without sending the request. No credentials are included in the output.',
	},
	{
		displayName: 'Request Delay (Ms)',
		name: 'requestDelayMs',
		type: 'number',
		default: 1000,
		typeOptions: { minValue: 0 },
		displayOptions: {
			show: { resource: ['webSession'], operation: ['kudoActivityWeb'] },
		},
		description: 'Milliseconds to wait between kudo requests when processing multiple items. Minimum: 0.',
	},

	// ── followAthleteWeb ──────────────────────────────────────────────────────
	{
		displayName: 'Follower ID',
		name: 'followerId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: { resource: ['webSession'], operation: ['followAthleteWeb', 'unfollowAthleteWeb'] },
		},
		description:
			'Authenticated athlete ID — usually your own Strava account ID. This is the first path segment in the Strava follow URL.',
	},
	{
		displayName: 'Following ID',
		name: 'followingId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: { resource: ['webSession'], operation: ['followAthleteWeb'] },
		},
		description: 'ID of the athlete to follow',
	},
	{
		displayName: 'Follow ID',
		name: 'followId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: { resource: ['webSession'], operation: ['unfollowAthleteWeb'] },
		},
		description: 'Follow relationship ID returned by the Follow Athlete operation (<code>follow_id</code> field)',
	},
	{
		displayName: 'Confirm Follow Action',
		name: 'confirmAction',
		type: 'boolean',
		required: true,
		default: false,
		displayOptions: {
			show: { resource: ['webSession'], operation: ['followAthleteWeb'] },
		},
		description: 'Whether to actually send the follow request. Must be enabled — acts as a safety gate.',
	},
	{
		displayName: 'Confirm Unfollow Action',
		name: 'confirmAction',
		type: 'boolean',
		required: true,
		default: false,
		displayOptions: {
			show: { resource: ['webSession'], operation: ['unfollowAthleteWeb'] },
		},
		description: 'Whether to actually send the unfollow request. Must be enabled — acts as a safety gate.',
	},
	{
		displayName: 'Prevent Bulk Actions',
		name: 'preventBulk',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: { resource: ['webSession'], operation: ['followAthleteWeb', 'unfollowAthleteWeb'] },
		},
		description:
			'Whether to block execution when more than one input item is passed. Disable only if you intentionally want to process multiple items.',
	},
	{
		displayName: 'Dry Run',
		name: 'dryRun',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: { resource: ['webSession'], operation: ['followAthleteWeb', 'unfollowAthleteWeb'] },
		},
		description:
			'Whether to return the computed method, URL, and body without sending the request. No credentials are included in the output.',
	},
	{
		displayName: 'Request Delay (Ms)',
		name: 'requestDelayMs',
		type: 'number',
		default: 1000,
		typeOptions: { minValue: 0 },
		displayOptions: {
			show: { resource: ['webSession'], operation: ['followAthleteWeb', 'unfollowAthleteWeb'] },
		},
		description:
			'Milliseconds to wait between write requests when processing multiple items. Minimum: 0.',
	},
];
