# KLARONE — TECHNICAL ARCHITECTURE, FLOWS & DESIGN RULES

## 1. Purpose

This document is the technical source of truth for the first implementation phases of Klarone.

The system should be designed as a **custom commerce and service platform**, not as a Shopify clone.

Klarone owns its business logic and customer lifecycle.

External providers are used where they offer commodity infrastructure that Klarone does not need to reinvent.

---

## 2. Final Technology Stack

### Frontend
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui

Responsibilities:
- public website,
- homepage,
- product catalogue,
- product detail pages,
- Klarone Select,
- cart experience,
- customer account,
- service requests,
- order/service status,
- SEO-friendly pages.

### Backend
- NestJS
- TypeScript

Architecture:
- modular monolith for initial versions.

Responsibilities:
- business logic,
- APIs,
- authentication integration,
- products,
- inventory,
- carts/orders,
- recommendation engine,
- customers,
- devices,
- service workflows,
- repair workflows,
- upgrade workflows,
- notifications,
- admin functionality.

### Database
- PostgreSQL

### ORM
- Prisma 7 for the initial production baseline.

### AI
- OpenAI API

Use cases:
- requirement understanding,
- conversational recommendation assistance,
- recommendation explanation,
- customer support assistance,
- structured extraction from natural-language requests.

### Authentication
- GoKwik Kwik Pass for customer-facing authentication where supported by the integration.

Important:
GoKwik authentication is an external identity layer.
Klarone must maintain its own internal Customer record and not make the Klarone database dependent on GoKwik as the sole source of truth.

### Checkout
- GoKwik Kwik Checkout

GoKwik is the checkout/conversion layer.

Klarone remains the source of truth for its own orders.

### Payments
- GoKwik-supported payment/aggregator integrations.

Do not build payment processing infrastructure ourselves.

### Search
V1:
- PostgreSQL search, filtering and indexing.

Later:
- Typesense if product catalogue size, search complexity or search UX justifies a dedicated search engine.

Do not introduce Algolia/Typesense/Meilisearch on day one unless actual performance or UX requirements justify it.

### Cache / background processing
- Redis

Use for:
- cache,
- rate limiting,
- temporary state,
- queues/background jobs,
- future recommendation/search support.

### Object storage
- Amazon S3

Use for:
- product images,
- invoices,
- service documents,
- customer-uploaded files where appropriate.

### Hosting
- Vercel for Next.js.
- Managed server/container hosting for NestJS.
- Managed PostgreSQL.

### Monitoring
- Sentry,
- structured application logs.

### Version control
- GitHub.

### Notifications
Use appropriate providers for:
- WhatsApp,
- SMS,
- email.

Provider selection can be finalized separately based on Indian delivery, pricing and API quality.

---

## 3. High-Level System Architecture

                         KLARONE
                            |
          +-----------------+-----------------+
          |                                   |
     CUSTOMER WEB                         ADMIN WEB
      Next.js                              Next.js
          |                                   |
          +-----------------+-----------------+
                            |
                            v
                    KLARONE BACKEND
                    NestJS Monolith
                            |
      +---------------------+----------------------+
      |                     |                      |
      v                     v                      v
  PostgreSQL               Redis                S3
      |
      +-----------------------------+
      |                             |
 Commerce Modules             Customer/Service
      |                             |
 Products                       Customers
 Inventory                      Devices
 Cart                           Warranty
 Orders                         Service Requests
 Promotions                     Repairs
                                  Upgrades


External integrations:

Klarone Backend
   |
   +---- OpenAI API
   +---- GoKwik Kwik Pass
   +---- GoKwik Kwik Checkout
   +---- Payment/aggregator integrations
   +---- WhatsApp/SMS/Email providers

---

## 4. Architectural Principle: Modular Monolith

Do NOT start with microservices.

Use one NestJS application with clear internal modules.

Suggested structure:

/src
  /auth
  /customers
  /devices
  /catalog
  /inventory
  /search
  /cart
  /orders
  /payments
  /checkout
  /recommendations
  /services
  /repairs
  /upgrades
  /warranty
  /notifications
  /admin
  /common

Each module should have clear responsibilities and interfaces.

The architecture should make future extraction into services possible, but extraction is not an initial goal.

---

## 5. Core Domain Model

The most important business relationship is:

Customer
  -> Orders
  -> Devices
  -> Recommendations
  -> Support Requests

Order
  -> Order Items
  -> Payment
  -> Fulfilment
  -> Potential Device record

Device
  -> Warranty
  -> Service History
  -> Repairs
  -> Upgrades
  -> Notes / Diagnostics

A customer's laptop history is a first-class domain concept.

