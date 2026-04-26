import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import {
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
	sleep,
} from 'n8n-workflow';

import type { StravaApiRequestOptions } from './GenericFunctions';
import {
	buildEndpoint,
	compactObject,
	stravaApiRequest,
	toCsvValue,
} from './GenericFunctions';
import { stravaWebRequest, testStravaWebSession } from './WebSessionFunctions';
import { activityFields, activityOperations } from './resources/activity';
import { athleteFields, athleteOperations } from './resources/athlete';
import { clubFields, clubOperations } from './resources/club';
import { gearFields, gearOperations } from './resources/gear';
import { routeFields, routeOperations } from './resources/route';
import { segmentFields, segmentOperations } from './resources/segment';
import { segmentEffortFields, segmentEffortOperations } from './resources/segmentEffort';
import { streamFields, streamOperations } from './resources/stream';
import { uploadFields, uploadOperations } from './resources/upload';
import { webSessionFields, webSessionOperations } from './resources/webSession';

const WEB_WRITE_OPERATIONS = ['followAthleteWeb', 'kudoActivityWeb', 'unfollowAthleteWeb'] as const;

type JsonResponse = IDataObject | IDataObject[];

type OperationExecutionResult =
	| {
			type: 'items';
			items: INodeExecutionData[];
	  }
	| {
			type: 'json';
			data: JsonResponse;
	  };

type ResourceOperationHandler = (
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
) => Promise<OperationExecutionResult>;

const RESOURCE_HANDLERS: Record<string, ResourceOperationHandler> = {
	activity: executeActivityOperation,
	athlete: executeAthleteOperation,
	club: executeClubOperation,
	gear: executeGearOperation,
	route: executeRouteOperation,
	segment: executeSegmentOperation,
	segmentEffort: executeSegmentEffortOperation,
	stream: executeStreamOperation,
	upload: executeUploadOperation,
	webSession: executeWebSessionResourceOperation,
};

export class Strava implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Strava',
		name: 'strava',
		icon: 'file:strava.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Consume the official Strava API v3. Also includes undocumented Web Session operations (marked ⚠️) that use a browser session cookie and may break without notice.',
		defaults: {
			name: 'Strava',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'stravaOAuth2Api',
				required: true,
				displayOptions: {
					hide: {
						resource: ['webSession'],
					},
				},
			},
			{
				name: 'stravaWebSessionApi',
				required: true,
				displayOptions: {
					show: {
						resource: ['webSession'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Activity', value: 'activity' },
					{ name: 'Athlete', value: 'athlete' },
					{ name: 'Club', value: 'club' },
					{ name: 'Gear', value: 'gear' },
					{ name: 'Route', value: 'route' },
					{ name: 'Segment', value: 'segment' },
					{ name: 'Segment Effort', value: 'segmentEffort' },
					{ name: 'Stream', value: 'stream' },
					{ name: 'Upload', value: 'upload' },
					{ name: 'Web Session (Undocumented)', value: 'webSession' },
				],
				default: 'athlete',
			},
			...activityOperations,
			...activityFields,
			...athleteOperations,
			...athleteFields,
			...clubOperations,
			...clubFields,
			...gearOperations,
			...gearFields,
			...routeOperations,
			...routeFields,
			...segmentOperations,
			...segmentFields,
			...segmentEffortOperations,
			...segmentEffortFields,
			...streamOperations,
			...streamFields,
			...uploadOperations,
			...uploadFields,
			...webSessionOperations,
			...webSessionFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		await assertBulkWebWriteAllowed.call(this, items.length);

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const handler = RESOURCE_HANDLERS[resource];

				if (!handler) {
					throw new NodeOperationError(
						this.getNode(),
						`The resource "${resource}" is not implemented`,
						{ itemIndex: i },
					);
				}

				const result = await handler.call(this, operation, i);

				if (result.type === 'items') {
					returnData.push(...result.items);
				} else {
					const outputItems = Array.isArray(result.data) ? result.data : [result.data];

					for (const outputItem of outputItems) {
						returnData.push({
							json: outputItem,
							pairedItem: { item: i },
						});
					}
				}

				if (resource === 'webSession' && isWebWriteOperation(operation) && i < items.length - 1) {
					const delayMs = this.getNodeParameter('requestDelayMs', i, 1000) as number;

					if (delayMs > 0) {
						await sleep(delayMs);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: getErrorMessage(error) },
						pairedItem: { item: i },
					});
					continue;
				}

				if (error instanceof NodeApiError || error instanceof NodeOperationError) {
					throw error;
				}

				if (isMissingCredentialError(error)) {
					throw new NodeOperationError(
						this.getNode(),
						`${getErrorMessage(error)} Re-select or recreate the Strava Web Session API credential on this node, then save the workflow. If you are running n8n-node dev, make sure you are using the same n8n user folder where the credential was created.`,
						{ itemIndex: i },
					);
				}

				throw new NodeApiError(this.getNode(), toNodeApiErrorData(error), {
					itemIndex: i,
				});
			}
		}

		return [returnData];
	}
}

