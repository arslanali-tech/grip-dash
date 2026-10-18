
# GRIP — Real Estate Operations & Intelligence Platform

**GRIP** is an all-in-one, multi-tenant real estate CRM and operations management platform designed for estate agencies, property businesses, branch managers, negotiators, prospectors, and business owners.

The platform centralizes property management, lead generation, business analytics, team collaboration, compliance, document management, and AI-powered business intelligence.

GRIP also includes **Genius AI**, an intelligent business assistant that helps users understand their business performance, forecast future revenue, simulate different business scenarios, identify risks, and receive actionable recommendations.

---

## 1. Overview

GRIP is designed to simplify and automate the daily operations of estate agencies through a centralized, role-based dashboard.

### Core Capabilities

- Property pipeline and movement management
- Lead generation and prospecting
- Branch and staff performance monitoring
- Business analytics and financial reporting
- Revenue and profit forecasting
- AI-powered business assistant
- Business performance simulation
- Compliance and health & safety management
- Document and file management
- Internal team communication
- Task and diary management
- B2B referral management
- Owner-level multi-client oversight
- DocuSign agreement automation
- Role-based access control
- Multi-tenant data isolation

---

## 2. Technology Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| React 18 | User interface |
| TypeScript | Type-safe development |
| Vite | Development and build tooling |
| Tailwind CSS | Styling |
| Radix UI | Accessible UI components |
| Zustand | State management |
| Recharts | Data visualization |
| html2canvas | Dashboard capture |
| jsPDF | PDF generation |
| XLSX | Spreadsheet processing |
| Tesseract | OCR processing |

### Backend

| Technology | Purpose |
|------------|---------|
| Supabase | Backend platform |
| PostgreSQL | Relational database |
| Supabase Auth | Authentication |
| Supabase Storage | File storage |
| Supabase Realtime | Live communication |
| Supabase Edge Functions | Server-side operations |
| Row Level Security | Data isolation |
| OpenAI API | AI intelligence |
| DocuSign API | Agreement automation |

---

## 3. System Architecture

GRIP uses a React frontend connected to Supabase services.

```text
                     GRIP PLATFORM
                           |
                  React + TypeScript
                           |
                       Vite App
                           |
                  Zustand State
                           |
                    Supabase SDK
                           |
        +------------------+------------------+
        |                  |                  |
   Authentication      PostgreSQL          Storage
        |                  |                  |
   Role Management     Business Data       Documents
        |                  |                  |
        +------------------+------------------+
                           |
                   Supabase Realtime
                           |
                    Edge Functions
                           |
                +----------+----------+
                |                     |
             Genius AI             DocuSign
                |                     |
             OpenAI API          Agreements
                |
         Business Intelligence
                |
      Forecasting & Recommendations
```

### Main Application Files

| File | Responsibility |
|------|----------------|
| `App.tsx` | Application entry and dashboard routing |
| `supabaseClient.ts` | Supabase client configuration |
| `authStore.ts` | Authentication and user sessions |
| `dashboardStore.ts` | Dashboard state management |
| `dashboardApi.ts` | Business data operations |
| `ownerApi.ts` | Owner and referral operations |
| `hubDocumentsApi.ts` | Document management |

---

## 4. Authentication and Authorization

GRIP uses Supabase Authentication.

### Supported Authentication Methods

- Email and password
- OTP and magic link
- Password reset
- Session management

### Role-Based Access Control

The platform provides different dashboards and permissions depending on the user's role.

Supported roles include:

1. GRIP Owner
2. Client / Agency User
3. Branch Manager
4. Negotiator
5. Prospector

Access is controlled through:

- User roles
- Agency ID
- Client ID
- Branch permissions
- Enabled modules
- Impersonation context
- Database Row Level Security

This ensures users can only access data and features authorized for their role.

---

## 5. Dashboard Modules

### 5.1 Owner Dashboard

**File:** `OwnerDashboard.tsx`

The Owner Dashboard provides centralized oversight across multiple clients and businesses.

Features:

- Client management
- Create orders
- Owner prospects
- Business analytics
- Billing management
- Password vault
- Client updates
- Compliance tasks
- Staff dashboard access
- Client impersonation
- Cross-client performance monitoring

