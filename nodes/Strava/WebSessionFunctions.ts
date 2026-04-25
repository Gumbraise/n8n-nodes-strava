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

const STRAVA_WEB_BASE_URL = 'https://www.strava.com';

interface StravaWebCredentials {
	sessionCookie: string;
	csrfToken?: string;
	userAgent?: string;
	acceptLanguage?: string;
}

/**
 * Makes a request to an undocumented Strava web route using a browser session
 * cookie.  Credentials are never included in thrown errors.
 */
export async function stravaWebRequest(
	this: IExecuteFunctions | IHookFunctions | IWebhookFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<IDataObject | IDataObject[] | string> {
	const credentials = (await this.getCredentials(
		'stravaWebSessionApi',
	)) as unknown as StravaWebCredentials;

	const headers: Record<string, string> = {
		Accept: 'application/json, text/javascript, */*; q=0.01',
		'X-Requested-With': 'XMLHttpRequest',
		'User-Agent': credentials.userAgent ?? 'Mozilla/5.0',
		'Accept-Language': credentials.acceptLanguage ?? 'en-US,en;q=0.9,fr;q=0.8',
		// Cookie value is set directly — never logged or included in errors
		Cookie: credentials.sessionCookie,
	};

	if (credentials.csrfToken) {
		headers['X-CSRF-Token'] = credentials.csrfToken;
	}

	const hasBody = Object.keys(body).length > 0;
	if (hasBody && ['POST', 'PUT', 'PATCH'].includes(method)) {
		headers['Content-Type'] = 'application/json';
	}

	const options: IHttpRequestOptions = {
		method,
		baseURL: STRAVA_WEB_BASE_URL,
		url: endpoint,
		headers,
		json: true,
	};

	if (hasBody) {
		options.body = body;
	}

	if (Object.keys(qs).length > 0) {
		options.qs = qs;
	}

	try {
		return (await this.helpers.httpRequest(options)) as IDataObject | IDataObject[] | string;
	} catch (error) {
		// Sanitize: never expose headers (which contain the session cookie) in the error
		const err = error as { message?: string; statusCode?: number };
		throw new NodeApiError(this.getNode(), {
			message: err.message ?? 'Strava web request failed',
			httpCode: String(err.statusCode ?? 'unknown'),
		} as JsonObject);
	}
}