async function executeAthleteOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<OperationExecutionResult> {
	switch (operation) {
		case 'getLoggedInAthlete':
			return jsonResult(
				await requestJson.call(this, {
					method: 'GET',
					endpoint: '/athlete',
				}),
			);

		case 'getStats': {
			const athleteId = this.getNodeParameter('athleteId', itemIndex) as number;

			return jsonResult(
				await requestJson.call(this, {
					method: 'GET',
					endpoint: buildEndpoint('/athletes/{id}/stats', { id: athleteId }),
				}),
			);
		}

		case 'updateLoggedInAthlete': {
			const weight = this.getNodeParameter('weight', itemIndex) as number;

			return jsonResult(
				await requestJson.call(this, {
					method: 'PUT',
					endpoint: '/athlete',
					form: { weight },
				}),
			);
		}

		case 'getLoggedInAthleteZones':
			return jsonResult(
				await requestJson.call(this, {
					method: 'GET',
					endpoint: '/athlete/zones',
				}),
			);

		default:
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" for resource "athlete" is not yet implemented`,
				{ itemIndex },
			);
	}
}

async function executeActivityOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<OperationExecutionResult> {
	switch (operation) {
		case 'createActivity': {
			const name = this.getNodeParameter('name', itemIndex) as string;
			const sportType = this.getNodeParameter('sport_type', itemIndex) as string;
			const startDateLocal = this.getNodeParameter('start_date_local', itemIndex) as string;
			const elapsedTime = this.getNodeParameter('elapsed_time', itemIndex) as number;
			const additionalFields = this.getNodeParameter(
				'additionalFields',
				itemIndex,
				{},
			) as IDataObject;

			return jsonResult(
				await requestJson.call(this, {
					method: 'POST',
					endpoint: '/activities',
					form: compactObject({
						name,
						type: additionalFields.type,
						sport_type: sportType,
						start_date_local: startDateLocal,
						elapsed_time: elapsedTime,
						description: additionalFields.description,
						distance: additionalFields.distance,
						trainer:
							additionalFields.trainer === undefined
								? undefined
								: additionalFields.trainer
									? 1
									: 0,
						commute:
							additionalFields.commute === undefined
								? undefined
								: additionalFields.commute
									? 1
									: 0,
					}),
				}),
			);
		}

		case 'getActivityById': {
			const activityId = this.getNodeParameter('activityId', itemIndex) as number;
			const includeAllEfforts = this.getNodeParameter(
				'include_all_efforts',
				itemIndex,
			) as boolean;

			return jsonResult(
				await requestJson.call(this, {
					method: 'GET',
					endpoint: buildEndpoint('/activities/{id}', { id: activityId }),
					qs: { include_all_efforts: includeAllEfforts },
				}),
			);
		}

		case 'updateActivityById': {
			const activityId = this.getNodeParameter('activityId', itemIndex) as number;
			const body = this.getNodeParameter('body', itemIndex, {}) as IDataObject;

			return jsonResult(
				await requestJson.call(this, {
					method: 'PUT',
					endpoint: buildEndpoint('/activities/{id}', { id: activityId }),
					body: compactObject({
						name: body.name,
						sport_type: body.sport_type,
						description: body.description,
						gear_id: body.gear_id,
						trainer: body.trainer,
						commute: body.commute,
						hide_from_home: body.hide_from_home,
						type: body.type,
					}),
				}),
			);
		}

		case 'getLoggedInAthleteActivities': {
			const filters = this.getNodeParameter('filters', itemIndex, {}) as IDataObject;

			return jsonResult(
				await requestJson.call(this, {
					method: 'GET',
					endpoint: '/athlete/activities',
					qs: compactObject({
						before: filters.before,
						after: filters.after,
						page: filters.page,
						per_page: filters.per_page,
					}),
				}),
			);
		}

		case 'getLapsByActivityId': {
			const activityId = this.getNodeParameter('activityId', itemIndex) as number;

			return jsonResult(
				await requestJson.call(this, {
					method: 'GET',
					endpoint: buildEndpoint('/activities/{id}/laps', { id: activityId }),
				}),
			);
		}

		case 'getZonesByActivityId': {
			const activityId = this.getNodeParameter('activityId', itemIndex) as number;

			return jsonResult(
				await requestJson.call(this, {
					method: 'GET',
					endpoint: buildEndpoint('/activities/{id}/zones', { id: activityId }),
				}),
			);
		}

		case 'getCommentsByActivityId': {
			const activityId = this.getNodeParameter('activityId', itemIndex) as number;
			const pagination = this.getNodeParameter('pagination', itemIndex, {}) as IDataObject;

			return jsonResult(
				await requestJson.call(this, {
					method: 'GET',
					endpoint: buildEndpoint('/activities/{id}/comments', { id: activityId }),
					qs: compactObject({
						page: pagination.page,
						per_page: pagination.per_page,
						page_size: pagination.page_size,
						after_cursor: pagination.after_cursor,
					}),
				}),
			);
		}

		case 'getKudoersByActivityId': {
			const activityId = this.getNodeParameter('activityId', itemIndex) as number;
			const pagination = this.getNodeParameter('pagination', itemIndex, {}) as IDataObject;

			return jsonResult(
				await requestJson.call(this, {
					method: 'GET',
					endpoint: buildEndpoint('/activities/{id}/kudos', { id: activityId }),
					qs: compactObject({
						page: pagination.page,
						per_page: pagination.per_page,
					}),
				}),
			);
		}

		default:
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" for resource "activity" is not yet implemented`,
				{ itemIndex },
			);
	}
}

