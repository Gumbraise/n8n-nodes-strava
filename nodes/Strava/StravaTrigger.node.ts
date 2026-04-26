import { randomBytes } from 'crypto';
import type {
	IHookFunctions,
	IWebhookFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { buildEndpoint, stravaApiRequest } from './GenericFunctions';

export class StravaTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Strava Trigger',
		name: 'stravaTrigger',
		icon: 'file:strava.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Strava events occur',
		defaults: {
			name: 'Strava Trigger',
		},
		usableAsTool: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'stravaOAuth2Api',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'setup',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				path: 'webhook',
			},
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Object',
				name: 'object',
				type: 'options',
				options: [
					{
						name: '[All]',
						value: '*',
					},
					{
						name: 'Activity',
						value: 'activity',
					},
					{
						name: 'Athlete',
						value: 'athlete',
					},
				],
				default: '*',
				description: 'The object type to listen for events on',
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				options: [
					{
						name: '[All]',
						value: '*',
					},
					{
						name: 'Created',
						value: 'create',
					},
					{
						name: 'Deleted',
						value: 'delete',
					},
					{
						name: 'Updated',
						value: 'update',
					},
				],
				default: '*',
				description: 'The type of event to listen for',
			},
			{
				displayName: 'Resolve Data',
				name: 'resolveData',
				type: 'boolean',
				default: true,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					'By default the webhook-data only contain the Object ID. If this option gets activated, it will resolve the data automatically.',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Delete If Exist',
						name: 'deleteIfExist',
						type: 'boolean',
						default: false,
						// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
						description:
							'Strava allows just one subscription at all times. If you want to delete the current subscription to make room for a new subscription with the current parameters, set this parameter to true. Keep in mind this is a destructive operation.',
					},
				],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const webhookData = this.getWorkflowStaticData('node');

				const webhooks = (await stravaApiRequest.call(
					this,
					{
						method: 'GET',
						endpoint: '/push_subscriptions',
					},
				)) as IDataObject[];

				for (const webhook of webhooks) {
					if (webhook.callback_url === webhookUrl) {
						webhookData.webhookId = webhook.id;
						return true;
					}
				}
				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default') as string;

				const body: IDataObject = {
					callback_url: webhookUrl,
					verify_token: randomBytes(20).toString('hex'),
				};

				let responseData: IDataObject | undefined;

				try {
					responseData = (await stravaApiRequest.call(
						this,
						{
							method: 'POST',
							endpoint: '/push_subscriptions',
							body,
						},
					)) as IDataObject;
				} catch (error) {
					const cause = (error as { cause?: { error?: { errors?: IDataObject[] } } })?.cause;
					if (cause?.error) {
						const errors = cause.error.errors ?? [];
						for (const e of errors as IDataObject[]) {
							if (e.resource === 'PushSubscription' && e.code === 'already exists') {
								const options = this.getNodeParameter('options') as IDataObject;
								const webhooks = (await stravaApiRequest.call(
									this,
									{
										method: 'GET',
										endpoint: '/push_subscriptions',
									},
								)) as IDataObject[];

								if (options.deleteIfExist) {
									await stravaApiRequest.call(
										this,
										{
											method: 'DELETE',
											endpoint: buildEndpoint('/push_subscriptions/{id}', {
												id: webhooks[0].id as string | number,
											}),
										},
									);
									responseData = (await stravaApiRequest.call(
										this,
										{
											method: 'POST',
											endpoint: '/push_subscriptions',
											body: {
												callback_url: webhookUrl,
												verify_token: randomBytes(20).toString('hex'),
											},
										},
									)) as IDataObject;
								} else {
									throw new NodeOperationError(
										this.getNode(),
										`A subscription already exists [${webhooks[0].callback_url}]. If you want to delete this subscription and create a new one with the current parameters please go to options and set delete if exist to true`,
									);
								}
							}
						}
					}
					if (!responseData) throw error;
				}

				if (responseData?.id === undefined) return false;

				webhookData.webhookId = responseData.id as string;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId !== undefined) {
					try {
						await stravaApiRequest.call(
							this,
							{
								method: 'DELETE',
								endpoint: buildEndpoint('/push_subscriptions/{id}', {
									id: webhookData.webhookId as string | number,
								}),
							},
						);
					} catch {
						return false;
					}
					delete webhookData.webhookId;
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData();
		const query = this.getQueryData() as IDataObject;
		const object = this.getNodeParameter('object') as string;
		const event = this.getNodeParameter('event') as string;
		const resolveData = this.getNodeParameter('resolveData') as boolean;

		const objectType = object === '*' ? ['activity', 'athlete'] : [object];
		const eventType = event === '*' ? ['create', 'update', 'delete'] : [event];

		// Handle Strava's webhook verification challenge (GET request)
		if (this.getWebhookName() === 'setup') {
			if (query['hub.challenge']) {
				const res = this.getResponseObject();
				res.status(200).json({ 'hub.challenge': query['hub.challenge'] }).end();
				return { noWebhookResponse: true };
			}
		}

		if (object !== '*' && !objectType.includes(body.object_type as string)) return {};
		if (event !== '*' && !eventType.includes(body.aspect_type as string)) return {};

		if (resolveData && body.aspect_type !== 'delete') {
			const endpoint =
				body.object_type === 'activity'
					? buildEndpoint('/activities/{id}', { id: body.object_id as string | number })
					: buildEndpoint('/athletes/{id}/stats', { id: body.object_id as string | number });
			body.object_data = await stravaApiRequest.call(this, {
				method: 'GET',
				endpoint,
			});
		}

		return {
			workflowData: [this.helpers.returnJsonArray(body as IDataObject)],
		};
	}
}