Do not treat the laptop as only an order line item.

---

## 6. Core Entities (Initial Version)

### Customer

Suggested fields:
- id
- name
- phone
- email
- auth_provider
- external_auth_id
- address references
- created_at
- updated_at
- status

### Product

Suggested fields:
- id
- brand
- model_name
- sku
- product_type
- description
- price
- sale_price
- currency
- stock_status
- warranty_info
- specifications
- images
- active
- created_at
- updated_at

Product specifications should be structured enough for filtering and recommendation logic.

Avoid storing everything as unstructured text.

### Product Specification

Examples:
- processor
- GPU
- RAM
- RAM upgradeability
- storage
- storage upgradeability
- display size
- display type
- resolution
- refresh rate
- brightness
- weight
- battery information
- ports
- operating system
- warranty
- category
- intended use tags

### Inventory

Suggested concepts:
- product_id
- available_quantity
- reserved_quantity
- warehouse/location
- supplier/source
- restock status

### Cart

- customer/session identifier
- items
- quantities
- pricing snapshot
- timestamps

### Order

- id
- customer_id
- order_number
- status
- subtotal
- discount
- shipping
- total
- payment status
- fulfilment status
- checkout provider reference
- timestamps

### Order Item

- order_id
- product_id
- quantity
- unit price
- price snapshot
- product snapshot

Store enough information so historical orders remain understandable even if product data changes later.

### Device

Suggested fields:
- id
- customer_id
- order_id
- brand
- model
- serial_number where available
- purchase_date
- warranty_start
- warranty_end
- configuration
- current_status
- notes

### Service Request

- id
- customer_id
- device_id
- type
- issue_description
- priority
- location
- status
- assigned technician
- quoted amount
- final amount
- created_at
- updated_at

### Repair

- service_request_id
- diagnosis
- parts
- labour
- estimate
- approval
- status
- before/after notes
- completed_at

### Upgrade

- service_request_id
- upgrade_type
- old_component
- new_component
- cost
- warranty implications
- completed_at

### Recommendation Session

- id
- customer_id or anonymous session
- raw user request
- structured requirements
- candidate products
- scoring results
- displayed recommendations
- selected product, if any
- timestamps

Keep recommendation sessions for analytics and improvement, while respecting privacy and retention requirements.

---

## 7. Klarone Select Flow

User journey:

1. User enters Klarone Select.
2. System asks conversational or structured questions.
3. Natural language answers are parsed into structured requirements.
4. Backend validates the requirements.
5. Product search retrieves eligible candidates.
6. Rule-based scoring ranks candidates.
7. Availability and commercial constraints are checked.
8. AI generates the explanation.
9. UI shows a small shortlist.
10. User can:
   - compare,
   - ask another question,
   - buy,
   - talk to an expert,
   - save the recommendation.

Important:

AI should NOT directly invent the product ranking.

Preferred pipeline:

User input
  ↓
LLM extracts structured requirements
  ↓
Klarone validation
  ↓
Product retrieval
  ↓
Deterministic scoring
  ↓
Business-rule checks
  ↓
LLM explains result
  ↓
Customer UI

---

## 8. Recommendation Scoring

Initial scoring can use weighted factors.

Example conceptual formula:

score =
  performance_fit
  + budget_fit
  + portability_fit
  + battery_fit
  + display_fit
  + upgradeability_fit
  + ownership_fit
  + use_case_fit

Weights depend on the user's stated priorities.

Do not hard-code one universal weight for every customer.

For example:

Gaming customer:
- GPU/performance weight increases.

Travel-heavy customer:
- weight and battery increase.

Long-term ownership customer:
- upgradeability, thermals, warranty and durability-related attributes become more important.

All scoring factors must be explainable.

---

## 9. Recommendation Output

Prefer a small number of useful choices.

Example:

1. Best Fit
2. Best Value
3. Best Long-Term Option

Each result should show:

- product name,
- current price,
- availability,
- key specifications,
- why it matches,
- notable trade-offs,
- relevant warranty/service details where available,
- purchase action.

Avoid showing a huge list unless the user asks for it.

---

## 10. Important Recommendation Rules

The backend must prevent the AI from:

- inventing specifications,
- inventing prices,
- inventing inventory,
- inventing warranty terms,
- inventing service capabilities,
- claiming a product is available when it is not,
- making unsupported performance claims.

The model should receive trusted structured data from Klarone.

---

## 11. Product Search Architecture

### V1

Use PostgreSQL.

Support:
- keyword search,
- brand filters,
- price ranges,
- processor filters,
- GPU filters,
- RAM,
- storage,
- display,
- weight,
- intended use,
- availability.

