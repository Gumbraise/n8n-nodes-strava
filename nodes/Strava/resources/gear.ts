import type { INodeProperties } from 'n8n-workflow';

export const gearOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['gear'] } },
		options: [
			{
				name: 'Get Gear',
				value: 'getGearById',
				description: 'Return an equipment item using its identifier. Requires profile:read_all.',
				action: 'Get gear',
			},
		],
		default: 'getGearById',
	},
];

export const gearFields: INodeProperties[] = [
	{
		displayName: 'Gear ID',
		name: 'gearId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['gear'], operation: ['getGearById'] } },
		description: 'The identifier of the gear item (e.g. b12345678 for bike, g12345678 for shoes)',
	},
];
