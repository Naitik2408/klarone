# KLARONE — CUSTOMER USER FLOW V1

## 1. Purpose

This document defines the primary customer journey for Klarone's B2C website.

Starting point:

> Customer opens `klarone.in`

The flow should guide the customer toward one of four primary outcomes:

1. Find the right laptop.
2. Buy a laptop.
3. Get help with an existing laptop.
4. Get help after purchasing from Klarone.

Klarone should feel like a laptop ownership platform, not a generic laptop marketplace.

---

# 2. Core Customer Journey

The main journey is:

```text
klarone.in
    ↓
Homepage
    ↓
Choose what you need
    ├── Find my laptop
    │       ↓
    │   Klarone Select
    │       ↓
    │   Recommendation Results
    │       ↓
    │   Product Detail
    │       ↓
    │   Buy Now / Add to Cart
    │       ↓
    │   Cart
    │       ↓
    │   GoKwik Checkout
    │       ↓
    │   Order Confirmation
    │       ↓
    │   My Klarone
    │       ↓
    │   Device / Care / Support
    │
    ├── Browse laptops
    │       ↓
    │   Catalogue
    │       ↓
    │   Filters / Search
    │       ↓
    │   Product Detail
    │       ↓
    │   Cart / Buy Now
    │
    └── Need help
            ↓
        Support / Expert
            ↓
        Recommendation / Service Request
```

---

# 3. HEADER / GLOBAL NAVIGATION

The header should remain simple.

## Desktop

Left:

**Klarone logo**

Center/navigation:

- Laptops
- Klarone Select
- Services
- Support

Right:

- Search
- Account / My Klarone
- Cart

Primary visual CTA:

**Find My Laptop**

## Mobile

Top:

- Klarone logo
- Search
- Cart
- Menu

The mobile menu contains:

- Laptops
- Klarone Select
- Services
- Support
- My Klarone

---

# 4. HOMEPAGE

URL:

`klarone.in`

The homepage should answer three questions immediately:

1. What is Klarone?
2. Why should I trust it?
3. What should I do next?

---

## Section 1 — Hero

Headline concept:

> **Find the laptop that's right for you.**

Supporting message:

> Tell Klarone what you do, what you need, and your budget. We'll help you find the right laptop.

Primary CTA:

### `Get My Recommendation`

Secondary CTA:

### `Browse Laptops`

Small trust statement:

> Buy it. Set it up. Repair it. Upgrade it. We're here for the journey.

---

## Section 2 — How Klarone Works

Three/four simple cards:

### 1. Tell us what you need
Use Klarone Select.

### 2. Get the right recommendation
See a small shortlist with reasons.

### 3. Buy with confidence
Simple checkout.

### 4. Stay connected
Support, repair and upgrades after purchase.

CTA:

### `Find My Laptop`

---

## Section 3 — Popular Laptop Categories

Cards such as:

- Student
- Gaming
- Coding
- Business
- Creator
- Travel / Lightweight

Each card CTA:

### `Explore`

Clicking opens the catalogue filtered for that category.

---

## Section 4 — Klarone Select

A visual section dedicated to the AI recommendation system.

Headline:

> **Don't buy a laptop based on specifications alone.**

Supporting copy:

> Tell us how you work, study, create or play. Klarone recommends laptops based on what you actually need.

CTA:

### `Start Klarone Select`

---

## Section 5 — Why Klarone

Keep this focused on differentiation:

### Right laptop
Recommendations based on requirements.

### Local support
Kolkata-first support and service.

### Faster help
One place for support, repair and upgrades.

### Long-term relationship
Your laptop history stays with Klarone.

CTA:

### `How Klarone Works`

---

## Section 6 — Selected Products

Show a limited number of curated laptops.

Do not show hundreds of products on the homepage.

Each product card contains:

- image
- brand
- model
- key specs
- price
- short fit label
- availability

CTA:

### `View Laptop`

---

## Section 7 — Service Promise

Headline:

> **Buying the laptop is only the beginning.**

Show:

- Setup
- Support
- Repair
- Upgrade

CTA:

### `Get Support`

---

# 5. KLARONE SELECT FLOW

Primary URL:

`/select`

Entry points:

- Homepage
- Header
- Product pages
- Category pages
- Support
- Exit-intent / contextual CTA if later justified

Primary CTA:

### `Start Recommendation`

---

# 6. SELECT SCREEN 1 — INTRO

Title:

> **Let's find your laptop.**

Text:

> Answer a few simple questions. You don't need to understand laptop specifications.

