# Pinat Menfess — API & Route Documentation

Base URL: `http://localhost:8000` (dev) / `https://yourapp.com` (prod)

---

## Authentication

Admin authentication uses PinatAuth SSO (Google OAuth via PinatAuth).

### Login flow
```
GET /auth/login
```
Redirects browser to `PINAT_AUTH_URL/api/auth/oauth/google?redirect_uri=...&state=...`

After Google login, PinatAuth redirects back to:
```
GET /auth/callback#access_token=...&refresh_token=...&state=...
```
The callback page (React) reads the fragment and POSTs to:

```
POST /auth/pinat/session
Content-Type: application/json

{
  "access_token": "...",
  "refresh_token": "...",   // optional
  "state": "..."
}

→ 200 { "redirect": "/admin" }
→ 401 { "error": "Token verification failed" }
→ 422 { "error": "Invalid state" }
```

```
POST /auth/logout
→ 302 /
```

---

## Public Routes

### Landing Page
```
GET /
→ 200 Inertia page — list of active classes
```

### Class Public Page
```
GET /c/{slug}
→ 200 Inertia page — class info + submit button
→ 404 if class not found
```

### Submit Submission
```
GET /c/{slug}/submit
→ 200 Inertia page — submission form

POST /c/{slug}/submit
Rate limit: 5/min per IP

Body (multipart/form-data or JSON):
  message*      string  min:3 max:2000
  target_text   string  max:120
  alias_text    string  max:80
  category      string
  consent*      boolean must be true

→ 302 /c/{slug}/submitted   (success)
→ 422 { errors: { ... } }   (validation failed)
→ 429                        (rate limited)
```

### Submit Success
```
GET /c/{slug}/submitted
→ 200 Inertia page
```

---

## Global Takedown

### Takedown Form
```
GET /takedown
→ 200 Inertia page

POST /takedown
Rate limit: 3/min per IP

Body:
  public_id*    string  e.g. "MF-K7X4QM" or "MFK7X4QM" (normalized automatically)
  reason_code*  string  one of: privacy | personal_data | harassment | defamation |
                                sender_request | subject_request | wrong_submission | other
  reason_text*  string
  contact       string  optional

→ 302 /takedown/success/{public_id}
→ 422 { errors: { public_id: "ID tidak ditemukan..." } }
→ 429 (rate limited)
```

### Takedown Success
```
GET /takedown/success/{public_id}
→ 200 Inertia page
```

---

## Admin Routes

All admin routes require authenticated session (Laravel session cookie).
Unauthorized → 302 /auth/login

### Dashboard
```
GET /admin
→ 200 Inertia — user's classes with pending/approved/takedown counts
```

### Class Overview
```
GET /admin/classes/{class_id}
→ 200 Inertia — class stats
→ 403 if not class member
```

---

### Submissions (Inbox)

```
GET /admin/classes/{class_id}/submissions
Query params:
  status    string   submitted|under_review|approved|rejected|taken_down
  category  string
  search    string   searches original_message
→ 200 Inertia — paginated submission list

GET /admin/classes/{class_id}/submissions/{submission_id}
→ 200 Inertia — submission detail
→ 403/404 if not authorized

PATCH /admin/classes/{class_id}/submissions/{submission_id}
Body:
  moderated_message  string
  target_text        string
  alias_text         string
  category           string
  internal_note      string
→ 200

POST /admin/classes/{class_id}/submissions/{submission_id}/start-review
→ 200

POST /admin/classes/{class_id}/submissions/{submission_id}/approve
Body (optional):
  moderated_message  string
  internal_note      string
→ 200 { public_id: "MF-K7X4QM", ... }
→ 409 if already approved (returns existing public_id)

POST /admin/classes/{class_id}/submissions/{submission_id}/reject
Body:
  rejection_reason  string  optional
→ 200
```

---

### Approved

```
GET /admin/classes/{class_id}/approved
Query params:
  filter  string  not_posted|posted|taken_down
→ 200 Inertia — approved list with checkboxes

GET /admin/classes/{class_id}/approved/{submission_id}
→ 200 Inertia — approved detail + renderer UI

POST /admin/classes/{class_id}/approved/{submission_id}/mark-posted
→ 200

POST /admin/classes/{class_id}/approved/{submission_id}/render
Body:
  format          string  story|feed_portrait
  show_logo       bool    default: class setting
  show_website_url bool   default: class setting
  design:
    source          string  builtin|custom
    template_key    string  e.g. "pastel-grid"  (if builtin)
    background_color string hex e.g. "#F6DCE8"
    pattern_key     string  dots|grid|diagonal_lines|plus|circles|triangles|checker|waves
    pattern_color   string  hex
    pattern_opacity float   0–1
    class_design_id string  UUID (if custom)
→ 200 image/png  (attachment download)
→ 403 if taken_down

POST /admin/classes/{class_id}/approved/{submission_id}/preview
Same body as render
→ 200 image/png  (540px wide preview, inline)

POST /admin/classes/{class_id}/approved/bulk-render
Body:
  submission_ids*  array   UUIDs of approved submissions
  format*          string  story|feed_portrait
  bulk_config      object  same design fields as single render
  item_overrides   object  { "submission_uuid": { ...design fields } }
→ 200 application/zip  (filename: {slug}_{date}_{format}_{n}-items.zip)
→ 422 if foreign-class IDs / no eligible submissions
```