Create appropriate PostgreSQL indexes.

### Later

If search quality or scale requires it:

PostgreSQL
  ↓
Search indexing pipeline
  ↓
Typesense

PostgreSQL remains the source of truth.

Search engine data is a derived index and can be rebuilt.

---

## 12. Authentication Flow

Preferred customer flow:

User
  ↓
GoKwik Kwik Pass
  ↓
OTP / authentication
  ↓
GoKwik identity/reference
  ↓
Klarone backend
  ↓
Find or create Klarone Customer
  ↓
Create Klarone session/token
  ↓
Customer account

Important rule:

Klarone must maintain its own internal customer identity even when GoKwik handles authentication.

This prevents vendor lock-in and protects the integrity of the customer lifecycle.

---

## 13. Checkout Flow

Preferred flow:

Customer
  ↓
Klarone cart
  ↓
Klarone creates order draft
  ↓
GoKwik Checkout
  ↓
Customer completes checkout/payment
  ↓
Provider webhook/callback
  ↓
Klarone verifies status
  ↓
Klarone order becomes PAID
  ↓
Inventory reservation/finalization
  ↓
Fulfilment
  ↓
Customer notification

Never mark an order as paid solely because the frontend says payment succeeded.

The backend must verify the trusted provider callback/webhook according to the provider's documented integration method.

---

## 14. Order State Model

A simple initial state model:

DRAFT
  ↓
PENDING_PAYMENT
  ↓
PAID
  ↓
CONFIRMED
  ↓
PROCESSING
  ↓
SHIPPED / OUT_FOR_DELIVERY
  ↓
DELIVERED

Alternative/exception states:

PAYMENT_FAILED
CANCELLED
RETURN_REQUESTED
RETURNED
REFUNDED

Keep order state transitions explicit and auditable.

---

## 15. Service / Repair Flow

Customer:

"My laptop is slow."

Flow:

Customer
  ↓
My Klarone
  ↓
Select Device
  ↓
Create Service Request
  ↓
Describe issue
  ↓
AI-assisted issue categorization (optional)
  ↓
Klarone service team review
  ↓
Assign technician
  ↓
Visit / remote diagnosis
  ↓
Diagnosis
  ↓
Quotation if required
  ↓
Customer approval
  ↓
Repair / Upgrade
  ↓
Quality check
  ↓
Complete
  ↓
Service history updated

The device record should be updated after service completion.

---

## 16. Admin Workflow

Admin dashboard should eventually contain:

### Commerce
- products
- pricing
- stock
- orders
- returns
- discounts

### Customers
- customer profiles
- devices
- orders
- service history
- support requests

### Klarone Select
- recommendation sessions
- conversion funnel
- most requested use cases
- recommendation-to-purchase conversion

### Services
- service requests
- repair queue
- upgrade jobs
- technician assignment
- status tracking

### Operations
- notifications
- payment events
- webhook logs
- audit logs

---

## 17. Technician Workflow (Future Module)

Technician should eventually have a focused interface:

- assigned jobs,
- customer/device information,
- issue,
- location,
- appointment time,
- diagnosis form,
- parts used,
- cost,
- before/after photos where appropriate,
- customer approval,
- completion.

Do not expose unnecessary admin functions to technicians.

Use role-based access control.

---

## 18. UX / Design Direction

Klarone should feel:

- trustworthy,
- modern,
- simple,
- technically credible,
- helpful,
- local but not "small-shop" in appearance.

Avoid:

- overly futuristic "AI startup" styling,
- excessive animations,
- technical jargon on the homepage,
- cluttered product cards,
- generic ecommerce banners,
- fake urgency.

### Homepage concept

Primary message:
"Find the laptop that's right for you."

Primary CTA:
"Get my recommendation"

Secondary CTA:
"Browse laptops"

Support message:
"Buy it. Set it up. Repair it. Upgrade it. We've got you."

---

## 19. UX Principles for Klarone Select

The recommendation experience should:

- ask simple questions,
- explain why each answer matters when useful,
- avoid overwhelming users,
- allow skipping non-essential questions,
- show progress,
- produce useful recommendations quickly,
- allow human support.

Do not force users through a 30-question form before showing value.

---

## 20. Responsive Design

V1 should be mobile-first.

Reason:
- Indian ecommerce has strong mobile usage.
- Service requests and support will often happen from phones.
- WhatsApp and OTP-based workflows are phone-centric.

Desktop must still provide a strong shopping experience for comparison-heavy laptop buyers.

---

## 21. API Design

Use REST APIs initially.

Keep API contracts explicit.

Example:

GET /products
GET /products/:id

POST /cart
PATCH /cart/:id