CTA:

### `Start`

Secondary:

### `I'll Browse Myself`

---

# 7. SELECT SCREEN 2 — PRIMARY USE

Question:

> **What will you mainly use the laptop for?**

Options:

- College / Study
- Coding / Development
- Office / Business
- Gaming
- Photo / Video Editing
- Design / 3D
- Multiple things
- Other

Allow multiple selection where appropriate.

CTA:

### `Continue`

---

# 8. SELECT SCREEN 3 — BUDGET

Question:

> **What's your budget?**

Options:

- Under ₹40,000
- ₹40,000–₹60,000
- ₹60,000–₹80,000
- ₹80,000–₹1,00,000
- ₹1,00,000+
- Custom budget

CTA:

### `Continue`

The system should store both the user's selected range and normalized numeric values.

---

# 9. SELECT SCREEN 4 — PERFORMANCE PRIORITY

Question:

> **What matters most to you?**

Selectable priorities:

- Performance
- Battery life
- Lightweight
- Display
- Gaming
- Build quality
- Upgradeability
- Balanced overall experience

Allow ordering or ranking if useful.

CTA:

### `Continue`

---

# 10. SELECT SCREEN 5 — PORTABILITY

Question:

> **Will you carry the laptop often?**

Options:

- Mostly stays at home/office
- Sometimes
- I carry it every day

CTA:

### `Continue`

---

# 11. SELECT SCREEN 6 — LONG-TERM USE

Question:

> **How long do you want to keep the laptop?**

Options:

- 1–2 years
- 2–3 years
- 3–4 years
- 4+ years

This is important because upgradeability, warranty, thermals and build can influence the recommendation.

CTA:

### `Continue`

---

# 12. SELECT SCREEN 7 — OPTIONAL DETAILS

Optional questions:

- Preferred brand
- Minimum RAM
- Minimum storage
- Screen size
- Operating system
- Specific software
- Games
- Existing laptop
- Other requirements

Important:

Do not make the form feel like a technical questionnaire.

The AI can ask an additional question only when it materially improves the recommendation.

CTA:

### `See My Recommendations`

---

# 13. SELECT PROCESSING SCREEN

Show a brief progress state.

Example:

> Understanding your requirements...

Then:

> Comparing suitable laptops...

Then:

> Finding the best fit...

Do not claim that a slow model is "thinking deeply" if the system is actually executing normal retrieval/scoring.

---

# 14. RECOMMENDATION RESULTS

URL concept:

`/select/results/:sessionId`

Header:

> **Here are the laptops that fit you best.**

Show 3 primary recommendations.

## Recommendation 1

### Best Match

- Laptop image
- Name
- Price
- Key specifications
- Match score or fit indicator
- Why it fits
- Trade-offs

CTA:

### `View Laptop`

Secondary:

### `Compare`

---

## Recommendation 2

### Best Value

Same information.

---

## Recommendation 3

### Best Long-Term Choice

Same information.

---

## Important trust element

Show:

> **Why we recommended this**

Examples:

- Fits your ₹70,000 budget
- 16GB RAM matches your requirement
- Strong CPU for development
- Better upgradeability for 4+ years
- Lower weight than the alternatives

Also show:

> **What you give up**

Example:

> Slightly weaker GPU than the gaming-focused option.

This makes recommendations transparent.

---

## Recommendation actions

At bottom:

### `Buy This Laptop`

### `Compare These`

### `Talk to a Klarone Expert`

### `Change My Requirements`

---

# 15. PRODUCT DETAIL PAGE

URL:

`/laptops/:slug`

This page should work whether the customer came from:

- Klarone Select
- Google
- catalogue
- recommendation
- direct link

---

## Product Detail Layout

Top:

- Product image gallery
- Brand
- Product name
- Variant
- Price
- Availability

Primary CTA:

### `Buy Now`

Secondary:

### `Add to Cart`

Secondary support CTA:

### `Ask Klarone`

---

## Product Information

Show:

### Key specifications

- CPU
- GPU
- RAM
- Storage
- Display
- Weight
- Battery
- Warranty

### Why this laptop

Human-readable explanations.

### Best for

Examples:

- Coding
- Gaming
- Students
- Business

### Things to know

Trade-offs.

Example:

> Good performance, but heavier than typical ultrabooks.

---

## Recommendation connection

If the user arrived from Klarone Select:

Show:

> **Why Klarone recommended this for you**

Use the saved recommendation reasoning.

CTA:

### `Buy This Laptop`

---