### 5.2 Client / Agency Dashboard

**Files:** `TopBar.tsx`, `DashboardContent.tsx`

The main operational dashboard provides access to:

- Movements
- Diary
- Prospecting
- Business Analytics
- Business Manager
- Referrals
- The Hub
- Team Chat
- Genius AI

### 5.3 Branch Manager Dashboard

**File:** `BranchManagerDashboard.tsx`

Features:

- Branch analytics
- Branch performance
- Staff management
- Prospecting
- Diary and tasks
- Referrals
- Team communication

### 5.4 Negotiator Dashboard

**File:** `NegotiatorDashboard.tsx`

Features:

- Personal analytics
- Property movements
- Referrals
- Diary
- Document Hub
- Team Chat
- Housekeeping

### 5.5 Prospector Dashboard

**File:** `ProspectorDashboard.tsx`

Features:

- Prospecting management
- Prospecting analytics
- Lead status tracking
- Housekeeping
- Team communication

---

## 6. Property Movement Management

**File:** `MovementsView.tsx`

The Movements module manages the lifecycle of properties from initial valuation to final transaction.

### Supported Property Stages

- Valuation
- On Books
- Offer
- Sale
- Exchanged
- Completed
- Let
- Withdrawn

Additional B2B statuses support legal, AML, and mortgage referrals.

### Features

- Property listing management
- Movement history
- Property status tracking
- List and map views
- Branch and status filters
- Date-based searching
- Property notes
- Offer tracking
- Valuation diary creation
- Spreadsheet and CSV imports
- Movement analytics

The system preserves historical movement records when property statuses change.

### Example Property Lifecycle

```text
Prospect
   |
   v
Valuation
   |
   v
On Books
   |
   v
Offer
   |
   v
Sale Agreed
   |
   v
Exchanged
   |
   v
Completed
```

---

## 7. Prospecting and Lead Management

**File:** `ProspectingView.tsx`

The Prospecting module helps agencies discover, track, and convert potential customers.

### Prospect Stages

- Canvassed
- Not Available
- Opportunities
- Potential Seller
- Sold OA
- Valuation

### Features

- Add and edit prospects
- Prospect status history
- Notes and activity tracking
- Photo attachments
- Branch-based filtering
- Date filtering
- Map visualization
- Mobile-friendly workflows
- Convert prospects into valuations
- Automatic diary event creation

### Lead Conversion Workflow

```text
Lead Generation
      |
      v
Prospect Created
      |
      v
Prospect Follow-Up
      |
      v
Opportunity Identified
      |
      v
Valuation Booked
      |
      v
Property Movement Created
      |
      v
Sales Pipeline
```

---

## 8. Business Analytics and Reporting

**Files:**

- `OverviewView.tsx`
- `BusinessAnalyticsView.tsx`

GRIP provides business intelligence using operational and financial data.

### Analytics Features

- Total property movements
- Active listings
- Branch performance
- Staff performance
- Sales performance
- Lettings performance
- Average commission
- Revenue trends
- Cost analysis
- Profit and loss
- Conversion rates
- Forecasting
- PDF report exports

### Performance Metrics

Examples include:

- Valuations booked
- Valuations carried out
- Valuation-to-instruction conversion
- Offers generated
- Sales agreed
- Completed transactions
- Revenue generated
- Staff productivity
- Branch profitability

Analytics are calculated from available business records rather than relying exclusively on static dashboard data.

---

## 9. Genius AI — Intelligent Business Assistant

**Files:**

- `GeniusView.tsx`
- `supabase/functions/genius-ai/index.ts`

Genius AI is the intelligent decision-support component of GRIP.

It combines AI-powered business assistance, forecasting, analytics, and performance simulation.

Unlike a traditional chatbot, Genius AI is designed to help users understand business performance and make data-driven decisions.

### 9.1 AI Business Assistant

Users can ask questions about their business in natural language.

Example questions:

