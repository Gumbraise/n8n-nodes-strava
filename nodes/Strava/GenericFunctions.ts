import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	IBinaryData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function stravaApiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	options: IDataObject = {},
): Promise<unknown> {
	const requestOptions = {
		method,
		url: `https://www.strava.com/api/v3${endpoint}`,
		json: true,
		...options,
	} as IHttpRequestOptions;

	try {
		return await this.helpers.httpRequestWithAuthentication.call(
			this,
			'stravaOAuth2Api',
			requestOptions,
		);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function stravaApiRequestAllItems(
	this: IExecuteFunctions,
	endpoint: string,
	query: IDataObject,
	perPage = 30,
): Promise<IDataObject[]> {
	const returnData: IDataObject[] = [];
	let page = 1;

	while (page <= 1000) {
		const pageQuery: IDataObject = {
			...query,
			page,
			per_page: perPage,
		};

		const responseData = (await stravaApiRequest.call(this, 'GET', endpoint, {
			qs: pageQuery,
		})) as IDataObject[];

		if (!Array.isArray(responseData) || responseData.length === 0) {
			break;
		}

		returnData.push(...responseData);

		if (responseData.length < perPage) {
			break;
		}

		page++;
	}

	return returnData;
}

export async function stravaDownloadAsBinary(
this: IExecuteFunctions,
endpoint: string,
fileName: string,
mimeType: string,
): Promise<IBinaryData> {
	const responseData = await stravaApiRequest.call(this, 'GET', endpoint, {
		json: false,
		headers: {
			Accept: '*/*',
		},
	});

	const buffer = Buffer.isBuffer(responseData)
		? responseData
		: Buffer.from(responseData as string, 'utf-8');

	return await this.helpers.prepareBinaryData(buffer, fileName, mimeType);
}
