import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

const STRAVA_BASE_URL = 'https://www.strava.com/api/v3';

type StravaContext = IExecuteFunctions | IHookFunctions | IWebhookFunctions;
type PathParameterValue = string | number;
type RequestBody = Buffer | FormData | IDataObject | URLSearchParams;

export type StravaResponseFormat = 'arrayBuffer' | 'json' | 'text';

export interface StravaApiRequestOptions {
	method: IHttpRequestMethods;
	endpoint: string;
	body?: RequestBody;
	form?: IDataObject;
	headers?: IDataObject;
	qs?: IDataObject;
	responseFormat?: StravaResponseFormat;
}

interface StravaOAuth2Credentials extends IDataObject {
	clientId?: string;
	clientSecret?: string;
}

export type StravaApiResponse = Buffer | IDataObject | IDataObject[] | string;

export function buildEndpoint(
	template: string,
	pathParameters: Record<string, PathParameterValue>,
): string {
	return template.replace(/\{([^}]+)\}/g, (_match, key: string) =>
		encodeURIComponent(String(pathParameters[key])),
	);
}

export function compactObject(values: IDataObject = {}): IDataObject {
	const output: IDataObject = {};

	for (const [key, value] of Object.entries(values)) {
		if (!hasValue(value)) {
			continue;
		}

		output[key] = value;
	}

	return output;
}

export function toCsvValue(value: unknown): string {
	if (Array.isArray(value)) {
		return value
			.map((entry) => String(entry).trim())
			.filter((entry) => entry !== '')
			.join(',');
	}

	if (typeof value === 'string') {
		return value.trim();
	}

	if (value === undefined || value === null) {
		return '';
	}

	return String(value);
}