async function executeSegmentOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<OperationExecutionResult> {
	switch (operation) {
		case 'getSegmentById': {
			const segmentId = this.getNodeParameter('segmentId', itemIndex) as number;

			return jsonResult(
				await requestJson.call(this, {
					method: 'GET',
					endpoint: buildEndpoint('/segments/{id}', { id: segmentId }),
				}),
			);
		}

		case 'getLoggedInAthleteStarredSegments': {
			const pagination = this.getNodeParameter('pagination', itemIndex, {}) as IDataObject;

			return jsonResult(
				await requestJson.call(this, {
					method: 'GET',
					endpoint: '/segments/starred',
					qs: compactObject({
						page: pagination.page,
						per_page: pagination.per_page,
					}),
				}),
			);
		}

		case 'starSegment': {
			const segmentId = this.getNodeParameter('segmentId', itemIndex) as number;
			const starred = this.getNodeParameter('starred', itemIndex) as boolean;

			return jsonResult(
				await requestJson.call(this, {
					method: 'PUT',
					endpoint: buildEndpoint('/segments/{id}/starred', { id: segmentId }),
					form: { starred },
				}),
			);
		}

		case 'exploreSegments': {
			const bounds = toCsvValue(this.getNodeParameter('bounds', itemIndex) as unknown);

			if (bounds === '') {
				throw new NodeOperationError(
					this.getNode(),
					'Bounds is required for Explore Segments.',
					{ itemIndex },
				);
			}

			const additionalFilters = this.getNodeParameter(
				'additionalFilters',
				itemIndex,
				{},
			) as IDataObject;
			const response = (await requestJson.call(this, {
				method: 'GET',
				endpoint: '/segments/explore',
				qs: compactObject({
					bounds,
					activity_type: additionalFilters.activity_type,
					min_cat: additionalFilters.min_cat,
					max_cat: additionalFilters.max_cat,
				}),
			})) as IDataObject;

			return jsonResult(((response.segments as IDataObject[]) ?? []) as IDataObject[]);
		}

		default:
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" for resource "segment" is not yet implemented`,
				{ itemIndex },
			);
	}
}

