import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Strava Web Session credential.
 *
 * ⚠️  These endpoints are undocumented internal Strava web routes and are NOT
 * part of the official Strava API v3.  Using them may violate Strava's Terms
 * of Service.  Provide your own session cookie — no automated login is
 * performed by this node.
 */
export class StravaWebSessionApi implements ICredentialType {
	name = 'stravaWebSessionApi';
	displayName = 'Strava Web Session API';
	icon = {
		light: 'file:../nodes/Strava/strava.svg',
		dark: 'file:../nodes/Strava/strava.svg',
	} as const;

	documentationUrl = 'https://developers.strava.com';

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Cookie: '={{$credentials.sessionCookie}}',
				'User-Agent': '={{$credentials.userAgent}}',
				'Accept-Language': '={{$credentials.acceptLanguage}}',
				'X-Requested-With': 'XMLHttpRequest',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://www.strava.com',
			method: 'GET',
			url: '/settings/profile',
			disableFollowRedirect: true,
			json: false,
			headers: {
				Accept: 'text/html,application/xhtml+xml',
			},
		},
		rules: [
			{
				type: 'responseCode',
				properties: {
					value: 200,
					message: 'Session cookie accepted.',
				},
				errorMessage:
					'Strava did not accept this session cookie. Copy the full Cookie header from an authenticated Strava browser request and try again.',
			},
		],
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Strava Session Cookie',
			name: 'sessionCookie',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description:
				'Full <code>Cookie</code> header value copied from an authenticated Strava web browser session (e.g. from DevTools → Network). ' +
				'⚠️ Keep this secret — it grants full access to your Strava account.',
		},
		{
			displayName: 'CSRF Token',
			name: 'csrfToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Optional CSRF token required by some Strava POST / DELETE web routes. ' +
				'Find it in the page source (<code>meta[name=csrf-token]</code>) or in network request headers.',
		},
		{
			displayName: 'User-Agent',
			name: 'userAgent',
			type: 'string',
			default: 'Mozilla/5.0',
			description: '<code>User-Agent</code> header sent with every web request.',
		},
		{
			displayName: 'Accept-Language',
			name: 'acceptLanguage',
			type: 'string',
			default: 'en-US,en;q=0.9,fr;q=0.8',
			description: '<code>Accept-Language</code> header sent with every web request.',
		},
	];
}
