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

export async function stravaApiRequest(
this: IExecuteFunctions | IHookFunctions | IWebhookFunctions,
method: IHttpRequestMethods,
endpoint: string,
body: IDataObject = {},
qs: IDataObject = {},
form: IDataObject = {},
): Promise<IDataObject | IDataObject[]> {
const options: IHttpRequestOptions = {
method,
baseURL: STRAVA_BASE_URL,
url: endpoint,
json: true,
};

if (Object.keys(form).length > 0) {
// Strava expects application/x-www-form-urlencoded for formData endpoints
const params = new URLSearchParams();
for (const [key, value] of Object.entries(form)) {
params.append(key, String(value));
}
options.body = params.toString();
options.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
options.json = false;
} else if (Object.keys(body).length > 0) {
options.body = body;
}

if (Object.keys(qs).length > 0) {
options.qs = qs;
}

try {
// Push subscription endpoints require client credentials (client_id / client_secret)
// instead of the OAuth bearer token — this is a Strava API constraint
if (this.getNode().type.includes('Trigger') && endpoint.includes('/push_subscriptions')) {
const credentials = await this.getCredentials('stravaOAuth2Api');
if (method === 'GET' || method === 'DELETE') {
options.qs = { ...qs, client_id: credentials.clientId, client_secret: credentials.clientSecret };
} else {
options.body = { ...body, client_id: credentials.clientId, client_secret: credentials.clientSecret };
}
return (await this.helpers.httpRequest(options)) as IDataObject | IDataObject[];
}

if (Object.keys(form).length > 0) {
const raw = (await this.helpers.httpRequestWithAuthentication.call(
this,
'stravaOAuth2Api',
options,
)) as string;
return JSON.parse(raw) as IDataObject | IDataObject[];
}

return (await this.helpers.httpRequestWithAuthentication.call(
this,
'stravaOAuth2Api',
options,
)) as IDataObject | IDataObject[];
} catch (error) {
throw new NodeApiError(this.getNode(), error as JsonObject);
}
}