# 16. CATALOGUE FLOW

URL:

`/laptops`

Customer sees:

### Search

Placeholder:

> Search laptops, brands, or use cases

### Filters

- Price
- Brand
- CPU
- GPU
- RAM
- Storage
- Screen size
- Weight
- Use case
- Availability

### Sort

- Recommended
- Price low to high
- Price high to low
- Newest
- Popular

Each product card:

- Image
- Brand/model
- Important specifications
- Price
- Fit tags
- Compare checkbox/button

CTA:

### `View Laptop`

Persistent CTA:

### `Need help choosing? Try Klarone Select`

---

# 17. PRODUCT COMPARISON

User selects two or more products.

Comparison page shows:

- Price
- CPU
- GPU
- RAM
- Storage
- Display
- Weight
- Battery
- Upgradeability
- Warranty

Highlight differences.

Do not simply say:

> Laptop A is better.

Instead:

> Better for gaming

or

> Better for portability

based on the user's priorities.

CTA:

### `Choose This Laptop`

---

# 18. ADD TO CART FLOW

Customer clicks:

### `Add to Cart`

A confirmation appears:

> **Added to your cart**

Actions:

### `Go to Cart`

### `Continue Shopping`

If the user selected a recommendation:

> You selected this laptop from Klarone Select.

Cart should show:

- Product
- Variant
- Quantity
- Price
- Warranty
- Applicable discount
- Delivery/service information where available

---

# 19. CART PAGE

URL:

`/cart`

Show:

- Products
- Quantity
- Price
- Discount
- Estimated shipping
- Total

Optional:

### `Have a coupon?`

Primary CTA:

### `Proceed to Checkout`

Secondary:

### `Continue Shopping`

If the product was recommended:

Show:

> **Selected through Klarone Select**

---

# 20. CHECKOUT FLOW

Klarone should hand off the transaction to GoKwik Checkout.

Flow:

```text
Cart
  ↓
Proceed to Checkout
  ↓
GoKwik Checkout
  ↓
Phone / OTP authentication
  ↓
Address
  ↓
Delivery
  ↓
Payment
  ↓
Order Confirmation
```

Klarone backend remains the order source of truth.

---

# 21. ORDER CONFIRMATION

URL concept:

`/order/:orderNumber`

Show:

> **Your Klarone order is confirmed.**

Display:

- Order number
- Product
- Price
- Payment status
- Delivery information
- Expected timeline
- Support contact

Primary CTA:

### `Track Order`

Secondary:

### `Go to My Klarone`

---

# 22. MY KLARONE

URL:

`/account`

This should become the customer's long-term home.

Dashboard sections:

### My Devices

See laptops owned.

### My Orders

See purchases.

### My Services

See repair/upgrade/support history.

### My Recommendations

See previous Klarone Select sessions.

### Support

Create or track support requests.

### Account

Profile and preferences.

---

# 23. MY DEVICE

When a purchased laptop is associated with the customer:

```text
My Klarone
    ↓
My Devices
    ↓
Select Laptop
```

Display:

- Laptop model
- Purchase date
- Warranty
- Configuration
- Order
- Service history
- Upgrade history

Main actions:

### `Get Support`

### `Repair My Laptop`

### `Upgrade My Laptop`

### `View Warranty`

---

# 24. SUPPORT FLOW

Customer clicks:

### `Get Support`

They see:

> **What do you need help with?**

Options:

- Laptop is slow
- Laptop not turning on
- Battery issue
- Screen/display issue
- Software problem
- Performance issue
- Upgrade
- Other

If the user has a registered device:

Ask:

> **Which laptop are you having trouble with?**

AI may help categorize the issue.

Then show:

### Remote Help

or

### Create Service Request

---

# 25. SERVICE REQUEST

Customer provides:

- Problem
- Device
- Location
- Preferred time
- Photos/video if useful

Then:

### `Submit Request`

Confirmation:

> **We've received your request.**

Show:

- Request ID
- Current status
- Expected next step
- Contact/support option

---

# 26. REPAIR FLOW

Customer:

```text
My Klarone
    ↓
My Devices
    ↓
Laptop
    ↓
Repair My Laptop
```

Flow:

```text
Issue
  ↓
Service Request
  ↓
Diagnosis
  ↓
Quotation
  ↓
Customer Approval
  ↓
Repair
  ↓
Quality Check
  ↓
Completed
```

The customer should receive status updates.

---

# 27. UPGRADE FLOW

Customer:

```text
My Device
    ↓
Upgrade My Laptop
```

