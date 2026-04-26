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
const LOGIN_PAGE_PATTERNS = [
	/<form[^>]+action=["'][^"']*\/login/i,
	/Log In to Strava/i,
	/name=["']email["']/i,
	/name=["']password["']/i,
];

interface StravaWebCredentials {
	sessionCookie: string;
	csrfToken?: string;
	userAgent?: string;
	acceptLanguage?: string;
}

interface WebSessionTestResponse {
	body?: unknown;
	headers?: IDataObject;
	statusCode?: number;
}

interface StravaWebRequestOptions {
	referer?: string;
}

export async function testStravaWebSession(
	this: IExecuteFunctions | IHookFunctions | IWebhookFunctions,
): Promise<IDataObject> {
	const credentials = (await this.getCredentials(
		'stravaWebSessionApi',
	)) as unknown as StravaWebCredentials;
	const userAgent = credentials.userAgent ?? 'Mozilla/5.0';
	const response = (await this.helpers.httpRequest({
		method: 'GET',
		baseURL: STRAVA_WEB_BASE_URL,
		url: '/dashboard',
		headers: {
			Cookie: sanitizeCookie(credentials.sessionCookie),
			'User-Agent': userAgent,
			'Accept-Language': credentials.acceptLanguage ?? 'en-US,en;q=0.9,fr;q=0.8',
			Accept: 'text/html,application/xhtml+xml',
		},
		disableFollowRedirect: true,
		ignoreHttpStatusErrors: true,
		json: false,
		returnFullResponse: true,
	})) as WebSessionTestResponse;

	const body = normalizeResponseBody(response.body);
	const statusCode = response.statusCode ?? 0;
	const location = String(response.headers?.location ?? response.headers?.Location ?? '');
	const redirectedToLogin = statusCode >= 300 && statusCode < 400 && /login/i.test(location);
	const loginPageReturned = LOGIN_PAGE_PATTERNS.some((pattern) => pattern.test(body));
	const csrfToken = credentials.csrfToken || extractCsrfToken(body);
	const authenticated = statusCode === 200 && !redirectedToLogin && !loginPageReturned;

	if (!authenticated) {
		throw new NodeOperationError(
			this.getNode(),
			`Strava web session test failed. Status: ${statusCode || 'unknown'}${
				location ? `. Redirect: ${location}` : ''
			}. Refresh the session cookie from an authenticated Strava browser request.`,
		);
	}

	return {
		authenticated,
		statusCode,
		csrfTokenFound: Boolean(csrfToken),
		csrfTokenSource: credentials.csrfToken ? 'credential' : csrfToken ? 'dashboard' : 'missing',
		writeRequestsReady: Boolean(csrfToken),
	};
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
				Cookie: sanitizeCookie(cookie),
				'User-Agent': userAgent,
				'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
				Accept: 'text/html,application/xhtml+xml',
			},
			json: false,
		})) as string;

		return extractCsrfToken(html);
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
	requestOptions: StravaWebRequestOptions = {},
): Promise<IDataObject | IDataObject[] | string> {
	const credentials = (await this.getCredentials(
		'stravaWebSessionApi',
	)) as unknown as StravaWebCredentials;

	const userAgent = credentials.userAgent ?? 'Mozilla/5.0';
	const cookie = sanitizeCookie(credentials.sessionCookie);
	const referer = requestOptions.referer ?? `${STRAVA_WEB_BASE_URL}/dashboard`;

	const headers: Record<string, string> = {
		Accept: 'application/json, text/javascript, */*; q=0.01',
		'X-Requested-With': 'XMLHttpRequest',
		'User-Agent': userAgent,
		'Accept-Language': credentials.acceptLanguage ?? 'en-US,en;q=0.9,fr;q=0.8',
		// Keep only ASCII printable chars (0x20-0x7E) plus tab (0x09) — undici rejects anything else.
		// Cookie value is never logged or included in errors.
		Cookie: cookie,
	};

	let csrfToken: string | undefined;
	// CSRF token is required for write operations.
	// Use the credential value if provided; otherwise auto-fetch from the dashboard.
	if (WRITE_METHODS.includes(method)) {
		csrfToken = credentials.csrfToken || (await fetchCsrfToken(this, cookie, userAgent));

		if (!csrfToken) {
			throw new NodeOperationError(
				this.getNode(),
				'Strava web write request blocked because no CSRF token could be found. Run "Test Session" or paste the CSRF token from Strava page source into the credential.',
			);
		}

		headers.Origin = STRAVA_WEB_BASE_URL;
		headers.Referer = referer;
		headers['X-CSRF-Token'] = csrfToken;
	}

	const hasBody = Object.keys(body).length > 0;
	let requestBody: URLSearchParams | undefined;

	if (hasBody && WRITE_METHODS.includes(method)) {
		headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
		requestBody = new URLSearchParams();

		for (const [key, value] of Object.entries(body)) {
			if (value === undefined || value === null) {
				continue;
			}

			requestBody.append(key, String(value));
		}
	}

	const options: IHttpRequestOptions = {
		method,
		baseURL: STRAVA_WEB_BASE_URL,
		url: endpoint,
		headers,
		// Use json:false to receive raw string so we can detect HTML login-redirect pages
		json: false,
	};

	if (requestBody) {
		options.body = requestBody;
	} else if (hasBody) {
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
		const err = error as {
			cause?: { response?: { statusCode?: number }; status?: number; statusCode?: number };
			message?: string;
			response?: { statusCode?: number };
			status?: number;
			statusCode?: number;
		};
		const statusCode =
			err.statusCode ??
			err.status ??
			err.response?.statusCode ??
			err.cause?.statusCode ??
			err.cause?.status ??
			err.cause?.response?.statusCode ??
			extractStatusCodeFromMessage(err.message);

		if (statusCode === 401) {
			throw new NodeOperationError(
				this.getNode(),
				'Strava returned 401 Unauthorized. Your session cookie may be expired or invalid. Please refresh the Strava Web Session credential.',
			);
		}
		if (statusCode === 403) {
			throw new NodeOperationError(
				this.getNode(),
				'Strava returned 403 Forbidden. The session cookie is valid enough to reach Strava, but the web write request was rejected. Refresh the session cookie and CSRF token from the same browser session, then try again.',
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

function sanitizeCookie(cookie: string): string {
	return cookie.replace(/[^\t\x20-\x7E]/g, '').trim();
}

function extractCsrfToken(html: string): string | undefined {
	const match = /<meta[^>]+name="csrf-token"[^>]+content="([^"]+)"/i.exec(html);
	return match?.[1];
}

function normalizeResponseBody(body: unknown): string {
	if (typeof body === 'string') {
		return body;
	}

	if (Buffer.isBuffer(body)) {
		return body.toString('utf8');
	}

	return '';
}

function extractStatusCodeFromMessage(message: string | undefined): number | undefined {
	if (!message) {
		return undefined;
	}

	const match = /status code (\d{3})/i.exec(message);
	return match ? Number(match[1]) : undefined;
}

