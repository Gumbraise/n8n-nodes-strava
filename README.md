![n8n-nodes-strava](https://github.com/user-attachments/assets/5ee8d929-bfbc-4a1f-a9fc-3f11d3d15ee2)

[![npm version](https://img.shields.io/npm/v/n8n-nodes-strava.svg)](https://www.npmjs.com/package/n8n-nodes-strava)
[![npm downloads](https://img.shields.io/npm/dm/n8n-nodes-strava.svg)](https://www.npmjs.com/package/n8n-nodes-strava)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![node](https://img.shields.io/badge/node-%3E%3D20.19.0-339933.svg)](https://nodejs.org/)
[![n8n community node](https://img.shields.io/badge/n8n-community%20node-ff6d5a.svg)](https://docs.n8n.io/integrations/community-nodes/)
[![Strava API](https://img.shields.io/badge/Strava-API%20v3-fc4c02.svg)](https://developers.strava.com/)

This is a n8n community node. It lets you use **Strava** in your n8n workflows.

**Strava** is the activity platform used by athletes to track running, cycling, swimming, routes, segments, clubs,
uploads, and performance streams. This node exposes the official Strava API v3 operations, Strava webhook triggers, and
a separate opt-in web-session resource for a few undocumented browser-only actions.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

* [Installation](#installation)
* [Operations](#operations)
* [Official n8n Strava vs this package](#official-n8n-strava-vs-this-package)
* [Credentials](#credentials)
* [Compatibility](#compatibility)
* [Usage](#usage)
* [Web session notes](#web-session-notes)
* [Resources](#resources)

---

## Installation

Follow the installation guide in the n8n community nodes documentation.

1. Go to **Settings** > **Community Nodes**.
2. Select **Install**.
3. Enter `n8n-nodes-strava` in **Enter npm package name**.
4. Agree to the [risks](https://docs.n8n.io/integrations/community-nodes/risks/) of using community nodes: select **I
   understand the risks of installing unverified code from a public source**.
5. Select **Install**.

After installing the node, you can use it like any other node. n8n displays **Strava** and **Strava Trigger** in search
results in the **Nodes** panel.

For local development:

```bash
npm install
npm run build
npm run dev
```

---

## Official n8n Strava vs. this package

The official n8n Strava node is a good starting point for simple activity workflows. This package is built for people
who want to go much further: more Strava API coverage, cleaner advanced workflows, route exports, uploads from binary
data, streams, and guarded web-session actions that the official node does not expose.

As of the n8n documentation checked on 2026-04-26, the official Strava action node documents only the **Activity**
resource operations: create, get, get all, comments, kudos, laps, zones, and update. The official Strava Trigger
supports activity and athlete events. This package keeps those core workflows, then adds the missing power-user surface.

| Capability                                                       | [This n8n Strava node](https://www.npmjs.com/package/n8n-nodes-strava) | Official n8n Strava node |
|------------------------------------------------------------------|------------------------------------------------------------------------|--------------------------|
| OAuth2 credential                                                | ✅                                                                      | ✅                        |
| Webhook trigger                                                  | ✅                                                                      | ✅                        |
| Activity CRUD and enrichment                                     | ✅                                                                      | ✅                        |
| Activity comments, kudos, laps, zones                            | ✅                                                                      | ✅                        |
| Athlete profile, stats, zones, profile update                    | ✅                                                                      | ❌                        |
| Clubs, members, admins, club activities                          | ✅                                                                      | ❌                        |
| Segments, starred segments, segment explore, segment star/unstar | ✅                                                                      | ❌                        |
| Segment efforts                                                  | ✅                                                                      | ❌                        |
| Gear lookup                                                      | ✅                                                                      | ❌                        |
| Routes by athlete, route details                                 | ✅                                                                      | ❌                        |
| GPX and TCX route export                                         | ✅                                                                      | ❌                        |
| Streams for activities, routes, segments, segment efforts        | ✅                                                                      | ❌                        |
| Uploads from n8n binary input                                    | ✅                                                                      | ❌                        |
| Web-session-only Strava actions                                  | ✅                                                                      | ❌                        |
| Session health check for cookie-based routes                     | ✅                                                                      | ❌                        |
| Built for full Strava API v3 coverage                            | ✅                                                                      | ❌                        |

In practice, this package removes the need to keep dropping down into the generic HTTP Request node for normal Strava
automation. If your workflow is only "create or read activities", the official node is fine. If your workflow touches
routes, streams, clubs, segments, uploads, exports, athlete stats, or browser-session-only social actions, this package
is the stronger tool.

Official reference pages:

* [Official n8n Strava node documentation](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.strava/)
* [Official n8n Strava Trigger documentation](https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.stravatrigger/)
* [Official n8n Strava credentials documentation](https://docs.n8n.io/integrations/builtin/credentials/strava/)

---

## Operations

This package includes two nodes:

* **Strava**: regular actions against Strava API v3 and selected web-session routes.
* **Strava Trigger**: starts workflows from Strava push subscription events.

### Official Strava API resources

| Resource       | Operations                                                                                                       |
|----------------|------------------------------------------------------------------------------------------------------------------|
| Activity       | Create Activity, Get Activity, Update Activity, List Activities, List Comments, Get Kudoers, Get Laps, Get Zones |
| Athlete        | Get Authenticated Athlete, Update Athlete, Get Athlete Stats, Get Zones                                          |
| Club           | Get Club, Get Club Activities, Get Club Admins, Get Club Members, List Authenticated Athlete Clubs               |
| Gear           | Get Gear                                                                                                         |
| Route          | Get Route, Get Routes By Athlete, Export GPX, Export TCX                                                         |
| Segment        | Explore Segments, Get Segment, List Starred Segments, Star Segment                                               |
| Segment Effort | Get Segment Effort, List Segment Efforts                                                                         |
| Stream         | Get Activity Streams, Get Route Streams, Get Segment Effort Streams, Get Segment Streams                         |
| Upload         | Create Upload, Get Upload                                                                                        |

### Implemented Strava operation IDs

| Operation ID                        | Resource       | Notes                                  |
|-------------------------------------|----------------|----------------------------------------|
| `getStats`                          | Athlete        | Athlete activity stats                 |
| `getLoggedInAthlete`                | Athlete        | Current authenticated athlete          |
| `updateLoggedInAthlete`             | Athlete        | Requires `profile:write`               |
| `getLoggedInAthleteZones`           | Athlete        | Requires `profile:read_all`            |
| `getSegmentById`                    | Segment        | Segment details                        |
| `getLoggedInAthleteStarredSegments` | Segment        | Authenticated athlete starred segments |
| `starSegment`                       | Segment        | Star or unstar a segment               |
| `getEffortsBySegmentId`             | Segment Effort | Segment effort list                    |
| `exploreSegments`                   | Segment        | Segment discovery by bounds            |
| `getSegmentEffortById`              | Segment Effort | Segment effort details                 |
| `createActivity`                    | Activity       | Manual activity creation               |
| `getActivityById`                   | Activity       | Activity details                       |
| `updateActivityById`                | Activity       | JSON body update                       |
| `getLoggedInAthleteActivities`      | Activity       | Authenticated athlete activities       |
| `getLapsByActivityId`               | Activity       | Activity laps                          |
| `getZonesByActivityId`              | Activity       | Activity zones                         |
| `getCommentsByActivityId`           | Activity       | Activity comments                      |
| `getKudoersByActivityId`            | Activity       | Athletes who kudoed an activity        |
| `getClubById`                       | Club           | Club details                           |
| `getClubMembersById`                | Club           | Club members                           |
| `getClubAdminsById`                 | Club           | Club admins                            |
| `getClubActivitiesById`             | Club           | Club activities                        |
| `getLoggedInAthleteClubs`           | Club           | Authenticated athlete clubs            |
| `getGearById`                       | Gear           | Gear details                           |
| `getRouteById`                      | Route          | Route details                          |
| `getRoutesByAthleteId`              | Route          | Athlete routes                         |
| `getRouteAsGPX`                     | Route          | GPX export as binary or raw XML        |
| `getRouteAsTCX`                     | Route          | TCX export as binary or raw XML        |
| `createUpload`                      | Upload         | Supports n8n binary input              |
| `getUploadById`                     | Upload         | Upload status                          |
| `getActivityStreams`                | Stream         | Stream keys are sent as CSV            |
| `getSegmentEffortStreams`           | Stream         | Stream keys are sent as CSV            |
| `getSegmentStreams`                 | Stream         | Stream keys are sent as CSV            |
| `getRouteStreams`                   | Stream         | Stream keys are sent as CSV            |

### Web session operations

These operations are intentionally separated under **Web Session (Undocumented)** because they use Strava browser
routes, not the official API.

| Operation                   | Purpose                                                                      |
|-----------------------------|------------------------------------------------------------------------------|
| Build Follow Request Data   | Prepare/debug follow or unfollow request payloads without calling Strava     |
| Follow Athlete              | Follow an athlete using a browser session cookie                             |
| Unfollow Athlete            | Unfollow an athlete using a browser session cookie                           |
| Give Activity Kudo          | Give a kudo through Strava web routes                                        |
| Get Activity Kudos Extended | Fetch extended kudos data with athlete profiles                              |
| Get Activity Group Athletes | Fetch athletes from grouped activity data                                    |
| Test Session                | Verify that the configured cookie still reaches an authenticated Strava page |

### Trigger events

The **Strava Trigger** node supports Strava push subscriptions for:

* Objects: **Activity**, **Athlete**, or **All**
* Events: **Created**, **Updated**, **Deleted**, or **All**
* Optional data resolution for activity events
* Optional cleanup of an existing Strava push subscription when Strava reports that one already exists

---

## Credentials

This node supports two credential types.

### 1. Strava OAuth2 API

Use this credential for all official Strava API v3 resources and for the **Strava Trigger** node.

To set it up:

* Create an API application in the [Strava API settings](https://www.strava.com/settings/api).
* Copy the client ID and client secret into the n8n OAuth2 credential.
* Use the OAuth callback URL shown by n8n in your Strava application settings.
* Authorize the scopes required by your workflows.

Configured scopes:

```text
read,read_all,profile:read_all,profile:write,activity:read,activity:read_all,activity:write
```

The OAuth2 credential uses n8n's built-in OAuth2 handling, including token storage and refresh behavior.

### 2. Strava Web Session API

Use this credential only for **Web Session (Undocumented)** operations.

Required values:

* **Strava Session Cookie**: the full `Cookie` header copied from an authenticated browser request to `www.strava.com`.
* **CSRF Token**: the token from the same browser session. Strava expects it in the `X-CSRF-Token` header for writing
  requests.
* **User-Agent**: ideally the same browser user agent used when copying the cookie.
* **Accept-Language**: optional, but keeping it close to the browser request helps reproduce the same session behavior.

Important: the cookie grants access to your Strava account. Store it as a secret, rotate it often, and never paste it
into logs, issues, screenshots, or shared workflows.

---

## Compatibility

* **n8n package format:** community node API version 1 with strict mode enabled.
* **Node.js:** `>=20.19.0`
* **n8n workflow peer dependency:** `^2.15.1`
* **Tested locally with:** `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run pack:dry`

Known compatibility notes:

* Strava allows only one push subscription per application. If trigger registration fails because a subscription already
  exists, enable the cleanup option only when you intentionally want to replace the existing subscription.
* Some Strava endpoints require specific OAuth scopes. A valid OAuth connection can still receive `403 Forbidden` if the
  authorized scopes are too narrow.
* Web-session operations depend on undocumented Strava browser routes and may change or stop working without notice.

---

## Usage

### Common official API workflows

* Sync recent activities into a database or spreadsheet.
* Fetch detailed activity, lap, zone, comment, and kudo data.
* Export routes as GPX or TCX for downstream processing.
* Upload GPX, TCX, FIT, and compressed activity files from n8n binary data.
* Listen for Strava activity updates with **Strava Trigger** and enrich the event with activity details.

### Binary upload

For upload workflows:

1. Add a node that produces binary data, such as **Read/Write Files from Disk**, **HTTP Request**, or an incoming
   webhook.
2. In **Strava > Upload > Create Upload**, select the binary property that contains the activity file.
3. Choose the matching data type: `gpx`, `gpx.gz`, `tcx`, `tcx.gz`, `fit`, or `fit.gz`.

### Route exports

GPX and TCX exports can be returned as:

* n8n binary data, ready to write to disk or upload elsewhere.
* Raw XML text, useful for debugging or transformations.

### Streams

Stream keys are sent in the CSV format expected by Strava. Select the stream keys in the node UI, and the node handles
the required request formatting.

---

## Web session notes

The **Web Session (Undocumented)** resource exists for Strava actions that are not available in the official API. It is
intentionally more guarded than regular API operations.

Before using write operations:

1. Log in to Strava in a browser.
2. Open DevTools > Network.
3. Copy the full `Cookie` header from a request to `https://www.strava.com`.
4. Copy the CSRF token from either the `X-CSRF-Token` request header or the page source meta-tag named `csrf-token`.
5. Put both values in the **Strava Web Session API** credential.
6. Run **Web Session (Undocumented) > Test Session**.

For write operations:

* The CSRF token is sent as `X-CSRF-Token`.
* `Origin` and `Referer` headers are sent to match browser-style requests.
* Follow, unfollow, and kudo operations require explicit confirmation fields in the node UI.
* Bulk web write actions are guarded to reduce accidental account changes.

If Strava returns `403 Forbidden`, refresh the session cookie and CSRF token from the same browser session. A cookie can
be valid enough to load some pages while still being rejected for protected write routes.

---

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [n8n community nodes risks](https://docs.n8n.io/integrations/community-nodes/risks/)
* [Strava API documentation](https://developers.strava.com/docs/reference/)
* [Strava authentication documentation](https://developers.strava.com/docs/authentication/)
* [Strava webhooks documentation](https://developers.strava.com/docs/webhooks/)
* [Strava upload documentation](https://developers.strava.com/docs/uploads/)
