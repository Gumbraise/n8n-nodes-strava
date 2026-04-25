import type { INodeProperties } from 'n8n-workflow';

export const athleteOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['athlete'] } },
		options: [
			{
				name: 'Get Authenticated Athlete',
				value: 'getLoggedInAthlete',
				description: 'Return the currently authenticated athlete',
				action: 'Get authenticated athlete',
			},
			{
				name: 'Get Athlete Stats',
				value: 'getStats',
				description:
					'Return the activity stats of an athlete. Only includes data from activities set to Everyone visibility.',
				action: 'Get athlete stats',
			},
			{
				name: 'Get Zones',
				value: 'getLoggedInAthleteZones',
				description:
					"Return the authenticated athlete's heart rate and power zones. Requires profile:read_all.",
				action: 'Get zones',
			},
			{
				name: 'Update Athlete',
				value: 'updateLoggedInAthlete',
				description:
					'Update the currently authenticated athlete. Requires profile:write scope.',
				action: 'Update athlete',
			},
		],
		default: 'getLoggedInAthlete',
	},
];

export const athleteFields: INodeProperties[] = [
	// ── getStats ──────────────────────────────────────────────────────────────
	{
		displayName: 'Athlete ID',
		name: 'athleteId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: { show: { resource: ['athlete'], operation: ['getStats'] } },
		description: 'The identifier of the athlete. Must match the authenticated athlete.',
	},
	// ── updateLoggedInAthlete ─────────────────────────────────────────────────
	{
		displayName: 'Weight (Kg)',
		name: 'weight',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: { resource: ['athlete'], operation: ['updateLoggedInAthlete'] },
		},
		description: 'The weight of the athlete in kilograms',
	},
];