export async function stravaApiRequest(
	this: StravaContext,
	{
		method,
		endpoint,
		body,
		form,
		headers,
		qs,
		responseFormat = 'json',
	}: StravaApiRequestOptions,
): Promise<StravaApiResponse> {
	const options = buildRequestOptions({
		method,
		endpoint,
		body,
		form,
		headers,
		qs,
		responseFormat,
	});

	try {
		const response = await requestWithAuthentication.call(this, endpoint, method, options);
		return parseResponse(response, responseFormat);
	} catch (error) {
		if (error instanceof NodeApiError) {
			throw error;
		}

		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

function buildRequestOptions({
	method,
	endpoint,
	body,
	form,
	headers,
	qs,
	responseFormat,
}: StravaApiRequestOptions): IHttpRequestOptions {
	const cleanedQs = compactObject(qs ?? {});
	const cleanedForm = compactObject(form ?? {});
	const cleanedBody = normalizeBody(body);
	const hasRawBody =
		cleanedBody instanceof FormData ||
		cleanedBody instanceof URLSearchParams ||
		Buffer.isBuffer(cleanedBody);
	const hasForm = Object.keys(cleanedForm).length > 0;
	const hasJsonBody =
		cleanedBody !== undefined &&
		!hasRawBody &&
		Object.keys(cleanedBody as IDataObject).length > 0;
	const expectsJson = responseFormat === 'json';

	const options: IHttpRequestOptions = {
		arrayFormat: 'comma',
		baseURL: STRAVA_BASE_URL,
		headers: headers ? { ...headers } : {},
		method,
		url: endpoint,
	};

	if (Object.keys(cleanedQs).length > 0) {
		options.qs = cleanedQs;
	}

	if (responseFormat === 'arrayBuffer') {
		options.encoding = 'arraybuffer';
	} else if (responseFormat === 'text') {
		options.encoding = 'text';
	}

	if (hasForm) {
		const formBody = new URLSearchParams();

		for (const [key, value] of Object.entries(cleanedForm)) {
			formBody.append(key, String(value));
		}

		options.body = formBody;
		options.headers = {
			...options.headers,
			'Content-Type': 'application/x-www-form-urlencoded',
		};
	}

	if (cleanedBody !== undefined) {
		options.body = cleanedBody;
	}

	if (expectsJson && !hasForm && !hasRawBody) {
		options.json = true;
	} else {
		options.json = false;
	}

	if (!hasJsonBody && !hasForm && !hasRawBody && options.body === undefined) {
		delete options.body;
	}

	return options;
}

function hasValue(value: unknown): boolean {
	if (value === undefined || value === null) {
		return false;
	}

	if (typeof value === 'string') {
		return value.trim() !== '';
	}

	if (Array.isArray(value)) {
		return value.length > 0;
	}

	return true;
}

function normalizeBody(body: RequestBody | undefined): RequestBody | undefined {
	if (body === undefined) {
		return undefined;
	}

	if (body instanceof FormData || body instanceof URLSearchParams || Buffer.isBuffer(body)) {
		return body;
	}

	const cleanedBody = compactObject(body);

	return Object.keys(cleanedBody).length > 0 ? cleanedBody : undefined;
}

async function requestWithAuthentication(
	this: StravaContext,
	endpoint: string,
	method: IHttpRequestMethods,
	options: IHttpRequestOptions,
): Promise<unknown> {
	if (this.getNode().type.includes('Trigger') && endpoint.includes('/push_subscriptions')) {
		const credentials = (await this.getCredentials(
			'stravaOAuth2Api',
		)) as unknown as StravaOAuth2Credentials;
		const withClientCredentials = appendClientCredentials(
			options,
			credentials.clientId ?? '',
			credentials.clientSecret ?? '',
			method,
		);

		return await this.helpers.httpRequest(withClientCredentials);
	}

	return await this.helpers.httpRequestWithAuthentication.call(this, 'stravaOAuth2Api', options);
}

function appendClientCredentials(
	options: IHttpRequestOptions,
	clientId: string,
	clientSecret: string,
	method: IHttpRequestMethods,
): IHttpRequestOptions {
	const updatedOptions: IHttpRequestOptions = { ...options };

	if (method === 'GET' || method === 'DELETE') {
		updatedOptions.qs = compactObject({
			...(options.qs ?? {}),
			client_id: clientId,
			client_secret: clientSecret,
		});

		return updatedOptions;
	}

	if (updatedOptions.body instanceof URLSearchParams) {
		const body = new URLSearchParams(updatedOptions.body);
		body.set('client_id', clientId);
		body.set('client_secret', clientSecret);
		updatedOptions.body = body;

		return updatedOptions;
	}

	if (updatedOptions.body instanceof FormData) {
		updatedOptions.body.append('client_id', clientId);
		updatedOptions.body.append('client_secret', clientSecret);

		return updatedOptions;
	}

	const body = isDataObject(updatedOptions.body) ? updatedOptions.body : {};
	updatedOptions.body = {
		...body,
		client_id: clientId,
		client_secret: clientSecret,
	};

	return updatedOptions;
}

function isDataObject(value: unknown): value is IDataObject {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseResponse(response: unknown, responseFormat: StravaResponseFormat): StravaApiResponse {
	if (responseFormat === 'arrayBuffer') {
		if (Buffer.isBuffer(response)) {
			return response;
		}

		if (response instanceof ArrayBuffer) {
			return Buffer.from(response);
		}

		if (typeof response === 'string') {
			return Buffer.from(response);
		}

		return Buffer.from(response as ArrayBufferLike);
	}

	if (responseFormat === 'text') {
		if (Buffer.isBuffer(response)) {
			return response.toString('utf8');
		}

		return typeof response === 'string' ? response : String(response ?? '');
	}

	if (typeof response === 'string') {
		const trimmedResponse = response.trim();

		if (trimmedResponse === '') {
			return {};
		}

		return JSON.parse(trimmedResponse) as IDataObject | IDataObject[];
	}

	return response as IDataObject | IDataObject[];
}