async function executeSegmentEffortOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<OperationExecutionResult> {
	switch (operation) {
		case 'getEffortsBySegmentId': {
			const segmentId = this.getNodeParameter('segmentId', itemIndex) as number;
			const filters = this.getNodeParameter('filters', itemIndex, {}) as IDataObject;

			return jsonResult(
				await requestJson.call(this, {
					method: 'GET',
					endpoint: '/segment_efforts',
					qs: compactObject({
						segment_id: segmentId,
						start_date_local: filters.start_date_local,
						end_date_local: filters.end_date_local,
						per_page: filters.per_page,
					}),
				}),
			);
		}

		case 'getSegmentEffortById': {
			const segmentEffortId = this.getNodeParameter('segmentEffortId', itemIndex) as number;

			return jsonResult(
				await requestJson.call(this, {
					method: 'GET',
					endpoint: buildEndpoint('/segment_efforts/{id}', { id: segmentEffortId }),
				}),
			);
		}

		default:
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" for resource "segmentEffort" is not yet implemented`,
				{ itemIndex },
			);
	}
}

async function executeClubOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<OperationExecutionResult> {
	switch (operation) {
		case 'getClubById': {
			const clubId = this.getNodeParameter('clubId', itemIndex) as number;

			return jsonResult(
				await requestJson.call(this, {
					method: 'GET',
					endpoint: buildEndpoint('/clubs/{id}', { id: clubId }),
				}),
			);
		}

		case 'getClubMembersById':
		case 'getClubAdminsById':
		case 'getClubActivitiesById': {
			const clubId = this.getNodeParameter('clubId', itemIndex) as number;
			const pagination = this.getNodeParameter('pagination', itemIndex, {}) as IDataObject;
			const suffixByOperation = {
				getClubActivitiesById: 'activities',
				getClubAdminsById: 'admins',
				getClubMembersById: 'members',
			} as const;

			return jsonResult(
				await requestJson.call(this, {
					method: 'GET',
					endpoint: buildEndpoint(`/clubs/{id}/${suffixByOperation[operation]}`, {
						id: clubId,
					}),
					qs: compactObject({
						page: pagination.page,
						per_page: pagination.per_page,
					}),
				}),
			);
		}

		case 'getLoggedInAthleteClubs': {
			const pagination = this.getNodeParameter('pagination', itemIndex, {}) as IDataObject;

			return jsonResult(
				await requestJson.call(this, {
					method: 'GET',
					endpoint: '/athlete/clubs',
					qs: compactObject({
						page: pagination.page,
						per_page: pagination.per_page,
					}),
				}),
			);
		}

		default:
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" for resource "club" is not yet implemented`,
				{ itemIndex },
			);
	}
}

async function executeGearOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<OperationExecutionResult> {
	if (operation !== 'getGearById') {
		throw new NodeOperationError(
			this.getNode(),
			`The operation "${operation}" for resource "gear" is not yet implemented`,
			{ itemIndex },
		);
	}

	const gearId = this.getNodeParameter('gearId', itemIndex) as string;

	return jsonResult(
		await requestJson.call(this, {
			method: 'GET',
			endpoint: buildEndpoint('/gear/{id}', { id: gearId }),
		}),
	);
}

async function executeRouteOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<OperationExecutionResult> {
	switch (operation) {
		case 'getRouteById': {
			const routeId = this.getNodeParameter('routeId', itemIndex) as number;

			return jsonResult(
				await requestJson.call(this, {
					method: 'GET',
					endpoint: buildEndpoint('/routes/{id}', { id: routeId }),
				}),
			);
		}

		case 'getRoutesByAthleteId': {
			const athleteId = this.getNodeParameter('athleteId', itemIndex) as number;
			const pagination = this.getNodeParameter('pagination', itemIndex, {}) as IDataObject;

			return jsonResult(
				await requestJson.call(this, {
					method: 'GET',
					endpoint: buildEndpoint('/athletes/{id}/routes', { id: athleteId }),
					qs: compactObject({
						page: pagination.page,
						per_page: pagination.per_page,
					}),
				}),
			);
		}

		case 'getRouteAsGPX':
		case 'getRouteAsTCX':
			return await executeRouteExport.call(this, operation, itemIndex);

		default:
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" for resource "route" is not yet implemented`,
				{ itemIndex },
			);
	}
}