- How is my business performing this month?
- Why has our revenue decreased?
- Which branch is performing best?
- Which staff members need improvement?
- What should we focus on next week?
- How can we improve our conversion rate?
- What are the biggest risks to our revenue targets?
- How much revenue might we generate next month?

The assistant processes structured business context and generates relevant answers, insights, and suggested actions.

### 9.2 Revenue Forecasting

Genius AI supports forecasting based on available business metrics and simulation inputs.

Forecasting capabilities include:

- Future revenue estimates
- Expected profit projections
- Sales pipeline forecasting
- Business growth scenarios
- Target achievement estimates
- Trend analysis

Forecasts are estimates, not guaranteed financial outcomes.

### 9.3 What-If Scenario Simulator

Users can explore hypothetical business changes.

Example scenarios:

**Scenario A: Increase valuations**

What happens if monthly valuations increase by 20%?

**Scenario B: Improve conversion**

What happens if the valuation-to-instruction conversion rate improves from 25% to 35%?

**Scenario C: Increase staff productivity**

How might revenue change if negotiator productivity increases?

**Scenario D: Reduce operating costs**

How would profitability change if expenses decrease by 10%?

The simulator helps users compare possible outcomes and understand the potential impact of business decisions.

### 9.4 AI Performance Advisor

Genius AI can provide recommendations based on business performance.

Examples:

- Identify underperforming branches
- Highlight conversion bottlenecks
- Suggest operational improvements
- Identify revenue opportunities
- Recommend focus areas
- Surface performance risks
- Suggest follow-up actions

### 9.5 AI Insights and KPIs

The AI dashboard includes:

- Live insights
- Weekly performance snapshots
- Business KPIs
- Staff KPIs
- Revenue targets
- Trend analysis
- Performance summaries
- Action recommendations

### 9.6 AI Response Structure

The Genius AI Edge Function sends structured requests to OpenAI and returns information such as:

```json
{
  "headline": "Business Performance Overview",
  "answer": "Revenue is projected to improve based on current pipeline activity.",
  "insights": [
    "Valuation activity has increased.",
    "Conversion performance is improving."
  ],
  "actions": [
    "Follow up with pending valuations.",
    "Review branch-level conversion rates."
  ],
  "followUpPrompts": [
    "Show next month's forecast.",
    "Which branch needs attention?"
  ]
}
```

This JSON illustrates the response structure. Actual responses depend on the data and implementation.

The Edge Function may also return slider patches for simulation adjustments.

### 9.7 AI Processing Architecture

```text
                 GRIP USER
                     |
                     v
              Genius AI UI
                     |
                     v
            Business Question
                     |
                     v
             Business Context
                     |
                     v
        Supabase Edge Function
                     |
                     v
                 OpenAI API
                     |
                     v
             AI Interpretation
                     |
          +----------+----------+
          |          |          |
       Insights   Forecasts   Actions
          |          |          |
          +----------+----------+
                     |
                     v
              Genius Dashboard
```

### 9.8 Benefits of Genius AI

- Faster business analysis
- Better visibility into performance
- Early identification of risks
- Improved decision-making
- Revenue planning assistance
- Operational recommendations
- Scenario-based forecasting
- Natural-language access to business insights

---

## 10. Business Manager

**File:** `BusinessManagerView.tsx`

The Business Manager module centralizes administration and operational management.

### Features

- Business management
- Profit and loss
- Company structure
- Branch management
- Staff management
- B2B referrals
- Health and safety
- Housekeeping
- Role configuration
- Module configuration

Business sections can be dynamically enabled or disabled through database configuration.

---

## 11. The Hub — Documents and Knowledge Management

**Files:**

- `TasksView.tsx`
- `hubDocumentsApi.ts`

The Hub is an internal workspace for documents, tasks, and compliance information.

### Features

- Dynamic tabs
- Folder management
- Document uploads
- Document searching
- Compliance tracking
- Compliance calendar
- Password management
- Storage-backed file management

The Hub uses Supabase Storage for file handling.

---

## 12. Team Chat

**File:** `TeamChatView.tsx`

GRIP includes an internal communication system powered by Supabase Realtime.

### Features

