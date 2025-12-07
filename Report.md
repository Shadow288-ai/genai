# Tenant Assisant

## Design

The platform serves landlords and tenants with separate, role-specific interfaces.

**Core Features:**
- **Landlord Portal:** Dashboard, Inbox, Maintenance tracking, Calendar management, Properties overview
- **Tenant Portal:** Home, Messages, Profile, Visits scheduling
- **AI Integration:** Reply suggestions, conversation summaries, issue triage, calendar event suggestions

**Visual Design:**

- Three-pane layout (sidebar, content, modals)
- Severity: Red (Critical), Orange (High), Yellow (Medium), Blue (Low)
- Events: Blue (Stays), Orange (Maintenance), Purple (AI)
- Status badges and indicators for quick scanning

**Technology Stack:**
- Frontend: React 18 + TypeScript
- State: React Hooks
- Routing: React Router
- API: RESTful backend integration

## Approach

Each page manages its own state and fetches data. React Hooks handle state, and the API service talks to the backend.

**Data Flow:**
- User actions update state
- useEffect loads data from API
- Components re-render on state change
- Loading and empty states inform users

**Components:**
- Page containers manage logic
- Shared components are reused
- API service abstracts backend calls
- TypeScript ensures type safety

**State Management:**
- useState for UI state
- useEffect for data fetching
- useMemo for performance

## Evaluation

**Strengths:**
- Separate interfaces for landlords and tenants
- AI features reduce manual work
- Handles multiple properties with filtering
- Type safety
- Responsive design
- Familiar layout patterns

**Limitations:**
- No tests
- Limited error handling
- Missing accessibility features

## Usage of AI
We mostly used AI to generate parts of the React TypeScript frontend code, including dashboards, inboxes, maintenance incident tracking, calendars, profiles, and visits scheduling. We used it to elaborate backend integration through the API service, which handles endpoints for conversations, incidents, calendar events, etc.