async function executeRouteExport(
	this: IExecuteFunctions,
	operation: 'getRouteAsGPX' | 'getRouteAsTCX',
	itemIndex: number,
): Promise<OperationExecutionResult> {
	const routeId = this.getNodeParameter('routeId', itemIndex) as number;
	const downloadAsBinary = this.getNodeParameter('downloadAsBinary', itemIndex) as boolean;
	const isGpx = operation === 'getRouteAsGPX';
	const exportPath = isGpx ? 'export_gpx' : 'export_tcx';
	const fileName = isGpx ? `strava-route-${routeId}.gpx` : `strava-route-${routeId}.tcx`;
	const mimeType = isGpx ? 'application/gpx+xml' : 'application/tcx+xml';
	const endpoint = buildEndpoint(`/routes/{id}/${exportPath}`, { id: routeId });

	if (downloadAsBinary) {
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex) as string;
		const fileBuffer = (await stravaApiRequest.call(this, {
			method: 'GET',
			endpoint,
			responseFormat: 'arrayBuffer',
		})) as Buffer;
		const binaryData = await this.helpers.prepareBinaryData(fileBuffer, fileName, mimeType);

		return itemsResult([
			{
				json: {},
				binary: { [binaryPropertyName]: binaryData },
				pairedItem: { item: itemIndex },
			},
		]);
	}

	// These endpoints return XML, not JSON, so request the raw text explicitly.
	const xmlData = (await stravaApiRequest.call(this, {
		method: 'GET',
		endpoint,
		responseFormat: 'text',
	})) as string;

	return jsonResult({
		data: xmlData,
		fileName,
		mimeType,
	});
}

async function executeUploadOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<OperationExecutionResult> {
	switch (operation) {
		case 'getUploadById': {
			const uploadId = this.getNodeParameter('uploadId', itemIndex) as number;

			return jsonResult(
				await requestJson.call(this, {
					method: 'GET',
					endpoint: buildEndpoint('/uploads/{uploadId}', { uploadId }),
				}),
			);
		}

		case 'createUpload': {
			const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex) as string;
			const dataType = this.getNodeParameter('data_type', itemIndex) as string;
			const additionalFields = this.getNodeParameter(
				'additionalFields',
				itemIndex,
				{},
			) as IDataObject;

			if (!dataType) {
				throw new NodeOperationError(
					this.getNode(),
					'Data Type is required to upload an activity file.',
					{ itemIndex },
				);
			}

			let binaryMeta;
			let fileBuffer: Buffer;

			try {
				binaryMeta = this.helpers.assertBinaryData(itemIndex, binaryPropertyName);
				fileBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);
			} catch {
				throw new NodeOperationError(
					this.getNode(),
					`No binary data found in field "${binaryPropertyName}". Connect a node that outputs a file and make sure the binary property name matches.`,
					{ itemIndex },
				);
			}

			if (fileBuffer.length === 0) {
				throw new NodeOperationError(
					this.getNode(),
					`The file in binary field "${binaryPropertyName}" is empty.`,
					{ itemIndex },
				);
			}

			const formData = new FormData();

			formData.append(
				'file',
				new Blob([fileBuffer], {
					type: binaryMeta.mimeType ?? 'application/octet-stream',
				}),
				binaryMeta.fileName ?? `upload.${dataType.replace('.gz', '')}`,
			);
			formData.append('data_type', dataType);
			appendOptionalFormDataValue(formData, 'activity_type', additionalFields.activity_type);
			appendOptionalFormDataValue(formData, 'name', additionalFields.name);
			appendOptionalFormDataValue(formData, 'description', additionalFields.description);
			appendOptionalFormDataValue(formData, 'external_id', additionalFields.external_id);
			appendOptionalFormDataValue(
				formData,
				'trainer',
				additionalFields.trainer === undefined
					? undefined
					: additionalFields.trainer
						? '1'
						: '0',
			);
			appendOptionalFormDataValue(
				formData,
				'commute',
				additionalFields.commute === undefined
					? undefined
					: additionalFields.commute
						? '1'
						: '0',
			);

			return jsonResult(
				await requestJson.call(this, {
					method: 'POST',
					endpoint: '/uploads',
					body: formData,
				}),
			);
		}

		default:
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" for resource "upload" is not yet implemented`,
				{ itemIndex },
			);
	}
}