- Team channels
- Direct messaging
- Real-time updates
- Unread message counts
- Message reactions
- Edit and delete messages
- File attachments
- Image previews
- Message history
- Locally stored read markers

The chat module allows staff members to communicate without leaving the platform.

---

## 13. B2B Referrals

**Files:**

- `ReferralPropertyView.tsx`
- `ownerApi.ts`

The referral system supports collaboration with external service providers.

### Supported Referral Types

- Legal
- AML
- Mortgage
- Property referrals

### Features

- B2B company management
- Referral tracking
- Property referrals
- Referral revenue tracking
- Referral performance reporting

Referral data can contribute to business analytics and financial reporting.

---

## 14. Settings and Integrations

**Files:**

- `SettingsView.tsx`
- `DataUploadView.tsx`
- `APIConnectionsView.tsx`

### Features

- Movement data imports
- Lead generation data imports
- API connection configuration
- General settings
- User management interface

**Development note:** Some integration and user-management interfaces currently contain mock or placeholder functionality. They should be connected to production services before being considered fully operational.

---

## 15. DocuSign Integration

GRIP integrates with DocuSign to automate agreement and order sending.

### Supabase Edge Functions

```text
supabase/functions/
├── docusign-send-envelope/
│   └── index.ts
├── docusign-list-templates/
│   └── index.ts
└── docusign-template-roles/
    └── index.ts
```

### Capabilities

- Retrieve agreement templates
- Retrieve template roles
- Send envelopes
- Automate agreement workflows

### Frontend Configuration

Add the template ID to `.env.local`:

```env
VITE_DOCUSIGN_TEMPLATE_ID=your_template_id
```

### Backend Configuration

Configure the following Supabase Edge Function secret:

```env
DOCUSIGN_DEFAULT_TEMPLATE_ID=your_template_id
```

This provides a fallback template when no template ID is supplied by the frontend.

Existing DocuSign authentication credentials must also be configured securely.

Never expose private DocuSign credentials in frontend environment variables.

---

## 16. Database Architecture

GRIP uses PostgreSQL through Supabase.

### Major Database Tables

**Agency and Client Management**

- agencies
- clients
- client_branches
- client_staff
- client_staff_roles
- franchise_groups

**Property Management**

- movements
- movement_status_history
- movement_offers
- prospects
- property_referrals

**Collaboration**

- team_channels
- team_messages
- team_direct_messages
- reactions
- in_app_notifications

**Documents and Compliance**

- hub_tabs
- hub_folders
- hub_documents
- health_safety_items

**Business and Financial Data**

- b2b_companies
- b2b_referrals
- reports
- pnl_statements
- user_notes

The database also includes diary tasks and events.

### Schema Files

Main schema:

```text
supabase_schema_week2.sql
```

Additional migrations:

```text
supabase/migrations/
```

### Data Security

The database uses Row Level Security policies to enforce access restrictions.

Data access depends on:

- User identity
- Agency membership
- Client membership
- Branch permissions
- User role
- Authorized access scope

Frontend permission checks complement database security but do not replace Row Level Security.

---

## 17. Getting Started

### Prerequisites

Before running GRIP, install:

- Node.js
- npm
- Git

You will also need access to a configured Supabase project.

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd <repository-directory>
```

Replace the placeholders with the actual repository URL and folder name.

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

Create a `.env.local` file in the project root.

Example:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

VITE_DOCUSIGN_TEMPLATE_ID=your_template_id
```

The Supabase public/anonymous key is intended for client-side use, provided appropriate RLS policies are enabled.

Do not place service-role keys or private API credentials in the frontend.

### Step 4: Start the Development Server

```bash
npm run dev
```

Open:

http://localhost:5173/

### Step 5: Build for Production

```bash
npm run build
```

The production build is generated in:

```text
dist/
```

### Step 6: Preview the Production Build

If the preview script is configured:

```bash
npm run preview
```

---

## 18. Supabase Configuration

GRIP requires Supabase services for its backend.

### Required Services

- Authentication
- PostgreSQL Database
- Storage
- Realtime
- Edge Functions
- Row Level Security

### Database Setup

Apply the appropriate database schema and migrations to the target Supabase project.

