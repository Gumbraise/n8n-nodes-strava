import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class StravaOAuth2Api implements ICredentialType {
	name = 'stravaOAuth2Api';
	displayName = 'Strava OAuth2 API';
	extends = ['oAuth2Api'];
	icon = { light: 'file:../nodes/Strava/strava.svg', dark: 'file:../nodes/Strava/strava.svg' } as const;
	documentationUrl = 'https://developers.strava.com/docs/authentication/';

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://www.strava.com/api/v3',
			method: 'GET',
			url: '/athlete',
		},
	};

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
			default: 'https://www.strava.com/oauth/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://www.strava.com/oauth/token',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default:
				'read,read_all,profile:read_all,profile:write,activity:read,activity:read_all,activity:write',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
	];
}