async function executeStreamOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<OperationExecutionResult> {
	switch (operation) {
		case 'getActivityStreams': {
			const activityId = this.getNodeParameter('activityId', itemIndex) as number;
			const keys = getRequiredCsvParameter.call(this, 'keys', operation, itemIndex);
			const keyByType = this.getNodeParameter('key_by_type', itemIndex) as boolean;

			return jsonResult(
				await requestJson.call(this, {
					method: 'GET',
					endpoint: buildEndpoint('/activities/{id}/streams', { id: activityId }),
					qs: {
						keys,
						key_by_type: keyByType,
					},
				}),
			);
		}

		case 'getSegmentEffortStreams': {
			const segmentEffortId = this.getNodeParameter('segmentEffortId', itemIndex) as number;
			const keys = getRequiredCsvParameter.call(this, 'keys', operation, itemIndex);
			const keyByType = this.getNodeParameter('key_by_type', itemIndex) as boolean;

			return jsonResult(
				await requestJson.call(this, {
					method: 'GET',
					endpoint: buildEndpoint('/segment_efforts/{id}/streams', { id: segmentEffortId }),
					qs: {
						keys,
						key_by_type: keyByType,
					},
				}),
			);
		}

		case 'getSegmentStreams': {
			const segmentId = this.getNodeParameter('segmentId', itemIndex) as number;
			const keys = getRequiredCsvParameter.call(this, 'keys', operation, itemIndex);
			const keyByType = this.getNodeParameter('key_by_type', itemIndex) as boolean;

			return jsonResult(
				await requestJson.call(this, {
					method: 'GET',
					endpoint: buildEndpoint('/segments/{id}/streams', { id: segmentId }),
					qs: {
						keys,
						key_by_type: keyByType,
					},
				}),
			);
		}

		case 'getRouteStreams': {
			const routeId = this.getNodeParameter('routeId', itemIndex) as number;

			return jsonResult(
				await requestJson.call(this, {
					method: 'GET',
					endpoint: buildEndpoint('/routes/{id}/streams', { id: routeId }),
				}),
			);
		}

		default:
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" for resource "stream" is not yet implemented`,
				{ itemIndex },
			);
	}
}

async function executeWebSessionResourceOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<OperationExecutionResult> {
	return jsonResult(await executeWebSessionOperation.call(this, operation, itemIndex));
}

async function requestJson(
	this: IExecuteFunctions,
	options: StravaApiRequestOptions,
): Promise<JsonResponse> {
	return (await stravaApiRequest.call(this, options)) as JsonResponse;
}

function jsonResult(data: JsonResponse): OperationExecutionResult {
	return {
		type: 'json',
		data,
	};
}

function itemsResult(items: INodeExecutionData[]): OperationExecutionResult {
	return {
		type: 'items',
		items,
	};
}

async function assertBulkWebWriteAllowed(
	this: IExecuteFunctions,
	itemCount: number,
): Promise<void> {
	if (itemCount <= 1) {
		return;
	}

	for (let itemIndex = 0; itemIndex < itemCount; itemIndex++) {
		const resource = this.getNodeParameter('resource', itemIndex) as string;
		const operation = this.getNodeParameter('operation', itemIndex) as string;

		if (resource !== 'webSession' || !isWebWriteOperation(operation)) {
			continue;
		}

		const preventBulk = this.getNodeParameter('preventBulk', itemIndex, true) as boolean;

		if (preventBulk) {
			throw new NodeOperationError(
				this.getNode(),
				`Bulk write is disabled for "${operation}". Set "Prevent Bulk Actions" to false to process multiple items.`,
				{ itemIndex },
			);
		}
	}
}

function isWebWriteOperation(operation: string): boolean {
	return (WEB_WRITE_OPERATIONS as readonly string[]).includes(operation);
}

