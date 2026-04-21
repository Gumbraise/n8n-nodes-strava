import type { Icon, ICredentialType, INodeProperties } from 'n8n-workflow';

export class StravaOAuth2Api implements ICredentialType {
	name = 'stravaOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Strava OAuth2 API';

	icon: Icon = { light: 'file:../icons/strava.svg', dark: 'file:../icons/strava.dark.svg' };

	documentationUrl = 'https://developers.strava.com/docs';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://www.strava.com/api/v3/oauth/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://www.strava.com/api/v3/oauth/token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string',
			description:
				'Space-separated scopes. Example: read activity:read_all activity:write profile:write',
			// Swagger security entries use a non-standard `public` scope. Real Strava scopes are listed here.
			default: 'read',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
	];
}
