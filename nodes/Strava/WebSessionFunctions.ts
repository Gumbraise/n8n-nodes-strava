import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

const STRAVA_WEB_BASE_URL = 'https://www.strava.com';
const WRITE_METHODS: IHttpRequestMethods[] = ['POST', 'PUT', 'PATCH', 'DELETE'];

interface StravaWebCredentials {
	sessionCookie: string;
	csrfToken?: string;
	userAgent?: string;
	acceptLanguage?: string;
}

/**
 * Auto-fetches the Strava CSRF token from the dashboard page.
 * Strava embeds it in every authenticated HTML page as:
 *   <meta name="csrf-token" content="...">
 */
async function fetchCsrfToken(
	context: IExecuteFunctions | IHookFunctions | IWebhookFunctions,
	cookie: string,
	userAgent: string,
): Promise<string | undefined> {
	try {
		const html = (await context.helpers.httpRequest({
			method: 'GET',
			url: `${STRAVA_WEB_BASE_URL}/dashboard`,
			headers: {
				Cookie: cookie.replace(/[^\x09\x20-\x7E]/g, '').trim(),
				'User-Agent': userAgent,
				Accept: 'text/html,application/xhtml+xml',
			},
			json: false,
		})) as string;

		const match = /<meta[^>]+name="csrf-token"[^>]+content="([^"]+)"/i.exec(html);
		return match?.[1];
	} catch {
		return undefined;
	}
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

	const userAgent = credentials.userAgent ?? 'Mozilla/5.0';

	const headers: Record<string, string> = {
		Accept: 'application/json, text/javascript, */*; q=0.01',
		'X-Requested-With': 'XMLHttpRequest',
		'User-Agent': userAgent,
		'Accept-Language': credentials.acceptLanguage ?? 'en-US,en;q=0.9,fr;q=0.8',
		// Keep only ASCII printable chars (0x20-0x7E) plus tab (0x09) — undici rejects anything else.
		// Cookie value is never logged or included in errors.
		Cookie: credentials.sessionCookie.replace(/[^\x09\x20-\x7E]/g, '').trim(),
	};

	// CSRF token is required for write operations.
	// Use the credential value if provided; otherwise auto-fetch from the dashboard.
	if (WRITE_METHODS.includes(method)) {
		const csrfToken =
			credentials.csrfToken ||
			(await fetchCsrfToken(this, credentials.sessionCookie, userAgent));

		if (csrfToken) {
			headers['X-CSRF-Token'] = csrfToken;
		}
	}

	const hasBody = Object.keys(body).length > 0;
	if (hasBody && WRITE_METHODS.includes(method)) {
		headers['Content-Type'] = 'application/json';
	}

	const options: IHttpRequestOptions = {
		method,
		baseURL: STRAVA_WEB_BASE_URL,
		url: endpoint,
		headers,
		// Use json:false to receive raw string so we can detect HTML login-redirect pages
		json: false,
	};

	if (hasBody) {
		options.body = body;
	}

	if (Object.keys(qs).length > 0) {
		options.qs = qs;
	}

	let raw: string;
	try {
		raw = (await this.helpers.httpRequest(options)) as string;
	} catch (error) {
		// Sanitize: never expose headers (which contain the session cookie) in the error.
		// Map common HTTP status codes to actionable messages.
		const err = error as { message?: string; statusCode?: number; response?: { statusCode?: number } };
		const statusCode = err.statusCode ?? err.response?.statusCode;

		if (statusCode === 401) {
			throw new NodeOperationError(
				this.getNode(),
				'Strava returned 401 Unauthorized. Your session cookie may be expired or invalid. Please refresh the Strava Web Session credential.',
			);
		}
		if (statusCode === 403) {
			throw new NodeOperationError(
				this.getNode(),
				'Strava returned 403 Forbidden. The CSRF token could not be fetched or is invalid. Try refreshing your session cookie.',
			);
		}
		throw new NodeApiError(this.getNode(), {
			message: err.message ?? 'Strava web request failed',
			httpCode: String(statusCode ?? 'unknown'),
		} as JsonObject);
	}

	// Strava redirects to an HTML login page when the session cookie is expired
	// or invalid — surface a clear error rather than a confusing JSON parse failure.
	if (typeof raw === 'string' && raw.trimStart().startsWith('<')) {
		throw new NodeOperationError(
			this.getNode(),
			'Strava returned HTML instead of JSON. Your session cookie may be expired, invalid, or missing CSRF protection.',
		);
	}

	// Empty body (e.g. 204 No Content)
	if (typeof raw === 'string' && raw.trim() === '') {
		return {};
	}

	if (typeof raw === 'string') {
		try {
			return JSON.parse(raw) as IDataObject | IDataObject[];
		} catch {
			// Return plain text if the body is not JSON-parseable
			return raw;
		}
	}

	return raw as unknown as IDataObject | IDataObject[];
}

