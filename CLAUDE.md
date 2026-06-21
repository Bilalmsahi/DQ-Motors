# CLAUDE.md — Car Dealership Platform

## Project Summary

**DQ Motors** is a full-stack car dealership management platform built for a real Canadian dealership (dqmotors.ca). It serves two audiences:

- **Staff (Admin, Sales, Technician):** Full back-office operations — inventory lifecycle, CRM with lead tracking, deal building, in-house financing (BHPH), expense/vendor management, marketing campaigns, social media posting, and audit logs.
- **Customers/Public:** Browse inventory, submit trade-ins, apply for financing, view blog posts, post their own vehicles (feature-gated), manage a wishlist, and book appointments.

Core features: vehicle inventory with lifecycle tracking, CRM (leads → appointments → deals), Buy-Here-Pay-Here loan management, financial analytics per vehicle (cost basis / profit margin), marketing campaigns, newsletter, blog, social media integration (Facebook/Instagram), testimonials, SEO sitemap/robots, and configurable feature flags.

---

## Tech Stack

### Backend
| Tool | Version | Purpose |
|---|---|---|
| Python | 3.9+ | Language |
| Django | 5.2.10 | Web framework |
| Django REST Framework | 3.16.1 | REST API |
| djangorestframework-simplejwt | 5.5.1 | JWT authentication |
| dj-rest-auth | 7.0.2 | Auth helper endpoints |
| MySQL | — | Primary database (via `django.db.backends.mysql`) |
| Pillow | 12.1.0 | Image processing / WebP conversion |
| boto3 | 1.42.54 | AWS S3 media storage |
| django-storages | 1.14.6 | S3 backend integration |
| WhiteNoise | 6.11.0 | Static file serving |
| django-cors-headers | 4.9.0 | CORS for React frontend |
| django-filter | 25.2 | Querystring filtering on list endpoints |
| google-generativeai | 0.8.6 | Gemini AI (vehicle description generation) |
| google-auth | 2.41.1 | Google OAuth token verification |
| qrcode | 8.2 | QR codes for appointment check-in |
| python-dotenv | 1.2.1 | .env loading |
| gunicorn | 23.0.0 | Production WSGI server |

### Frontend
| Tool | Version | Purpose |
|---|---|---|
| React | 19.2.0 | UI framework |
| React Router | 7.11.0 | Client-side routing |
| Vite | 7.2.4 | Build tool / dev server |
| Tailwind CSS | 3.4.17 | Utility-first styling |
| lucide-react | 0.562.0 | Icon library |
| framer-motion | 12.38.0 | Animations |
| Swiper | 12.1.2 | Carousels |
| Recharts | 3.7.0 | Charts (financial analytics, performance) |
| rc-slider | 11.1.9 | Price/year range sliders |
| date-fns | 4.1.0 | Date formatting / calculation |
| react-signature-canvas | 1.1.0-alpha.2 | Customer signature capture on deals |
| react-doc-viewer | 1.17.1 | In-browser PDF/image document previews |
| @react-oauth/google | 0.13.4 | Google Sign-In button |
| react-helmet-async | — | Dynamic `<head>` / SEO meta tags |
| prop-types | 15.8.1 | Runtime prop validation |
| ESLint | 9.39.1 | Linting |

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│           dealer_frontend (React)        │
│   Vite dev server · localhost:5173       │
│                                         │
│  AuthContext ─ ConfigContext ─ WishlistContext  │
│  (JWT in localStorage)                  │
│       │                                 │
│  src/services/api.js  (fetch wrapper)   │
└───────────────┬─────────────────────────┘
                │  HTTP/HTTPS REST API
                │  Bearer JWT
┌───────────────▼─────────────────────────┐
│           backend (Django)              │
│   gunicorn/runserver · localhost:8000   │
│                                         │
│  /api/auth/   /api/inventory/           │
│  /api/crm/    /api/financials/          │
│  /api/loans/  /api/marketing/           │
│  /api/blog/   /api/social/              │
│  /api/config/ (feature flags)           │
│       │                                 │
│  Django ORM                             │
└───────────────┬─────────────────────────┘
                │
      ┌─────────┴──────────┐
      │                    │
