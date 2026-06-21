<p align="center">
  <img src="dealer_frontend/public/logo/Logo%20DQ%20Motors.png" alt="DQ Motors" width="320" />
</p>

<h1 align="center">DQ Motors — Dealership Management Platform</h1>

<p align="center">
  A production-grade, full-stack platform built for a real Canadian car dealership <a href="https://dqmotors.ca">(dqmotors.ca)</a> —
  covering inventory, CRM, in-house financing, marketing, and back-office operations end to end.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Django-5.2-092E20?logo=django&logoColor=white" alt="Django" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/DRF-3.16-ff1709?logo=django&logoColor=white" alt="Django REST Framework" />
  <img src="https://img.shields.io/badge/MySQL-database-4479A1?logo=mysql&logoColor=white" alt="MySQL" />
  <img src="https://img.shields.io/badge/AWS%20S3-media%20storage-FF9900?logo=amazonaws&logoColor=white" alt="AWS S3" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/TailwindCSS-3-38BDF8?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/license-Proprietary-lightgrey" alt="License" />
</p>

---

## Overview

DQ Motors is not a template or a demo — it's a complete operating system for a car dealership, built from the ground up to run real day-to-day operations for both staff and customers.

It serves **two distinct audiences** through one codebase:

- **Staff (Admin / Sales / Technician)** — a full back-office suite covering inventory lifecycle management, CRM with lead-to-deal pipelines, in-house (Buy-Here-Pay-Here) financing, per-vehicle financial analytics, marketing campaigns, social media publishing, and a complete audit trail.
- **Customers / Public** — a polished storefront to browse inventory, get instant financing pre-approval, submit trade-ins, post their own vehicle for sale, save favorites to a wishlist, book service/sales appointments with QR check-in, and read dealership news on a built-in SEO blog.

This README documents the full scope of what's been built.

---

## Table of Contents