---

### Designs (Custom Backgrounds)

Max 3 active Story designs + max 3 active Feed Portrait designs per class (independent).

```
GET /admin/classes/{class_id}/designs
→ 200 Inertia — design slots grid

POST /admin/classes/{class_id}/designs
Body (multipart/form-data):
  image*       file    JPEG/PNG/WebP, max 20MB, max 6000px
  format*      string  story|feed_portrait
  slot_index*  int     1|2|3
  name         string
→ 201 { design: { id, format, slot_index, source_asset_key, crop_x, crop_y, ... } }
→ 422 if slot limit reached or slot taken

GET /admin/classes/{class_id}/designs/{design_id}
→ 200 Inertia — design detail + crop UI

PATCH /admin/classes/{class_id}/designs/{design_id}
Body:
  name     string
  focal_x  float  0–1  (recalculates crop)
  focal_y  float  0–1
→ 200 { design: { ... } }

DELETE /admin/classes/{class_id}/designs/{design_id}
→ 204

POST /admin/classes/{class_id}/designs/{design_id}/derive-feed
Body:
  focal_x  float  0–1  optional, default 0.5
  focal_y  float  0–1  optional, default 0.5
Derives Feed 4:5 fallback crop from Story source (no new DB record created).
→ 200 { design: { ..., feed_fallback_crop: { x, y, width, height } } }
→ 422 if design is not a Story design
```

---

### Takedown Admin

```
GET /admin/classes/{class_id}/takedowns
Query params:
  status  string  pending|reviewing|approved|rejected|resolved
→ 200 Inertia — takedown queue

GET /admin/classes/{class_id}/takedowns/{request_id}
→ 200 Inertia — takedown detail

POST /admin/classes/{class_id}/takedowns/{request_id}/start-review
→ 200

POST /admin/classes/{class_id}/takedowns/{request_id}/approve
Body:
  admin_note  string  optional
Effect: submission.status → taken_down, public_id preserved
→ 200

POST /admin/classes/{class_id}/takedowns/{request_id}/reject
Body:
  admin_note  string  optional
→ 200
```

---

### Class Settings

```
GET /admin/classes/{class_id}/settings
→ 200 Inertia — settings form

PATCH /admin/classes/{class_id}/settings
Body:
  name                string
  short_code          string
  instagram_handle    string
  website_label       string
  logo                file    optional image upload
  show_logo           bool
  show_website_url    bool
  template_key        string
  background_color    string  hex
  pattern_key         string
  pattern_color       string  hex
  pattern_opacity     float   0–1
→ 200
→ 403 if not class member
```

---

## Built-in Template Keys

| Key | Name | Pattern |
|-----|------|---------|
| `pastel-dots` | Pastel Dots | dots |
| `pastel-grid` | Pastel Grid | grid |
| `pastel-lines` | Pastel Lines | diagonal_lines |
| `pastel-plus` | Pastel Plus | plus |
| `pastel-checker` | Pastel Checker | checker |
| `pastel-circles` | Pastel Circles | circles |
| `plain-pink` | Plain Pink | — |
| `plain-blue` | Plain Blue | — |

Pattern keys: `dots`, `grid`, `diagonal_lines`, `plus`, `circles`, `triangles`, `checker`, `waves`

---

## Public ID Format

- Prefix: `MF` (configurable via `PUBLIC_ID_PREFIX` env)
- Format: `MF-XXXXXX` (6 random chars)
- Alphabet: `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no I, L, O, 0, 1)
- Globally unique, immutable after approval
- Lookup accepts: `MF-K7X4QM`, `mf-k7x4qm`, `MFK7X4QM` (normalized)

---

## Submission Status Flow

```
submitted → under_review → approved → taken_down
                        ↘ rejected
                        ↘ takedown_requested → taken_down
```

---

## Environment Variables

```env
APP_URL=http://localhost:8000

# PinatAuth (only this one needed)
PINAT_AUTH_URL=http://auth.pinat.nl

# PostgreSQL
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=menfess
DB_USERNAME=root
DB_PASSWORD=

# MinIO / S3-compatible
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=menfess
AWS_ENDPOINT=https://s3.pinat.nl
AWS_USE_PATH_STYLE_ENDPOINT=true

# App config
PUBLIC_ID_PREFIX=MF
SUBMIT_RATE_LIMIT=5
TAKEDOWN_RATE_LIMIT=3
```