POST /orders
GET /orders/:id

POST /recommendations/sessions
POST /recommendations/sessions/:id/answers
GET /recommendations/sessions/:id/results

GET /customers/me
GET /customers/me/devices

POST /service-requests
GET /service-requests/:id

Admin routes should be separated from customer routes and protected by role-based access control.

---

## 22. Integration Architecture

External services should be wrapped behind internal interfaces/adapters.

Example:

Authentication:
KlaroneAuthProvider
  -> GoKwikAuthProvider

Checkout:
KlaroneCheckoutProvider
  -> GoKwikCheckoutProvider

Notification:
KlaroneNotificationProvider
  -> WhatsAppProvider
  -> SMSProvider
  -> EmailProvider

This makes it easier to replace vendors later without rewriting the entire application.

---

## 23. Security Rules

Minimum expectations:

- never expose secret API keys to the frontend,
- validate all webhook signatures according to provider documentation,
- validate and sanitize user inputs,
- use server-side authorization,
- role-based access control for admin/technician users,
- encrypt secrets,
- avoid storing unnecessary sensitive information,
- maintain audit logs for important admin/service actions,
- use secure HTTP-only cookies or equivalent secure session mechanisms where appropriate.

---

## 24. Data Ownership Rules

Klarone should own the following as the system of record:

- customers,
- products,
- inventory,
- orders,
- devices,
- warranties,
- recommendations,
- service requests,
- repairs,
- upgrades,
- customer service history.

External vendors can own the processing of:

- authentication,
- checkout,
- payment,
- communication,
- infrastructure.

But Klarone should store the relevant external reference IDs and event status needed to operate independently.

---

## 25. Development Rules for AI Coding Agents

When an AI coding agent works on this repository:

1. Read the project documentation before making changes.
2. Do not invent requirements.
3. Do not replace selected technologies without a clear reason.
4. Do not introduce microservices without explicit architectural approval.
5. Do not expose secrets.
6. Do not let frontend state become the authoritative source for orders/payments.
7. Do not let AI directly invent product facts.
8. Do not bypass backend authorization.
9. Keep modules loosely coupled.
10. Prefer reusable services/components over duplicated code.
11. Add tests for important business logic.
12. Update documentation when architecture changes.
13. Preserve backwards compatibility when practical.
14. Prefer a simple implementation over an unnecessarily complex abstraction.

---

## 26. Initial Repository Concept

Recommended top-level layout:

/apps
  /web
  /api

/packages
  /ui
  /types
  /config

/docs
  /KLARONE-VISION.md
  /KLARONE-TECH-ARCHITECTURE.md

This can evolve, but keep frontend/backend concerns separated.

---

## 27. Build Order

### Phase 1 — Foundation
- repository setup
- Next.js app
- NestJS app
- PostgreSQL
- Prisma
- authentication integration
- base UI system
- environment/config management

### Phase 2 — Commerce
- product catalogue
- product detail
- search/filter
- cart
- order model
- GoKwik checkout
- payment/webhook handling
- order tracking
- admin catalogue/order management

### Phase 3 — Klarone Select
- requirement intake
- product attributes
- recommendation scoring
- OpenAI integration
- recommendation UI
- recommendation analytics

### Phase 4 — Customer Relationship
- customer dashboard
- device records
- warranty information
- service requests

### Phase 5 — Repair/Upgrade Operations
- technician workflow
- repair workflow
- upgrade workflow
- status tracking
- notifications

### Phase 6 — Optimization
- recommendation quality improvement
- search optimization
- analytics
- service SLAs
- customer retention
- automation

---

## 28. V1 Non-Goals

Do not build initially:

- native iOS app,
- native Android app,
- microservices,
- custom payment gateway,
- custom checkout,
- highly advanced machine-learning recommendation model,
- nationwide technician network,
- complex subscription system,
- custom search infrastructure before needed,
- large multi-vendor marketplace.

---

## 29. Final Architecture Principle

Klarone should follow this rule:

> Build the parts that create Klarone's competitive advantage; buy/integrate the commodity infrastructure.

Build:
- recommendation logic,
- customer/device relationship,
- commerce business logic,
- service lifecycle,
- repair/upgrade workflows,
- Klarone user experience.

Integrate:
- authentication,
- checkout/payment infrastructure,
- storage,
- messaging,
- hosting,
- monitoring.

---

## 30. One-Sentence Engineering Summary

> **Klarone is a Next.js + NestJS modular-monolith commerce and service platform backed by PostgreSQL, using GoKwik for customer authentication and checkout, OpenAI for AI-assisted recommendation experiences, and a Klarone-owned customer/device/service domain model as the core system of record.**