- [Platform Highlights](#platform-highlights)
- [Feature Breakdown](#feature-breakdown)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Role-Based Access Control](#role-based-access-control)
- [Feature Flags](#feature-flags)
- [Getting Started](#getting-started)
- [Roadmap](#roadmap)

---

## Platform Highlights

| | |
|---|---|
| 🚗 **Inventory Engine** | Full vehicle lifecycle from acquisition to sale, with automatic image optimization, VIN decoding, and AI-generated descriptions |
| 📇 **CRM Pipeline** | Leads → Appointments → Deals, with task tracking, interaction logging, and e-signature capture |
| 💰 **In-House Financing** | Buy-Here-Pay-Here loan origination with full installment tracking |
| 📊 **Financial Analytics** | Real cost-basis and profit-margin reporting, per vehicle and across the fleet |
| 📣 **Marketing Suite** | Date-bound campaigns, a newsletter pipeline, and direct Facebook/Instagram publishing (including video reels) |
| ✍️ **SEO Blog & CMS** | Draft/publish workflow with full meta-field control, plus a legal document CMS |
| 🔐 **Enterprise-Grade Auth** | JWT authentication, Google OAuth, granular role-based permissions, and a full activity audit log |
| 🧩 **Feature-Flagged Rollouts** | Admin-toggleable features (AI descriptions, VIN decoding, user-posted ads, live chat) with zero redeploys |

---

## Feature Breakdown

### Inventory Management
- Complete vehicle lifecycle tracking: **Acquired → Listed → Reserved → Sold**
- Multi-image upload with **automatic WebP conversion** (80% quality, max 1920px) for fast page loads
- Structured feature lists, document attachments (titles, inspection reports, etc.)
- VIN decoding via the NHTSA public API (feature-flagged)
- AI-generated vehicle descriptions via **Google Gemini** (feature-flagged)
- Public listing search/filter with price, year, make/model, and body-style filtering
- Customer wishlist / favorites

### CRM & Sales Pipeline
- Lead capture and qualification, with task assignment and interaction history per customer
- Appointment scheduling with **QR-code check-in**
- Deal builder with payment calculation and **customer e-signature capture**
- Trade-in submission flow for customers, with a staff-side appraisal workflow

### In-House Financing (Buy-Here-Pay-Here)
- Loan origination tied directly to deals
- Installment schedule generation and payment tracking
- Designed for dealerships that finance their own inventory rather than relying solely on third-party lenders

### Financials
- Vendor and expense tracking per vehicle (reconditioning, transport, fees, etc.)
- Invoice storage and association
- True **cost basis vs. profit margin** reporting — not just sale price minus purchase price

### Marketing & Social
- Campaign builder: date-bound, discount-typed, with banner imagery, linked to specific vehicles
- Newsletter subscriber management
- Encrypted storage of Facebook/Instagram credentials, with direct publishing — including video reel composition

### Content & SEO
- Full blog engine with draft/publish workflow and per-post SEO meta fields
- Dynamic sitemap and robots.txt generation
- Legal document CMS (privacy policy, terms, returns) editable without a deploy
- Customer testimonial management with multi-source approval workflow

### Platform & Operations
- Role-based dashboards for **Admin, Sales, and Technician** staff
- Global admin search across the platform
- In-app staff notifications
- Full **audit log** of staff actions for accountability and compliance
- Configurable feature flags, toggleable live by admins

---

## Tech Stack

### Backend

| Technology | Version | Role |
|---|---|---|
| Python | 3.9+ | Core language |
| Django | 5.2.10 | Web framework |
| Django REST Framework | 3.16.1 | REST API layer |
| djangorestframework-simplejwt | 5.5.1 | JWT authentication |
| dj-rest-auth | 7.0.2 | Auth endpoint helpers |
| MySQL | — | Primary relational database |
| Pillow | 12.1.0 | Image processing & WebP conversion |
| boto3 + django-storages | 1.42.54 / 1.14.6 | AWS S3 media storage |
| WhiteNoise | 6.11.0 | Static file serving |
| django-cors-headers | 4.9.0 | CORS for the React frontend |
| django-filter | 25.2 | Querystring filtering on list endpoints |
| google-generativeai | 0.8.6 | Gemini AI vehicle description generation |
| google-auth | 2.41.1 | Google OAuth token verification |
| qrcode | 8.2 | Appointment check-in QR codes |
| gunicorn | 23.0.0 | Production WSGI server |

### Frontend

| Technology | Version | Role |
|---|---|---|
| React | 19.2.0 | UI framework |
| React Router | 7.11.0 | Client-side routing |
| Vite | 7.2.4 | Build tool & dev server |
| Tailwind CSS | 3.4.17 | Utility-first styling |
| lucide-react | 0.562.0 | Icon system |
| Framer Motion | 12.38.0 | Animation |
| Swiper | 12.1.2 | Carousels |
| Recharts | 3.7.0 | Financial & performance charts |
| rc-slider | 11.1.9 | Price/year range filters |
| date-fns | 4.1.0 | Date formatting and calculation |
| react-signature-canvas | 1.1.0-alpha.2 | Customer e-signature capture |
| react-doc-viewer | 1.17.1 | In-browser document previews |
| @react-oauth/google | 0.13.4 | Google Sign-In |
| react-helmet-async | latest | Dynamic SEO meta tags |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│            dealer_frontend (React)           │
│        Vite dev server · localhost:5173      │
│                                               │
│   AuthContext · ConfigContext · WishlistCtx  │
│           (JWT stored in localStorage)       │
│                      │                       │
│        src/services/api.js (fetch wrapper)   │
└──────────────────────┬────────────────────────┘
                       │  REST · Bearer JWT
┌──────────────────────▼────────────────────────┐
│               backend (Django)                │
│         gunicorn/runserver · localhost:8000    │
│                                               │
│  /api/auth   /api/inventory   /api/crm        │
│  /api/financials   /api/loans   /api/marketing │
│  /api/blog   /api/social   /api/config        │
│                      │                       │
│                  Django ORM                   │
└──────────────────────┬────────────────────────┘
                       │
            ┌──────────┴──────────┐
            │                     │
     ┌──────▼──────┐      ┌───────▼────────┐
     │    MySQL    │      │     AWS S3      │
     │ dealership_db│      │ media storage   │
     └─────────────┘      └────────────────┘
```

**Key flows:**
1. The React app fetches `/api/config/` on boot to resolve feature flags before rendering anything.
2. Authentication issues a JWT pair, stored in `localStorage` and attached to every subsequent request.
3. Google OAuth exchanges a Google ID token for a verified DQ Motors JWT pair.
4. Vehicle images are uploaded via multipart form, auto-converted to WebP, and served directly from S3.
5. Feature-flagged and role-gated routes are resolved client-side via `ConfigContext` and `AuthContext` before render.

---

## Project Structure

```
DQ-Motors/
├── backend/                  # Django project
│   ├── dealer_backend/       # Settings, root URLs, WSGI
│   ├── core/                 # Auth, users, config, audit log, notifications
│   ├── inventory/            # Vehicles, images, features, documents
│   ├── crm/                  # Customers, leads, appointments, deals, trade-ins
│   ├── financials/           # Vendors, expenses, invoices
│   ├── loans/                # BHPH loans & installments
│   ├── marketing/            # Campaigns & newsletter
│   ├── blog/                 # SEO blog engine
│   └── social/               # Facebook/Instagram credentials & posting
│
└── dealer_frontend/          # React + Vite
    └── src/
        ├── context/          # Auth, Config, Wishlist providers
        ├── layouts/           # AdminLayout, UserLayout
        ├── components/        # common / home / listings / vehicle-details / auth
        └── pages/
            ├── user/          # Customer account area
            └── admin/         # 28 admin pages — dashboard, CRM, deals, financials, loans, marketing…
```

---

## Role-Based Access Control

| Role | Access |
|---|---|
| **Admin** | Full platform access — inventory, CRM, financials, loans, marketing, team management, configuration |
| **Sales** | Inventory, CRM, deals, appointments |
| **Technician** | Vehicle servicing / inspection-related views |
| **Customer** | Public storefront, wishlist, trade-ins, financing applications, own listings (if enabled), appointments |

Enforced consistently on both sides: Django permission classes (`IsAdmin`, `IsSales`, `IsAdminOrSales`, `IsAdminOrSalesOrTechnician`) on the API, and `<RoleGuard>` / `<FeatureRoute>` components on the frontend.

---

## Feature Flags

Toggleable live by an admin, no redeploy required:

| Flag | Controls |
|---|---|
| `enable_user_ads` | Customers posting their own vehicle listings |
| `enable_ai_description` | Gemini AI-generated vehicle descriptions |
| `enable_vin_decoder` | VIN decoding on vehicle forms (NHTSA API) |
| `enable_chat_support` | Live chat widget |

---

## Getting Started

### Prerequisites
Python 3.9+, MySQL, Node.js 18+

### Backend
```bash
cd backend
python -m venv ../venv
source ../venv/Scripts/activate     # Windows: ..\venv\Scripts\activate
pip install -r ../requirements.txt
cp .env.example .env                # fill in DB credentials and secrets
python manage.py migrate
python manage.py runserver          # → http://localhost:8000
```

### Frontend
```bash
cd dealer_frontend
npm install
cp .env.example .env                # set VITE_API_BASE_URL=http://localhost:8000/api
npm run dev                         # → http://localhost:5173
```

### Production build
```bash
cd dealer_frontend
npm run build                       # outputs to ./dist
```

---

## Roadmap

- Automated test suite (backend + frontend)
- CI/CD pipeline
- Live chat widget implementation
- Expanded social posting coverage

---

<p align="center">
  Built for <a href="https://dqmotors.ca">DQ Motors</a> — a real, operating Canadian car dealership.
</p>