Show suitable upgrades based on actual device compatibility.

Examples:

- RAM upgrade
- SSD upgrade
- Battery replacement

Important:

The system must use device/product specifications to determine compatibility.

Do not recommend an incompatible RAM/SSD merely because the customer requested an upgrade.

CTA:

### `Request Upgrade`

---

# 28. RETURN / CANCELLATION FLOW

From:

```text
My Klarone
    ↓
Orders
    ↓
Order
```

Actions depend on current order state:

### Cancel Order

only when policy/state permits.

### Return / Replacement

when policy/state permits.

### Contact Support

when automated handling is not possible.

The UI must never promise a refund before backend validation.

---

# 29. CUSTOMER AUTHENTICATION STATES

## Guest

Guest can:

- browse,
- search,
- use Klarone Select,
- view products,
- add to cart.

When account identity is required:

- GoKwik authentication is triggered.

## Logged-in customer

Can additionally:

- view orders,
- save recommendations,
- maintain profile,
- view devices,
- create service requests,
- manage support.

---

# 30. PRIMARY CTA STRATEGY

Every major page should have one obvious primary action.

Homepage:
> `Get My Recommendation`

Catalogue:
> `View Laptop`

Product:
> `Buy Now`

Klarone Select:
> `See My Recommendations`

Results:
> `Buy This Laptop`

Cart:
> `Proceed to Checkout`

Order:
> `Track Order`

My Device:
> `Get Support`

Service:
> `Submit Request`

Avoid placing 5–6 equal CTAs on every screen.

---

# 31. CUSTOMER JOURNEY — HAPPY PATH

The simplest customer path should be:

```text
Visit klarone.in
      ↓
"Get My Recommendation"
      ↓
Klarone Select
      ↓
Answer 5–7 simple questions
      ↓
3 recommendations
      ↓
Open recommended laptop
      ↓
"Why we recommended this"
      ↓
"Buy Now"
      ↓
Cart / GoKwik Checkout
      ↓
Authentication / address / payment
      ↓
Order Confirmed
      ↓
My Klarone
      ↓
My Device
      ↓
Support / Repair / Upgrade later
```

---

# 32. ALTERNATIVE CUSTOMER PATH — KNOWS WHAT THEY WANT

Some customers do not need AI.

```text
Visit klarone.in
      ↓
"Browse Laptops"
      ↓
Catalogue
      ↓
Search / Filter
      ↓
Product
      ↓
Add to Cart
      ↓
Checkout
```

Klarone Select should be encouraged, but never forced.

---

# 33. ALTERNATIVE CUSTOMER PATH — NEEDS HELP

```text
Visit klarone.in
      ↓
"Need Help?"
      ↓
Choose problem
      ↓
Klarone support
      ↓
Recommendation OR Service Request
```

This path is particularly important for future Klarone Care.

---

# 34. FUTURE CUSTOMER JOURNEY

After Klarone has service operations:

```text
Klarone Select
      ↓
Buy
      ↓
Setup
      ↓
My Klarone
      ↓
My Device
      ↓
Care
 ┌────┼───────┐
 ↓    ↓       ↓
Repair Upgrade Support
  \     |      /
   \    |     /
    Device History
         ↓
    Klarone Replace
         ↓
    Klarone Select
         ↓
       Buy Again
```

This is the long-term Klarone ecosystem.

---

# 35. DESIGN PRINCIPLE

The website should never make the customer think:

> "Where do I click?"

Every page should answer:

> "What is the next useful action for me?"

The primary customer experience is:

**Understand → Decide → Buy → Own → Get Help → Continue**

Klarone should reduce anxiety at every step.

---

# 36. V1 SCREEN LIST

The initial frontend implementation should include:

1. Home
2. Laptop Catalogue
3. Product Detail
4. Product Comparison
5. Klarone Select Intro
6. Klarone Select Questions
7. Recommendation Processing
8. Recommendation Results
9. Cart
10. GoKwik Checkout Integration
11. Order Confirmation
12. My Klarone Dashboard
13. My Orders
14. Order Detail
15. My Devices
16. Device Detail
17. Support
18. Service Request
19. Login/Auth states
20. Basic Account Settings

Do not build the full Repair/Upgrade/Technician experience until the core commerce and customer flows are validated.

---

# 37. ONE-LINE USER FLOW

The simplest way to remember the entire Klarone customer experience is:

> **Discover → Understand → Select → Buy → Own → Support → Repair/Upgrade → Replace → Buy Again**

That is the core user experience Klarone is designed around.