Ensure migrations are executed in the correct order.

### Edge Functions

Relevant functions include:

```text
supabase/functions/
├── genius-ai/
├── docusign-send-envelope/
├── docusign-list-templates/
└── docusign-template-roles/
```

Deploy the functions required by your environment.

Example:

```bash
supabase functions deploy genius-ai
```

### AI Configuration

Configure the OpenAI API key as a server-side Supabase secret.

```bash
supabase secrets set OPENAI_API_KEY=your_api_key
```

Ensure the Edge Function uses the corresponding secret name.

Do not expose the OpenAI API key in React frontend code.

---

## 19. State Management

GRIP uses Zustand for application state.

### Main Stores

**Authentication Store**

```text
authStore.ts
```

Responsibilities:

- Login
- Logout
- Authentication state
- User sessions
- Password recovery

**Dashboard Store**

```text
dashboardStore.ts
```

Responsibilities:

- Dashboard data
- Property movements
- Business metrics
- Shared operational state

The application separates interface state from Supabase data operations.

---

## 20. Multi-Tenant Architecture

GRIP supports multiple agencies, clients, and branches.

### Example Structure

```text
GRIP PLATFORM
      |
      v
GRIP OWNER
      |
      +---------------------+
      |                     |
   Agency A              Agency B
      |                     |
   Client A1             Client B1
      |
      +---------------------+
      |                     |
   Branch 1              Branch 2
      |                     |
   Manager               Manager
      |                     |
   Negotiators           Prospectors
```

Each user's access depends on their assigned permissions.

The platform also supports franchise-level access and authorized owner impersonation.

---

## 21. Security

GRIP implements multiple layers of security.

### Security Features

- Supabase Authentication
- Row Level Security
- Role-based authorization
- Client data isolation
- Branch-scoped access
- Module-level permissions
- Server-side Edge Functions
- Secure API credential handling
- Authorized impersonation workflows

### Recommended Production Practices

- Enforce RLS on tenant-specific tables
- Validate permissions in backend operations
- Store API secrets server-side
- Review impersonation access
- Protect sensitive documents
- Audit database policies
- Keep dependencies updated
- Monitor application errors

---

## 22. Current Development Status

GRIP includes both mature functionality and areas still undergoing development.

### More Developed Modules

- Authentication and role routing
- Property movements
- Prospect conversion
- Business analytics
- Team Chat
- Document Hub architecture
- Multi-tenant access controls
- Owner and franchise scoping

### Areas Requiring Further Development or Verification

- Some settings workflows
- Some user management features
- Certain API integrations
- Placeholder or coming-soon screens
- Production integration testing
- Documentation updates

Functionality should be validated against the deployed environment before production release.

---

## 23. Future Improvements

Potential future enhancements include:

- Expanded Genius AI capabilities
- More advanced forecasting models
- Automated business reporting
- Additional third-party integrations
- Enhanced staff performance analysis
- Mobile experience improvements
- Automated operational alerts
- Expanded business intelligence dashboards
- Additional compliance automation
- Improved integration management

These are potential enhancements, not claims of existing functionality.

---

## 24. Business Benefits

GRIP is designed to help estate agencies:

- Centralize business operations
- Improve lead conversion
- Track property transactions
- Monitor staff productivity
- Analyze branch performance
- Improve financial visibility
- Reduce manual administrative work
- Manage documents and compliance
- Improve internal communication
- Make more informed business decisions

With Genius AI, businesses can also explore future performance scenarios and receive AI-generated recommendations based on available operational data.

---

## 25. Project Summary

GRIP is a comprehensive real estate operations and intelligence platform built using React, TypeScript, Supabase, and OpenAI.

It combines CRM, property pipeline management, prospecting, business analytics, financial reporting, team collaboration, document management, and role-based administration in one centralized application.

Its **Genius AI** module extends the platform beyond traditional CRM functionality by offering:

- Conversational business assistance
- Revenue and profit forecasting
- Business performance simulation
- KPI analysis
- Trend identification
- Actionable recommendations

**GRIP — Manage Operations. Understand Performance. Plan Ahead.**
