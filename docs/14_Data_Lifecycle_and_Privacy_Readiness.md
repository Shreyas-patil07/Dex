# Data Lifecycle and Privacy Readiness

> **Status:** Repository/source audit completed; production Firebase Rules/IAM audit and lifecycle implementation pending  
> **Last updated:** 2026-11-07  
> **Scope:** Current Dex implementation and proposed v0.6 recommendation-event workstream

## 1. Executive findings

The current product stores user identity/profile data, watch history and notes, a derived taste-profile summary, and a cached recommendation candidate pool. TMDB metadata is stored separately in a shared catalogue cache.

The source audit found these material gaps:

1. No Firestore Security Rules file is tracked in the repository, and the actual Firebase project Rules/IAM configuration has not been inspected. This document is not evidence that production access controls are correct.
2. The frontend initializes Firebase Authentication only. No Firestore Web SDK reads/writes were found in frontend source. The backend accesses Firestore through the Firebase Admin SDK using server credentials. Firestore Rules do not govern privileged Admin SDK access; backend UID checks and Google Cloud IAM are the relevant controls for these calls.
3. The app has no account-wide export endpoint, no account-deletion endpoint/worker, and no automated deletion workflow. The public Privacy Policy currently directs users to request export/deletion manually by email.
4. Recommendation-cache freshness is six hours, but that is a serving freshness check, not a physical Firestore TTL policy. TMDB catalogue freshness is 180 days, also a logical cache rule rather than proof of physical document deletion.
5. Legacy V1 `taste_vectors` and `tmdb_feature_stats` documents may remain in Firestore. Recommendation Engine V2 no longer reads or writes them; no production cleanup migration has been run.
6. Recommendation event storage and feedback collection do not exist yet. Do not introduce them until the controls in this document have been reviewed and implemented.

## 2. Current data inventory

| Store / path | Data and purpose | Classification | Current lifecycle / deletion state |
|---|---|---|---|
| Firebase Authentication user | Firebase UID, email and provider/account metadata | Personal identity data | Sign-in/sign-out exists. No Dex account-deletion flow is implemented. |
| `users/{uid}` | Email, username, display name, tagline, creation timestamp | Personal profile data | Created/read by auth sync. No account-level export or recursive deletion route exists. |
| `usernames/{normalized_username}` | Username-to-Firebase-UID ownership mapping and creation timestamp | Personal identifier / lookup index | Updated on username claim/rename. No account-deletion cleanup path exists. |
| `users/{uid}/watches/{media_type}_{tmdb_id}` | Title metadata, status, rating, watched timestamp, private notes, artwork paths, taste features/contribution snapshot and metadata status | Personal activity and user content | Per-title create/read/update/delete exists. Account-wide export/deletion is not implemented. |
| `users/{uid}/taste/profile` | Model/schema versions, profiled counts, profile version and timestamps | Derived preference data | Rebuilt/updated from watch contribution snapshots. No separate export/deletion operation exists. |
| `users/{uid}/recommendations/current` | Candidate pools, scores/features/reasons, algorithm metadata, profile version and generated timestamp | Derived personalisation data | Cache is considered fresh for six hours. Stale data is replaced on recomputation; no Firestore TTL policy or guaranteed physical expiry is configured in source. |
| `tmdb_catalog/{media_type}_{tmdb_id}` | Shared TMDB details, feature IDs, display labels, catalogue version and fetched timestamp | Shared third-party metadata | Logical freshness window is 180 days. It is not UID-scoped and is not a user export/deletion target. Physical TTL/cleanup is not verified. |
| Legacy `users/{uid}/taste_vectors/**` | V1 per-feature positive/negative sums | Derived preference data | No longer read or written by V2. Existing documents may remain; cleanup migration not run. Include in account export/deletion until verified absent. |
| Legacy `tmdb_feature_stats/**` | V1 global feature document-frequency counters | Shared derived catalogue statistics | No longer read or written by V2. Existing documents may remain; cleanup migration not run. Not user-owned. |
| `users/{uid}/recommendation_events/{event_id}` | Proposed rendered recommendation and feedback events | Personal behavioural data | **Not implemented. No collection should be created yet.** |

Operational logs may also exist with Vercel, Render, Firebase/Google Cloud and GitHub. Their exact fields, access, regions and retention settings are provider-console concerns and have not been audited here. Do not claim that application-level data deletion immediately removes provider logs or backups.

### Source-level access model