function getRequiredCsvParameter(
	this: IExecuteFunctions,
	parameterName: string,
	operation: string,
	itemIndex: number,
): string {
	const csvValue = toCsvValue(this.getNodeParameter(parameterName, itemIndex) as unknown);

	if (csvValue === '') {
		throw new NodeOperationError(
			this.getNode(),
			`At least one value must be provided for "${parameterName}" on "${operation}".`,
			{ itemIndex },
		);
	}

	return csvValue;
}

function appendOptionalFormDataValue(
	formData: FormData,
	key: string,
	value: unknown,
): void {
	if (value === undefined || value === null) {
		return;
	}

	if (typeof value === 'string' && value.trim() === '') {
		return;
	}

	formData.append(key, String(value));
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error ?? 'Unknown error');
}

function isMissingCredentialError(error: unknown): boolean {
	return /Credential with ID ".+" does not exist for type "stravaWebSessionApi"/.test(
		getErrorMessage(error),
	);
}

function toNodeApiErrorData(error: unknown): JsonObject {
	if (error instanceof Error) {
		return { message: error.message } as JsonObject;
	}

	return { message: String(error ?? 'Unknown error') } as JsonObject;
}

function executeBuildFollowRequestData(
	this: IExecuteFunctions,
	itemIndex: number,
): IDataObject[] {
	const mode = this.getNodeParameter('mode', itemIndex) as string;
	const followerId = this.getNodeParameter('followerId', itemIndex) as number;

	if (!followerId) {
		throw new NodeOperationError(this.getNode(), 'Follower ID is required.', { itemIndex });
	}

	if (mode === 'follow') {
		const followingId = this.getNodeParameter('followingId', itemIndex) as number;

		if (!followingId) {
			throw new NodeOperationError(
				this.getNode(),
				'Following ID is required for follow mode.',
				{ itemIndex },
			);
		}

		return [
			{
				method: 'POST',
				endpoint: buildFollowUrl(followerId),
				body: { follow: { following_id: followingId, follower_id: followerId } },
			},
		];
	}

	if (mode === 'unfollow') {
		const followId = this.getNodeParameter('followId', itemIndex) as number;

		if (!followId) {
			throw new NodeOperationError(this.getNode(), 'Follow ID is required for unfollow mode.', {
				itemIndex,
			});
		}

		return [
			{
				method: 'DELETE',
				endpoint: buildUnfollowUrl(followerId, followId),
			},
		];
	}

	throw new NodeOperationError(this.getNode(), `Unknown mode: "${mode}"`, { itemIndex });
}

function extractAnchorText(html: string): string {
	const match = /<a[^>]*>([^<]*)<\/a>/i.exec(html);
	return match ? match[1].trim() : html;
}

async function executeWebSessionOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject[]> {
	if (operation === 'buildFollowRequestData') {
		return executeBuildFollowRequestData.call(this, itemIndex);
	}

	if (operation === 'testSession') {
		return [await testStravaWebSession.call(this)];
	}

	if (operation === 'getActivityKudosExtended' || operation === 'getActivityGroupAthletes') {
		const activityId = this.getNodeParameter('activityId', itemIndex) as number;

		if (!activityId) {
			throw new NodeOperationError(this.getNode(), 'Activity ID is required', { itemIndex });
		}

		const splitIntoItems = this.getNodeParameter('splitIntoItems', itemIndex, true) as boolean;

		if (operation === 'getActivityKudosExtended') {
			const response = (await stravaWebRequest.call(
				this,
				'GET',
				`/feed/activity/${activityId}/kudos`,
			)) as IDataObject;

			if (!splitIntoItems) {
				return [response];
			}

			const athletes = (response.athletes ?? []) as IDataObject[];

			return athletes.map((athlete) => ({
				...athlete,
				is_owner: response.is_owner,
				kudosable: response.kudosable,
			}));
		}

		const response = (await stravaWebRequest.call(
			this,
			'GET',
			`/feed/activity/${activityId}/group_athletes`,
		)) as IDataObject;

		if (!splitIntoItems) {
			return [response];
		}

		const athletes = (response.athletes ?? []) as IDataObject[];

		return athletes.map((athlete) => {
			const activityLink = athlete.activity_link as string | undefined;

			return {
				...athlete,
				source_activity_id: activityId,
				activity_title: activityLink ? extractAnchorText(activityLink) : undefined,
			};
		});
	}

	if (operation === 'followAthleteWeb') {
		return executeFollowAthlete.call(this, itemIndex);
	}

	if (operation === 'kudoActivityWeb') {
		return executeKudoActivity.call(this, itemIndex);
	}

	if (operation === 'unfollowAthleteWeb') {
		return executeUnfollowAthlete.call(this, itemIndex);
	}

	throw new NodeOperationError(
		this.getNode(),
		`The operation "${operation}" for resource "webSession" is not yet implemented`,
		{ itemIndex },
	);
}