┌─────▼──────┐    ┌────────▼──────┐
│   MySQL    │    │   AWS S3      │
│ dealership_│    │ autodecar-    │
│    _db     │    │ media-storage │
└────────────┘    └───────────────┘
```

**Data flows:**
1. React app boots → fetches `/api/config/` for feature flags (blocks render until done)
2. User logs in → JWT stored in localStorage; all subsequent requests send `Authorization: Bearer <token>`
3. Google OAuth: Google ID token → `/api/auth/google/` → verified by backend → returns JWT pair
4. Vehicle images uploaded via multipart → stored on S3 → served directly from S3 CDN
5. Feature-flagged routes check `ConfigContext` before rendering; RBAC routes check `AuthContext.isAdmin`

---

## Folder Structure

```
car_dealeship/
├── backend/                        # Django project root
│   ├── manage.py
│   ├── dealer_backend/             # Django settings, main URLs, WSGI
│   │   ├── settings.py             # All config: DB, JWT, S3, CORS, email
│   │   ├── urls.py                 # Root URL routing (includes app URLs)
│   │   └── wsgi.py
│   ├── core/                       # Auth, users, config, audit, notifications
│   │   ├── models.py               # User, DealerConfiguration, AuditLog, Notification, LegalDocument, Testimonial
│   │   ├── views.py                # Login, register, profile, Google OAuth, config, dashboard stats
│   │   ├── serializers.py
│   │   ├── permissions.py          # IsAdmin, IsSales, IsAdminOrSales, etc.
│   │   └── urls.py
│   ├── inventory/                  # Vehicles and related
│   │   ├── models.py               # Vehicle, VehicleImage, VehicleFeature, VehicleDocument, Favorite
│   │   ├── views.py                # Full CRUD + filters + user listings + AI description
│   │   └── urls.py
│   ├── crm/                        # Customer relationship management
│   │   ├── models.py               # Customer, Lead, Appointment, Task, Interaction, Deal, TradeIn
│   │   ├── views.py
│   │   └── urls.py
│   ├── financials/                 # Expense & vendor tracking
│   │   ├── models.py               # Vendor, Expense, ExpenseImage, Invoice
│   │   ├── views.py
│   │   └── urls.py
│   ├── loans/                      # BHPH financing
│   │   ├── models.py               # Loan, Installment
│   │   ├── views.py
│   │   └── urls.py
│   ├── marketing/                  # Campaigns & newsletter
│   │   ├── models.py               # Campaign, NewsletterSubscriber
│   │   ├── views.py
│   │   └── urls.py
│   ├── blog/                       # Blog posts with SEO fields
│   │   ├── models.py               # BlogPost (status, slug, meta fields)
│   │   ├── views.py
│   │   └── urls.py
│   ├── social/                     # Facebook/Instagram OAuth tokens
│   │   ├── models.py               # SocialCredential (encrypted tokens)
│   │   ├── views.py
│   │   └── urls.py
│   ├── requirements.txt
│   └── .env                        # Secrets (not committed)
│
├── dealer_frontend/                # React + Vite
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── eslint.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx                # App entry: GoogleOAuthProvider + HelmetProvider + App
│       ├── App.jsx                 # All route definitions (public, user, admin)
│       ├── index.css               # Tailwind directives + custom scrollbar
│       ├── assets/                 # Static images and icons
│       ├── constants/              # FEATURES enum, other app-wide constants
│       ├── services/
│       │   └── api.js              # Fetch wrapper with auth headers, all API helpers
│       ├── context/
│       │   ├── AuthContext.jsx     # JWT auth state + login/logout methods
│       │   ├── ConfigContext.jsx   # Feature flags (blocks render until loaded)
│       │   └── WishlistContext.jsx # User favorites state
│       ├── layouts/
│       │   ├── AdminLayout.jsx     # Sidebar nav, search, notifications, role guard
│       │   └── UserLayout.jsx      # Simpler sidebar for user account area
│       ├── components/
│       │   ├── common/             # RoleGuard, FeatureRoute, FeatureGuard, Pagination,
│       │   │                       # NotificationDropdown, SignatureModal, FilePreviewModal, etc.
│       │   ├── home/               # Navbar, Footer, HeroSection, CarCard, SearchWidget,
│       │   │                       # FeaturedCarsSection, LoanCalculatorSection, Testimonials, etc.
│       │   ├── listings/           # Vehicle listing grid pieces
│       │   ├── vehicle-details/    # Single vehicle detail page pieces
│       │   └── auth/               # GoogleLoginBtn
│       └── pages/
│           ├── Home.jsx
│           ├── Login.jsx / Register.jsx
│           ├── Listings.jsx / VehicleDetails.jsx
│           ├── FindMyCar.jsx / ContactUs.jsx
│           ├── TradeInPage.jsx / FinancingApplication.jsx
│           ├── SellMyCar.jsx (USER_ADS gated)
│           ├── Blog.jsx / BlogPost.jsx
│           ├── VehicleHistoryReport.jsx
│           ├── LegalPage.jsx
│           ├── user/               # UserDashboard, UserListings, UserAddCar, MyWishlist, UserProfile
│           └── admin/              # 28 admin pages — dashboard, inventory, CRM, deals, calendar,
│                                   # financials, analytics, loans, team, blog, marketing, social, etc.
│
├── requirements.txt                # Python deps (same as backend/requirements.txt)
├── .gitignore
└── README.md                       # Minimal placeholder
```

---

## Key Conventions

### Backend
- **Custom permission classes** in `core/permissions.py` — always use these on ViewSets, never inline logic. Available: `IsAdmin`, `IsSales`, `IsAdminOrSales`, `IsAdminOrReadOnly`, `IsAdminOrSalesOrTechnician`.
- **AuditLog** — write an audit entry whenever staff-facing CRUD mutates data. Use the `AuditLog.log()` helper pattern.
- **DealerConfiguration is a singleton** — always access via its manager or the `get_config()` cached accessor (5-min cache). Never create a second instance.
- **Vehicle images** are auto-converted to WebP 80% quality at max 1920px on save. Do not bypass this by saving images directly.
- **Vehicle slug** is auto-generated and used as the URL identifier — keep it stable once published.
- **SocialCredential tokens** are encrypted at rest using `set_token()` / `get_token()` methods — never read/write the `access_token` field directly.
- **Environment variables** are loaded via `python-dotenv` — all secrets live in `backend/.env`, never hard-code them.
- **Feature flags** are controlled in `DealerConfiguration` — check them server-side in views that gate features.

### Frontend
- **Feature gating** — use `<FeatureRoute>` for route-level gating and `<FeatureGuard>` for component-level gating. Check against `FEATURES` constants from `src/constants/`.
- **Role gating** — use `<RoleGuard>` component. Never inline role checks outside this component or `AdminLayout`.
- **API calls** — always use `src/services/api.js` helpers (`api.get`, `api.post`, `api.upload`, etc.). Never use `fetch` directly.
- **Auth tokens** — tokens live in `localStorage`; managed exclusively by `AuthContext`. Never touch localStorage directly for auth outside this context.
- **ConfigContext blocks render** — the app shows a full-screen loader until config is fetched; this is intentional. Do not add additional blocking fetches at the app level.
- **Lazy loading** — all routes except `/` and `/login` use `React.lazy()` + `<Suspense>`. Keep this pattern for new pages.
- **No custom Tailwind theme** — the project uses default Tailwind color palette. Stick to default utility classes; do not add custom colors unless required.
- **Images always use WebP** — the backend auto-converts, so don't force specific image formats from the frontend.
- **Routing** — React Router 7 is used. Admin routes live under `/admin/*`, user account routes under `/account/*`.

---

## Important Files

| File | Purpose |
|---|---|
| [backend/dealer_backend/settings.py](backend/dealer_backend/settings.py) | All Django config: DB, JWT lifetimes, S3, CORS, email, feature flags default |
| [backend/dealer_backend/urls.py](backend/dealer_backend/urls.py) | Root URL routing — all API mount points |
| [backend/core/models.py](backend/core/models.py) | User model (roles), DealerConfiguration (feature flags), AuditLog, Notification |
| [backend/core/permissions.py](backend/core/permissions.py) | All RBAC permission classes |
| [backend/inventory/models.py](backend/inventory/models.py) | Vehicle lifecycle model with cost/profit logic |
| [backend/crm/models.py](backend/crm/models.py) | Leads, appointments (QR, time-slots), deals (payment calc), trade-ins |
| [backend/financials/models.py](backend/financials/models.py) | Vendor and expense tracking with invoice storage |
| [backend/loans/models.py](backend/loans/models.py) | BHPH loan + installment payment tracking |
| [dealer_frontend/src/App.jsx](dealer_frontend/src/App.jsx) | All route definitions — public, user, admin |
| [dealer_frontend/src/services/api.js](dealer_frontend/src/services/api.js) | Central API client with auth headers |
| [dealer_frontend/src/context/AuthContext.jsx](dealer_frontend/src/context/AuthContext.jsx) | JWT auth state, login/logout, token check on mount |
| [dealer_frontend/src/context/ConfigContext.jsx](dealer_frontend/src/context/ConfigContext.jsx) | Feature flag provider — app-blocking fetch |
| [dealer_frontend/src/layouts/AdminLayout.jsx](dealer_frontend/src/layouts/AdminLayout.jsx) | Full admin shell: sidebar, search, notifications |
| [dealer_frontend/src/components/common/RoleGuard.jsx](dealer_frontend/src/components/common/RoleGuard.jsx) | RBAC route/component guard |

---

## Current State

**Built and functional:**
- Full vehicle inventory CRUD with lifecycle status tracking (ACQUIRED → SOLD)
- CRM: leads, appointments with QR check-in, tasks, interactions, deal builder with e-signature
- Buy-Here-Pay-Here financing with installment payment tracking
- Vendor and expense management per vehicle (cost basis, profit margin)
- Marketing campaigns (date-based, discount type, banner image) linked to vehicles
- Newsletter subscriber management
- SEO blog with draft/publish workflow
- Facebook/Instagram social credential storage and posting
- User-posted vehicle ads (feature-flagged `enable_user_ads`)
- Testimonial management (approve/reject reviews from multiple sources)
- Legal document CMS (privacy policy, terms, returns)
- Activity audit log for all staff actions
- In-app notifications for staff
- Global admin search
- Google OAuth login alongside username/password
- Responsive UI with mobile burger menu

**Feature flags (toggleable by admin):**
- `enable_user_ads` — Customer vehicle listings
- `enable_ai_description` — Gemini AI generates vehicle descriptions
- `enable_vin_decoder` — VIN decoding on vehicle forms
- `enable_chat_support` — Live chat widget

**Deployment target:** dqmotors.ca (Canadian dealership)
- Backend: gunicorn + MySQL
- Frontend: static build served separately
- Media: AWS S3 (`autodecar-media-storage`, `us-east-2`)
- Email: Hostinger SMTP (`support@dqmotors.ca`)

---

## Dev Workflow

### Prerequisites
- Python 3.9+, MySQL running, Node.js 18+

### Backend setup
```bash
cd backend
python -m venv ../venv
source ../venv/Scripts/activate   # Windows: ..\venv\Scripts\activate
pip install -r ../requirements.txt
cp .env.example .env              # fill in DB credentials and secrets
python manage.py migrate
python manage.py runserver        # → http://localhost:8000
```

### Frontend setup
```bash
cd dealer_frontend
npm install
cp .env.example .env              # set VITE_API_BASE_URL=http://localhost:8000/api
npm run dev                       # → http://localhost:5173
```

### Production build
```bash
cd dealer_frontend
npm run build                     # outputs to ./dist
```

### Useful commands
```bash
npm run lint                      # ESLint check
python manage.py createsuperuser  # Create admin user
python manage.py makemigrations   # After model changes
python manage.py migrate          # Apply migrations
```

---

## Do's and Don'ts

**Do:**
- Always use `core/permissions.py` permission classes on views — never inline role checks.
- Use `api.js` helpers for all frontend HTTP calls.
- Use `<FeatureRoute>` / `<FeatureGuard>` / `<RoleGuard>` components for access control.
- Use `React.lazy()` + `<Suspense>` for all new page-level components.
- Let the Vehicle model's `save()` method handle image conversion — don't pre-process images.
- Use `SocialCredential.set_token()` / `.get_token()` — never access `access_token` directly.
- Write an `AuditLog` entry for any staff-facing state mutation.
- Fetch the `DealerConfiguration` singleton via its cached accessor — never query directly in hot paths.
- Add new feature flags to `DealerConfiguration` + `ConfigContext` + `FEATURES` constants in tandem.

**Don't:**
- Don't commit `.env` files or secrets — they are gitignored.
- Don't create a second `DealerConfiguration` instance — it is a singleton.
- Don't use `fetch` directly in frontend code — always go through `api.js`.
- Don't add custom Tailwind colors or theme extensions without a clear reason — use defaults.
- Don't bypass image conversion or upload images without going through the `VehicleImage` model.
- Don't store JWT tokens outside of `AuthContext` / `localStorage` managed by `AuthContext`.
- Don't use Django admin (`/superuser/`) for routine business operations — the custom frontend admin panel is the intended interface.
- Don't add blocking data fetches at the app root — `ConfigContext` already has one; adding more hurts perceived load time.

---

## Open Issues / TODOs

- **README.md is essentially empty** — only contains `# car_dealeship`. Should be filled in with setup instructions.
- **No test suite** — no test files found anywhere in the repo (no `tests.py` beyond Django defaults, no frontend test config). Adding tests would significantly improve reliability.
- **No CI/CD config** — no `.github/workflows/` or equivalent pipeline. Deployments appear to be manual.
- **`react-signature-canvas` uses an alpha version (`1.1.0-alpha.2`)** — may have stability issues; consider pinning to a stable release.
- **Social media posting integration** — credentials are stored and encrypted, but the actual posting logic (using Facebook Graph API) may be partially implemented.
- **`enable_chat_support` feature flag** — flag exists but no chat widget is wired up yet; this is a known TODO.
- **VIN decoder** — integrated with the NHTSA public API (`enable_vin_decoder` flag gates it).
- **`/admin/reels` page (`AdminReelComposer.jsx`)** — posts video reels to Instagram/Facebook via the Social credentials stored in `SocialCredential`.
- **Trade-in appraisal flow** — customers can submit trade-ins; the staff valuation/response workflow in the admin may be partially complete.
- **Loan module** — BHPH loan and installment models are defined; confirm full UI implementation in `AdminLoanManager.jsx`.
- **`.env.example` files** — no example env files were found; the actual `.env` files (with secrets) are present in the repo working tree. This should be fixed — strip secrets, add `.env.example` templates.