- The browser Firebase module imports `firebase/app` and `firebase/auth`; it uses Firebase Authentication with browser-local persistence. No Firestore Web SDK use was found in the current frontend source.
- The backend obtains an async Firestore client from `firebase_admin.firestore_async` and verifies Firebase ID tokens server-side.
- Protected backend routes derive the UID from verified token claims and scope profile/watch references beneath that UID.
- Firebase Security Rules protect direct client SDK access; they do **not** constrain server calls made with Firebase Admin/Google Cloud credentials. Restrict the backend service account through IAM and keep UID-based authorization in every API handler.
- No Firestore Rules file is tracked in this repository. The live Firebase project must be reviewed directly.

## 3. Retention policy: current behaviour versus required policy

| Data class | Current behaviour in code | Required decision / implementation |
|---|---|---|
| Account and profile | No automatic expiry is implemented | Retain while account is active; document deletion-request handling and any legally required post-deletion retention. |
| Watch history, ratings and notes | No automatic expiry; user can delete individual watch entries | Retain while account is active; account deletion must recursively remove all user subcollections. Define backup/log exceptions transparently. |
| Taste profile | Derived profile summary updated with watch mutations | Rebuildable from watches; delete with account. |
| Recommendation cache | Six-hour freshness threshold | Add an explicit `expires_at` and configure Firestore TTL or a cleanup job if physical expiry is required. Do not describe freshness as deletion. |
| Shared TMDB catalogue | 180-day logical freshness window | Confirm physical cleanup/retention and TMDB licence/terms requirements; keep it separate from user export/delete jobs. |
| Legacy V1 vectors | Ignored by V2 but may remain | Measure first, back up, dry-run a recursive cleanup, then execute with an auditable report. |
| Future raw recommendation events | Not implemented | **Proposed initial retention: 90 days**, subject to product/legal approval. Store an `expires_at` field and configure Firestore TTL; TTL is asynchronous, not immediate deletion. |
| Hosting and operational logs | Provider-managed; settings not inspected | Audit provider retention, access and deletion controls separately. Avoid writing tokens, notes or raw request headers to app logs. |

The proposed 90-day raw-event window is a starting recommendation, not an approved policy or current implementation. It is separate from the recommendation model's 90-day recency half-life.

## 4. Account export contract

Implement a server-side, authenticated, versioned export (for example, JSON with `export_version` and `generated_at`) containing:

- Dex profile document and the account's current username.
- All watch records, including ratings, statuses, timestamps and private notes.
- Taste profile summary and each watch's stored taste contribution snapshot, so the user can understand or reconstruct derived preference state.
- Any future per-user recommendation events and user-controlled feedback/preferences.
- Any remaining legacy per-user taste documents until a cleanup migration is proven complete.

The shared `tmdb_catalog` cache is not a user's data export: it is shared third-party metadata keyed by TMDB title ID. The short-lived recommendation candidate cache can be omitted from the default export if the export contract clearly says it is derived and reproducible; otherwise include it as an optional diagnostic section.

Export requirements:
- Derive UID from a verified Firebase token. Never accept a client-supplied UID.
- Page through large watch/event collections; do not load unbounded account data into one request.
- Use a short-lived download URL or stream response; avoid leaving exports in a public bucket.
- Require recent re-authentication before sensitive export delivery.
- Do not log export contents, email addresses, tokens or notes.
- Test empty accounts, large accounts, pagination boundaries, retry and cross-user isolation.

## 5. Account deletion contract

There is currently **no** account-wide deletion endpoint or worker. Deleting the parent `users/{uid}` document alone would be insufficient because Firestore does not recursively delete its subcollections.

Recommended deletion sequence:

1. Require a verified owner token and recent Firebase re-authentication. Record a deletion request and block new writes for the UID while deletion runs.
2. Run an idempotent, resumable server-side deletion job with bounded batches.
3. Delete `users/{uid}/watches/**`, `users/{uid}/taste/**`, `users/{uid}/recommendations/**`, future `recommendation_events/**`, and legacy `taste_vectors/**`.
4. Delete `users/{uid}` itself.
5. Read `usernames/{name}` and delete the registry document only if its stored `firebase_uid` still equals the deleting UID. This avoids releasing another user's later claim.
6. Delete the Firebase Authentication user through Firebase Admin after Firestore deletion is complete. Make retries safe if Auth deletion has already happened.
7. Return a deletion status and completion timestamp. Keep only the minimum operational record needed to resume/report the job; do not retain watch notes or taste features in that record.
8. Define how provider logs, backups and legal-retention exceptions are handled. Do not promise immediate deletion from backups unless the backup system actually supports it.

Do not implement a one-shot unbounded delete request. Firestore recursive deletion can cross subcollection and batch boundaries; the workflow needs pagination, idempotency, concurrency tests and a recovery path.

## 6. Recommendation-event collection gate

The event collection is not present in the current code or Firestore inventory. Before creating it:

- Review the deployed Firestore Rules and IAM configuration.
- Publish an accurate purpose and data-use notice; decide whether collection is opt-in and how a user can pause it.
- Default collection to disabled until the notice and controls are available.
- Implement pause and clear controls. Clear must delete raw events and any derived aggregates that depend on them; pausing must stop subsequent writes.
- Approve the retention period and configure physical TTL/cleanup.
- Add event ownership, export and account-deletion hooks before the first production write.

A minimal event contract may use `users/{uid}/recommendation_events/{event_id}` with:

| Field | Rule |
|---|---|
| `event_id` | Client-generated idempotency key; document create must not overwrite an existing event |
| `request_id` | Identifies the recommendation response/candidate set |
| `algorithm_version` | Copied from the response that produced the card |
| `event_type` | Allowlist: `rendered`, `open`, `add_to_list`, `more_like_this`, `less_like_this`, `not_interested` |
| `slot`, `position` | Allowlisted slot; document and consistently use zero-based or one-based positions |
| `media_type`, `tmdb_id` | Stable title reference |
| `surface` | Allowlist such as `home_for_you` |
| `created_at`, `expires_at` | Server timestamp and approved expiry |

Initially omit free text, bearer tokens, raw authorization headers, IP addresses, device fingerprints and session IDs. Derive UID exclusively from the verified Firebase token. Batch one request per rendered recommendation view; do not send a network request per card. Call the event `rendered`, not a true viewport impression, unless actual visibility is measured. Never infer dislike from a card with no interaction.

## 7. Firebase Rules and IAM audit checklist

This is an external production-console task; source inspection alone cannot close it.

- [ ] Export/review the live Firestore Security Rules and record the review date and project ID.
- [ ] Confirm unauthenticated direct Firestore reads/writes are denied.
- [ ] Confirm there is no client-accessible path to another user's profile, watches, taste, cache or future events.
- [ ] Because the current frontend uses only Firebase Auth, keep user Firestore access server-mediated unless a documented feature requires direct client access.
- [ ] Inspect the Render service account's IAM roles. Remove broad project roles that are not needed; scope the backend identity to the required Firestore and Firebase Authentication operations.
- [ ] Confirm service-account key handling, rotation/revocation procedure and that no key is in Git history or frontend build variables.
- [ ] Test backend UID isolation separately: Admin SDK access bypasses Firestore Rules.
- [ ] Record redacted evidence and a rollback plan. Do not paste credentials, tokens or rule secrets into the repository.

## 8. Privacy-policy consistency review

The current `PrivacyPolicy.tsx` accurately states that export/deletion requests are manual and there is no in-app control. However, it also lists categories such as favorites, queues, dislikes, taste vectors, social interactions and broad device/usage data. Several of these are not evidenced by the current Dex application source and may describe future capabilities or provider processing rather than current first-party collection.

Before collecting recommendation events or public profiles:
- Separate data Dex currently collects from optional/future capabilities.
- Replace the obsolete phrase “taste vectors” with the current description: derived taste profile and per-watch contribution snapshots.
- State what recommendation feedback events are collected, for what purpose, and for how long.
- Explain pause/clear/export/deletion controls and any backup/log exceptions.
- Verify the operator identity and privacy contact are correct.
- Have the public Privacy Policy and Terms reviewed by an appropriately qualified professional. This engineering document is not legal advice.

## 9. Release gates

| Gate | Acceptance condition | Current status |
|---|---|---|
| Repository inventory | All current user-owned/shared/legacy stores listed | Completed by this source audit |
| Firebase Rules | Live rules inspected; unauthenticated client access denied | Pending external console review |
| IAM | Render service account roles reviewed and least-privilege confirmed | Pending external console review |
| Export | Versioned, authenticated, paginated export and isolation tests | Not implemented |
| Deletion | Resumable recursive Firestore + Firebase Auth deletion and tests | Not implemented |
| Cache expiry | Physical expiry policy distinguished from logical freshness | Partially documented; TTL not verified |
| Event notice/consent | Current policy and user controls approved | Pending |
| Event retention | Retention approved and TTL/cleanup tested | Pending |
| Event ingestion | Batched, idempotent, allowlisted, UID-derived and deletion-aware | Not implemented |

**No recommendation-event write should ship until the Firebase Rules/IAM audit, notice/consent decision, retention policy, pause/clear controls, export contract and deletion hooks are complete.**

## 10. Related documents

- [Protocol and Data Schema](06_Protocol_and_Data_Schema.md)
- [Security and Privacy](08_Security.md)
- [Implementation Roadmap](07_Implementation.md)
- [v0.6 Reliability and Discovery Intelligence](13_v0.6_Reliability_and_Discovery_Intelligence.md)
- [Deployment Runbook](12_Deployment_Runbook.md)