async function executeFollowAthlete(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject[]> {
	const followerId = this.getNodeParameter('followerId', itemIndex) as number;
	const followingId = this.getNodeParameter('followingId', itemIndex) as number;
	const confirmAction = this.getNodeParameter('confirmAction', itemIndex, false) as boolean;
	const dryRun = this.getNodeParameter('dryRun', itemIndex, false) as boolean;

	if (!confirmAction) {
		throw new NodeOperationError(
			this.getNode(),
			'Confirm Follow Action must be enabled to send the follow request.',
			{ itemIndex },
		);
	}

	const url = buildFollowUrl(followerId);
	const body = {
		'follow[following_id]': followingId,
		'follow[follower_id]': followerId,
	};
	const referer = `https://www.strava.com/athletes/${followingId}`;

	if (dryRun) {
		return [{ dryRun: true, method: 'POST', url: `https://www.strava.com${url}`, referer, body }];
	}

	const response = (await stravaWebRequest.call(this, 'POST', url, body, {}, { referer })) as IDataObject;
	return [response];
}

async function executeKudoActivity(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject[]> {
	const activityId = this.getNodeParameter('activityId', itemIndex) as number;
	const confirmAction = this.getNodeParameter('confirmAction', itemIndex, false) as boolean;
	const dryRun = this.getNodeParameter('dryRun', itemIndex, false) as boolean;

	if (!confirmAction) {
		throw new NodeOperationError(
			this.getNode(),
			'Confirm Kudo Action must be enabled to send the kudo request.',
			{ itemIndex },
		);
	}

	const url = `/feed/activity/${activityId}/kudo`;

	if (dryRun) {
		return [
			{
				dryRun: true,
				method: 'POST',
				url: `https://www.strava.com${url}`,
				referer: `https://www.strava.com/activities/${activityId}`,
				body: {},
			},
		];
	}

	const response = (await stravaWebRequest.call(this, 'POST', url, {}, {}, {
		referer: `https://www.strava.com/activities/${activityId}`,
	})) as IDataObject;

	if (Object.keys(response).length === 0) {
		return [{ success: true, activityId, operation: 'kudoActivityWeb' }];
	}

	return [response];
}

async function executeUnfollowAthlete(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject[]> {
	const followerId = this.getNodeParameter('followerId', itemIndex) as number;
	const followId = this.getNodeParameter('followId', itemIndex) as number;
	const confirmAction = this.getNodeParameter('confirmAction', itemIndex, false) as boolean;
	const dryRun = this.getNodeParameter('dryRun', itemIndex, false) as boolean;

	if (!confirmAction) {
		throw new NodeOperationError(
			this.getNode(),
			'Confirm Unfollow Action must be enabled to send the unfollow request.',
			{ itemIndex },
		);
	}

	const url = buildUnfollowUrl(followerId, followId);
	const referer = `https://www.strava.com/athletes/${followerId}`;

	if (dryRun) {
		return [{ dryRun: true, method: 'DELETE', url: `https://www.strava.com${url}`, referer, body: {} }];
	}

	const response = (await stravaWebRequest.call(this, 'DELETE', url, {}, {}, { referer })) as IDataObject;
	return [response ?? {}];
}

function buildFollowUrl(followerId: number): string {
	return buildEndpoint('/athletes/{followerId}/follows', { followerId });
}

function buildUnfollowUrl(followerId: number, followId: number): string {
	return buildEndpoint('/athletes/{followerId}/follows/{followId}', {
		followerId,
		followId,
	});
}
