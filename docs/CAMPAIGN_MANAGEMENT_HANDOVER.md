# AI Outreach Platform - Campaign Management Technical Handover (Phase 8)

This handover document summarizes the architecture, design choices, database schemas, and implementation details for Phase 8 (Campaign Management), making Campaigns the central organizational unit across the AI Outreach Platform (Version 2.0).

---

## 1. Database Schema

The campaigns architecture is supported by a relational schema added via the migration `supabase/migrations/016_campaign_management.sql`.

### Tables:
- **`public.campaigns`**:
  - `id` UUID PRIMARY KEY DEFAULT `uuid_generate_v4()`
  - `name` TEXT NOT NULL
  - `description` TEXT
  - `status` TEXT DEFAULT 'Draft' NOT NULL (Options: `Draft`, `Active`, `Paused`, `Completed`, `Archived`)
  - `created_by` UUID REFERENCES `auth.users(id)` ON DELETE SET NULL
  - `created_at` TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
  - `updated_at` TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
  - `total_prospects` INTEGER DEFAULT 0 NOT NULL (Cached metric)
  - `completed_prospects` INTEGER DEFAULT 0 NOT NULL (Cached metric)
  - `failed_prospects` INTEGER DEFAULT 0 NOT NULL (Cached metric)
  - `emails_generated` INTEGER DEFAULT 0 NOT NULL (Cached metric)
  - `drafts_created` INTEGER DEFAULT 0 NOT NULL (Cached metric)
  - `notes` TEXT
- **`public.prospects`** (Alteration):
  - Added `campaign_id` UUID REFERENCES `public.campaigns(id)` ON DELETE CASCADE.

### Indexes for Performance:
- `idx_prospects_campaign_id` on `public.prospects(campaign_id)` for quick joins.
- `idx_campaigns_status` on `public.campaigns(status)` for quick sidebar metrics.

### Row Level Security (RLS):
- Enabled RLS on `public.campaigns`.
- Configured policies letting all authenticated workspace users perform CRUD operations (`Auth campaigns access`).

---

## 2. Folder Additions

All campaign handling and business logic are grouped into a dedicated service folder:
- **`src/services/campaign/`**
  - [CampaignTypes.ts](file:///c:/Users/jsnas/OneDrive/Desktop/New%20folder%20(2)/AJ-Co.-MAIN/src/services/campaign/CampaignTypes.ts): Holds TypeScript types for `Campaign`, `CampaignStatus`, and computed `CampaignStats`.
  - [CampaignConfig.ts](file:///c:/Users/jsnas/OneDrive/Desktop/New%20folder%20(2)/AJ-Co.-MAIN/src/services/campaign/CampaignConfig.ts): Houses static dropdown settings and page counts.
  - [CampaignRepository.ts](file:///c:/Users/jsnas/OneDrive/Desktop/New%20folder%20(2)/AJ-Co.-MAIN/src/services/campaign/CampaignRepository.ts): Coordinates low-level Supabase JS client calls, aggregates stats, and performs duplications.
  - [CampaignStore.ts](file:///c:/Users/jsnas/OneDrive/Desktop/New%20folder%20(2)/AJ-Co.-MAIN/src/services/campaign/CampaignStore.ts): In-memory client cache that exposes React subscription methods to sync lists in real-time.
  - [CampaignService.ts](file:///c:/Users/jsnas/OneDrive/Desktop/New%20folder%20(2)/AJ-Co.-MAIN/src/services/campaign/CampaignService.ts): Gateway proxying UI REST requests to the Express endpoints.

---

## 3. Express API Endpoints

The following routes are registered in the Node/Express server `server.ts`:
- **`GET /api/campaigns`**: Lists all campaigns.
- **`GET /api/campaigns/:id`**: Gets metadata for a specific campaign.
- **`POST /api/campaigns`**: Creates a campaign.
- **`PATCH /api/campaigns/:id`**: Modifies a campaign or duplicates it (when passing body parameter `{ action: 'duplicate' }`).
- **`DELETE /api/campaigns/:id`**: Deletes a campaign and cascades prospect removals.
- **`GET /api/campaigns/:id/stats`**: Compiles prospect aggregates (success/failure counters, average queue completion rates, draft success metrics).

---

## 4. UI Changes

- **Campaign Selection dropdown**: Added to the main import block. Users must select or create a campaign before importing prospects.
- **Campaign Dashboard** (`src/pages/staff/Campaigns.tsx`): Exposes a rich list dashboard to search, sort, filter, paginate, edit, duplicate, archive, and delete campaigns.
- **Detailed Campaign Analytics**: Select a campaign to view its progress, notes, live prospects queue status grid, and run controls (Run, Pause, Resume, Cancel Campaign).
- **Dashboard Overview Metrics**: Exposes 6 campaign counters at the top of the portal.

---

## 5. Architectural Decisions

1. **Write-Through Caching**: Stores load data from endpoints on startup, while operations are synced back to Supabase. This guarantees multi-user teamwork collaboration.
2. **Deep Duplication**: Duplicating a campaign duplicates all linked prospects and enqueues them automatically in `Draft` status.
3. **Queue Segmentation**: Queue execution loops filter on `campaignId` to process prospects batch-by-batch without crosstalk.

---

## 6. Future Extension Points

- **Meeting Bookings & Reply Tracking**: Add a `replies` table referencing `campaign_id` to log outreach replies.
- **Drip Email Sequences**: Campaigns can define a `sequence_id` to coordinate step-based email messages.
- **Analytics Charts**: Graph `emails_generated` versus `drafts_created` over time.
- **CRM Synchronizer**: Sync campaign states back to external platforms like HubSpot or Salesforce.
