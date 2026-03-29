## App Name
UnifyU

## Description
This app allows international students to share their experience. It also has an LLM that uses the blog posts and external blogs(e.g. reddit, quora) to get information and answer student's questions. For example a student in Iran might nbot be familiar with what the SAT is. People who came to the US from Iran as students may write blog posts and others will read it. Alternatively, the incoming student could ask the built-in AI to explain what the SAT is and it would gather the information from similar blog posts and suggest people from the app to DM

## Tech Stack
React native for the frontend
Python for backend
PostgreSQL for database
Docker/Docker.yaml for containerization

## Sections
The two primary sections of the app are the AI called "UnifyAI" and Blogs, you can look at the "blogs_feed_vibrant.html" and "uniai_chat_vibrant.html" as reference at the very bottom.

UnifyAI will pull data from internal blog posts and external blog posts on reddit and quora

People must create an account. People can post blogs either anonymously or with their profile shown but on our server we always know who posted what.

## Pages
Blogs Page(Each blog must have a three dot for seeing the post ID)
UnifyAi Page
Settings page
Signup/login page
Admin panel(Admin can delete a post by ID and delete user by username)
Funding OS / Financial Workspace Page ✅ ADDED 2026-03-28

## Database Architecture
These schemas and tables are subject to change if it doesn't fit the rest of the workflow. Make sure to let the user know of any changes, and update this file if you make any.

Table Name: Students
Rows:
ID(primary key)
Name(real name)
userName(unique, not null)
pfp(text, path to the pfp file)
isShowName(boolean, show real name or not, off by default)
Password(hashed password)
isAdmin(boolean)
timezone(string, IANA timezone, default "UTC") -- ADDED: for timestamp localization

Table Name: Posts
Rows:
ID(primary key)
author(foreign key to students id)
path(path to the .md file of the post)
parent(int, foreign key to ID of the same table)
likes(int)
isAnonymous(boolean)

Table Name: PostLikes -- ADDED: to track per-user likes and avoid duplicates
Rows:
ID(primary key)
post_id(foreign key to posts id)
student_id(foreign key to students id)
created_at

//Comment: The structure of Posts is recursive, if a post does not have a parent, it is a blog post, if it doees, it is a comment. This allows for multi-thread comments

## Financials
The AI will be able to have an option for financials, where it cna be turned on an off.
The AI will now be able to use PlayWright CLI to look at College Scholarships and grants. Then, it creates and interactive page for the user where they can click on it. it will pull schoalrship and grant information and job fairs from the college websites. IT also has a built in currency converter.

## Keep in mind that the app must## App Name
UnifyU

## Description
This app allows international students to share their experience. It also has an LLM that uses the blog posts and external blogs(e.g. reddit, quora) to get information and answer student's questions. For example a student in Iran might nbot be familiar with what the SAT is. People who came to the US from Iran as students may write blog posts and others will read it. Alternatively, the incoming student could ask the built-in AI to explain what the SAT is and it would gather the information from similar blog posts and suggest people from the app to DM

## Tech Stack
React native for the frontend (Expo SDK ~51, React Navigation v6)
Python for backend (FastAPI + SQLAlchemy + Alembic)
PostgreSQL for database
Docker/docker-compose.yml for containerization

## Project Structure
```
UnifyU/
├── docker-compose.yml         # Orchestrates db, backend, frontend
├── .env.example               # Environment variable template
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py            # FastAPI app, CORS, static files
│       ├── config.py          # Pydantic settings
│       ├── database.py        # SQLAlchemy engine + session
│       ├── models.py          # ORM models: Student, Post, PostLike
│       ├── schemas.py         # Pydantic request/response models
│       ├── security.py        # JWT auth, password hashing
│       └── routers/
│           ├── auth.py        # /auth/* register, login, me
│           ├── posts.py       # /posts/* CRUD, likes, comments
│           ├── ai.py          # /ai/chat  UnifyAI endpoint
│           └── admin.py       # /admin/* stats, delete, promote
├── backend/posts_content/     # Markdown files for blog post content
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── App.tsx                # Root: fonts, AuthProvider, Navigator
    └── src/
        ├── api/client.ts      # Axios instance + all API calls
        ├── context/AuthContext.tsx
        ├── navigation/AppNavigator.tsx
        ├── theme/colors.ts    # Design tokens from HTML references
        ├── utils/time.ts      # Timezone-aware timestamp formatting
        ├── screens/
        │   ├── AuthScreen.tsx           # Login + Signup tabs (optional LinkedIn/email)
        │   ├── BlogsScreen.tsx          # Feed + create post modal
        │   ├── PostDetailScreen.tsx     # Post + 2-level threaded comments + reply UI
        │   ├── UniAIScreen.tsx          # Chat interface + clickable user/post suggestions
        │   ├── SettingsScreen.tsx       # Profile visibility, social contacts, notifications
        │   ├── AdminScreen.tsx          # Stats, delete post/user, promote
        │   ├── CanvasWorkspaceScreen.tsx # Infinite canvas + zoom +/- buttons
        │   └── UserProfileScreen.tsx   # Public user profile (Phase 4)
        └── components/
            └── PostCard.tsx   # Card with three-dot menu (shows post ID)
```

## Sections
The two primary sections of the app are the AI called "UnifyAI" and Blogs, you can look at the "blogs_feed_vibrant.html" and "uniai_chat_vibrant.html" as reference at the very bottom.

UnifyAI will pull data from internal blog posts and external blog posts on reddit and quora (via Reddit's public JSON API).

People must create an account. People can post blogs either anonymously or with their profile shown but on our server we always know who posted what.

## Pages
Blogs Page(Each blog must have a three dot for seeing the post ID) ✅
UnifyAi Page ✅
Settings page ✅ (designed via Stitch MCP)
Signup/login page ✅ (designed via Stitch MCP)
Admin panel(Admin can delete a post by ID and delete user by username) ✅ (designed via Stitch MCP)
Post Detail Page ✅ (threaded comments, timezone timestamps)
User Profile Page ✅ (public profile, designed via Stitch MCP — Phase 4)

## Database Architecture
These schemas and tables are subject to change if it doesn't fit the rest of the workflow. Make sure to let the user know of any changes, and update this file if you make any.

Table Name: Students
Rows:
ID(primary key)
Name(real name)
userName(unique, not null)
pfp(text, path to the pfp file)
isShowName(boolean, show real name on profile page, off by default) -- Phase 4: repurposed from "show on posts" to "show on public profile"
Password(hashed password)
isAdmin(boolean)
timezone(string, IANA timezone, default "UTC") -- ADDED
linkedin(string, nullable) -- ADDED Phase 4: optional, visible on public profile
email(string, nullable) -- ADDED Phase 4: optional, visible on public profile
push_token(string, nullable) -- ADDED Phase 4: Expo push token for notifications

Table Name: Posts
Rows:
ID(primary key)
author(foreign key to students id)
path(path to the .md file of the post)
parent(int, foreign key to ID of the same table)
likes(int)
isAnonymous(boolean)

Table Name: PostLikes -- ADDED (tracks per-user likes)
Rows:
ID(primary key)
post_id(foreign key to posts id)
student_id(foreign key to students id)
created_at

//Comment: The structure of Posts is recursive. If a post has no parent, it is a blog post. If it has a parent that is also a blog post, it is a top-level comment. If it has a parent that is a comment, it is a reply. The app supports 2-level threading: blog post → comment → reply.

// Phase 4: DB migration required (run via docker exec):
// ALTER TABLE students ADD COLUMN IF NOT EXISTS linkedin VARCHAR;
// ALTER TABLE students ADD COLUMN IF NOT EXISTS email VARCHAR;
// ALTER TABLE students ADD COLUMN IF NOT EXISTS push_token VARCHAR;

## Phase 4 Features (Implemented 2026-03-28)

### Canvas Layout Fix
AI-placed nodes are arranged in a 3-column grid (280px col spacing, 210px row spacing) instead of a single horizontal row. Applied to both `addNodesFromAI` and `applyAIOps` in `CanvasContext.tsx`.

### Canvas Zoom Controls
Added `+` / `−` zoom buttons in the canvas header alongside the existing reset button. Works on both native (pinch) and web (button). `zoomIn` multiplies scale by 1.4 (max 3.5×), `zoomOut` divides by 1.4 (min 0.25×).

### Comments Threading Fix + 2-Level Replies
- Fixed display bug: single-line comments (no `\n`) now correctly show content (not empty)
- Comments no longer show real name — only username or "Anonymous"
- `GET /posts/{id}` returns 2-level threaded comments: each level-1 comment has a `replies` array
- PostDetailScreen: tap "Reply" on any comment → shows "Replying to @username" badge and posts as child of that comment

### Push Notifications
- Default: OFF in Settings
- When toggled ON (native only): requests Expo permission, saves push token to backend via `PUT /auth/me`
- When toggled OFF: clears push token
- Backend sends Expo push notification on new like or comment (notify post author)
- Web: shows informational alert (push not supported on web)
- **Requires**: `npx expo install expo-notifications` (must be run manually)

### Post Anonymity — Removed Global Toggle
- Removed "Show my name on posts" from Settings (was global and redundant)
- Posts ONLY show username (never real name), regardless of `isShowName`
- `isShowName` now only controls visibility on the public profile page

### AI Blog Post Suggestions
- AI response includes `suggested_posts: [{post_id, title, author}]` for up to 3 related posts
- Shown as clickable chips below AI message: tap navigates to PostDetail screen
- Cross-tab navigation: UniAI → Blogs → PostDetail

### AI Suggested Users → Profile Navigation
- User chips in AI response are now tappable `TouchableOpacity` elements
- Tap navigates to `UserProfileScreen` showing that user's public profile

### Social Media Fields in Signup + Settings
- Signup: optional LinkedIn URL and email fields (marked "visible to others on your profile")
- Settings: "Profile Visibility" section with `isShowName` toggle + "Social contacts" modal for editing LinkedIn/email

### UserProfileScreen (New)
- File: `frontend/src/screens/UserProfileScreen.tsx` (designed via Stitch MCP)
- Shows: initials avatar, @username, real name (if `isShowName=true`), LinkedIn link, email
- Back button navigates to previous screen
- Accessible from any tab via root stack navigator
- Public endpoint: `GET /auth/users/{username}` → `PublicProfileOut`

## Financials — Funding OS (Implemented 2026-03-28)
The Funding OS is a dedicated tab (bottom nav: "Funding" / cash icon) with 7 tools:

1. **Currency Converter** — Real-time rates via open.er-api.com (free, no key required)
2. **Funding Gap Calculator** — Computes COA minus all aid sources; Claude generates action plan
3. **Scholarship Finder** — Claude-powered search filtered by country, field, degree level
4. **Scam Shield** — Trust score 1–10 + red flags via Claude for any scholarship offer
5. **Appeal Copilot** — Generates professional aid appeal letter + document checklist
6. **Emergency Aid Router** — Routes students facing hardship to campus/community resources
7. **Proof of Funds Planner** — F-1/J-1 visa financial evidence planning with document checklist

Backend routes: `POST /financials/*` — all require authentication.
Frontend: `FinancialWorkspaceScreen.tsx` — modal-based tool cards.
UniAI financials toggle also shows a "Funding OS" shortcut button in the header.

## Keep in mind that the app must adjust the timestamps of everything based on the user's timezone adjust the timestamps of everything based on the user's timezone

## Use docker containers and docker.yaml to containerize this app

# For any design, look at the "uniai_chat_vibrant.html" and "blogs_feed_vibrant" and follow the design principles of those strictly. If you need to design additional pages. Do it through Stitch MCP.

<role>
You are the lead systems designer and frontend architect for our education-finance app.
Your task is to create the full workspace schema specification for the app’s infinite visual workspace.
This workspace is the visual thinking surface for the app’s finance agent: graphs, comparisons, action plans, scholarship tables, proof-of-funds plans, and other structured artifacts all live on one zoomable canvas.
</role>

<context>
The product is not a scholarship search tool. It is a Funding OS for students.
The workspace is a Google Stitch–like infinite page where the agent places connected or unconnected visual objects:
- funding gap summaries
- scholarship tables
- school comparison matrices
- timelines
- action lists
- appeal packet checklists
- proof-of-funds document plans
- risk/warning cards
- charts and financial graphs

The app uses Claude API.
The coding agent already has access to Stitch MCP.
Public Stitch workflows are screen/project oriented and commonly use DESIGN.md and persisted metadata. Therefore, do NOT assume Stitch accepts a raw graph file directly as its native input.
Instead, design a repo-level workspace format that our app owns, then define a deterministic transform from workspace JSON into Stitch-ready screen prompts or grouped screen briefs.
</context>

<objective>
Create a separate workspace schema package and specification that Claude can use to:
1. define the infinite workspace data model,
2. serialize workspace state safely and predictably,
3. render it in our app,
4. transform selected workspace regions into Stitch-ready screen generation requests,
5. preserve graph/layout/interaction metadata for future editing.
</objective>

<deliverables>
Create all of the following files:

1. docs/workspace-schema.md
2. schemas/workspace.schema.json
3. schemas/workspace-node.schema.json
4. schemas/workspace-edge.schema.json
5. examples/funding-workspace.example.json
6. src/types/workspace.ts
7. src/lib/workspace/validateWorkspace.ts
8. src/lib/workspace/normalizeWorkspace.ts
9. src/lib/workspace/workspaceToStitchBrief.ts
10. src/lib/workspace/layoutHints.ts

If the repo already contains similar files, update them instead of duplicating.
</deliverables>

<non-negotiable_requirements>
The workspace schema page MUST define:

A. top-level document structure
B. node taxonomy
C. edge taxonomy
D. layout metadata
E. style tokens
F. interaction states
G. provenance/source metadata
H. agent-generation metadata
I. Stitch handoff structure
J. validation rules
K. versioning and migration notes

The workspace schema MUST be JSON-schema-valid and strict enough for programmatic validation.

The TypeScript types MUST be derived from the same schema structure and not contradict it.

The workspace model MUST support both connected and unconnected objects.

The workspace MUST support large canvases and incremental updates.

The output MUST be deterministic and schema-safe.
</non-negotiable_requirements>

<workspace_model_spec>
Design the workspace around this top-level structure:

{
  "version": "1.0.0",
  "workspaceId": "string",
  "title": "string",
  "description": "string | null",
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp",
  "author": {
    "type": "agent | user | system",
    "id": "string"
  },
  "viewport": {
    "x": number,
    "y": number,
    "zoom": number
  },
  "canvas": {
    "width": number | null,
    "height": number | null,
    "background": "grid | dots | none",
    "snapToGrid": boolean,
    "gridSize": number
  },
  "styleTheme": {
    "mode": "light | dark | system",
    "density": "comfortable | compact",
    "radiusScale": "sm | md | lg",
    "shadowScale": "none | soft | medium",
    "accentToken": "string"
  },
  "nodes": [],
  "edges": [],
  "groups": [],
  "artifacts": [],
  "sources": [],
  "agentState": {},
  "stitchHandoff": {}
}

You may extend this structure, but keep it simple and strongly typed.
</workspace_model_spec>

<node_taxonomy>
Define a discriminated union with a required "nodeType" field.
At minimum support these node types:

1. "table"
   For scholarship tables, requirement tables, emergency aid lists, institutional funding lists.

2. "comparison_matrix"
   For school-to-school comparison of cost, net price, likely aid, deadlines, visa readiness, stackability.

3. "graph"
   For bar charts, line charts, waterfall charts, stacked comparisons, timeline charts, risk trend charts.

4. "summary_card"
   For funding gap totals, appeal readiness, scholarship count, deadlines due, proof-of-funds readiness.

5. "action_list"
   For ranked next actions with owners, dependencies, urgency, due dates.

6. "document_checklist"
   For FAFSA/CSS/Profile documents, proof-of-funds packets, appeal packet requirements.

7. "timeline"
   For scholarship deadlines, deposits, aid appeal dates, visa dates, renewal milestones.

8. "note"
   For plain text analysis, warnings, reasoning summaries, assumptions.

9. "source_card"
   For provenance and evidence summaries linked to extracted pages or uploaded documents.

10. "risk_card"
   For scam alerts, missing info warnings, policy conflicts, eligibility unknowns.

11. "group_frame"
   For visually grouping nodes into regions like "School A", "Appeal Strategy", "Visa Funding".

12. "metric_chip_set"
   For compact key-value metrics like COA, guaranteed aid, likely aid, uncovered gap.

13. "decision_tree"
   For branching recommendation flows such as “appeal vs apply vs emergency aid”.

14. "kanban_lane"
   For workflow-style action progress.

Each node type must have:
- id
- nodeType
- title
- position
- size
- zIndex
- style
- content
- dataSourceRefs
- interaction
- generationMeta
- provenance
</node_taxonomy>

<node_content_rules>
Each node must use a type-specific content payload.

Examples:
- table.content = { columns, rows, sort, filters }
- graph.content = { graphType, xField, yFields, series, legend, annotations }
- comparison_matrix.content = { rowLabels, columnLabels, cells, scoringMethod }
- action_list.content = { items:[{label, priority, status, dueDate, dependsOn}] }
- document_checklist.content = { sections:[{title, items:[...]}] }
- summary_card.content = { primaryMetric, secondaryMetrics, confidence, status }
- timeline.content = { events:[{date, label, category, criticality}] }

For all nodes, include:
- confidence: 0..1 when relevant
- completeness: "complete | partial | draft"
- lastComputedAt when agent-generated
</node_content_rules>

<edge_taxonomy>
Support these edge types:

1. "reference"
   One node cites or derives from another.

2. "dependency"
   One action or document depends on another.

3. "comparison_link"
   Used between school comparison objects and supporting detail nodes.

4. "source_link"
   Connects output nodes to provenance/source nodes.

5. "drilldown"
   Connects summary cards to detailed analysis nodes.

6. "sequence"
   Used for ordered workflows or timelines.

7. "conflict"
   Indicates contradictory aid rules or incompatible stacking.

Each edge must have:
- id
- edgeType
- from
- to
- label
- directional
- style
- semantics
- provenance
</edge_taxonomy>

<layout_metadata>
Define layout metadata separately from content.
Each node must include:

position: { x, y }
size: { width, height, minWidth?, minHeight?, autoHeight? }
anchor: { x: "left|center|right", y: "top|center|bottom" } optional
layoutHints: {
  region?: string,
  cluster?: string,
  preferredNeighbors?: string[],
  avoidOverlap?: boolean,
  pin?: boolean,
  autoPlace?: boolean,
  column?: number,
  row?: number
}

Define optional workspace-level regions:
- "overview"
- "school-comparison"
- "applications"
- "appeals"
- "proof-of-funds"
- "renewal-risk"
- "emergency-aid"
- "sources"

Add explicit rules for:
- zoom-safe readability
- minimum node dimensions
- collision avoidance
- edge routing preferences
- clustered placement for related objects
</layout_metadata>

<style_tokens>
Define workspace style tokens in a reusable token object, not per-node only.

At minimum include:
- color tokens:
  - surface
  - surfaceMuted
  - border
  - textPrimary
  - textSecondary
  - accent
  - success
  - warning
  - danger
  - info
- typography tokens:
  - title
  - body
  - caption
  - metric
- spacing tokens
- radius tokens
- shadow tokens
- chart tokens
- edge tokens

Each node.style may override:
- variant
- emphasis
- borderStyle
- backgroundTone
- icon
- compactness

Do not hardcode random styles across node instances.
Use token names first, resolved values second.
</style_tokens>

<interaction_states>
Define interaction metadata for all nodes:

interaction: {
  selectable: boolean,
  draggable: boolean,
  resizable: boolean,
  collapsible: boolean,
  editable: boolean,
  connectable: boolean,
  hoverState?: {},
  expandedByDefault?: boolean,
  locked?: boolean,
  detailPanelTarget?: string | null,
  clickAction?: "open_detail|open_source|expand_children|none"
}

Also define runtime states:
- selected
- hovered
- focused
- collapsed
- loading
- stale
- error
- generated_draft
- user_edited
- needs_review

Make clear which states are persisted and which are transient UI state.
Persist only meaningful collaborative state.
</interaction_states>

<provenance_and_sources>
Every agent-generated node must include provenance.

Define:
provenance: {
  generatedBy: "agent|user|system",
  generatedAt: "ISO timestamp",
  sourceRefs: string[],
  evidenceSnippets?: [
    {
      "sourceId": "string",
      "quote": "string",
      "fieldPath": "string"
    }
  ],
  confidence?: number,
  warnings?: string[]
}

Define source objects at workspace level:
sources: [
  {
    "id": "string",
    "sourceType": "web_page | uploaded_doc | extracted_record | user_input | computed",
    "title": "string",
    "uri": "string | null",
    "retrievedAt": "ISO timestamp | null",
    "hash": "string | null",
    "notes": "string | null"
  }
]

Source cards should summarize source objects on the canvas.
</provenance_and_sources>

<agent_generation_metadata>
Define generationMeta for every agent-created node:

generationMeta: {
  promptClass?: "gap_summary | appeal_plan | school_compare | proof_of_funds | renewal_guard | emergency_router | scam_shield",
  generationMode?: "initial | revision | merge | drilldown",
  schemaVersion?: "string",
  generatedFromSelection?: string[],
  editableByUser?: boolean,
  lockedFields?: string[],
  reviewStatus?: "draft | reviewed | approved"
}
</agent_generation_metadata>

<stitch_handoff_spec>
Create a deterministic transform function that maps workspace JSON to a Stitch-ready brief package.

Because Stitch tooling is screen-oriented, define:
stitchHandoff: {
  handoffVersion: "1.0.0",
  workspaceId: "string",
  designSystemRef: ".stitch/DESIGN.md",
  targetScreens: [
    {
      "screenId": "overview-dashboard",
      "title": "Funding Overview Dashboard",
      "goal": "Show top-level financial picture for one or more schools",
      "sourceNodeIds": ["..."],
      "screenBrief": {
        "userGoal": "string",
        "contentBlocks": [...],
        "priorityMetrics": [...],
        "chartRequests": [...],
        "tableRequests": [...],
        "interactionNotes": [...],
        "visualTone": "string"
      }
    }
  ]
}

Implement workspaceToStitchBrief.ts to:
1. accept workspace JSON,
2. cluster nodes by region and purpose,
3. produce screen briefs for Stitch,
4. preserve references back to source node IDs.

A screen brief must contain:
- title
- user goal
- target device
- layout intent
- key components
- metrics to emphasize
- chart types to include
- notes on visual hierarchy
- source node references

Do NOT attempt to flatten the whole infinite workspace into one Stitch screen.
Instead, derive multiple screens from workspace regions:
- overview dashboard
- school compare screen
- action plan screen
- document checklist screen
- proof-of-funds screen
- risk and deadlines screen
</stitch_handoff_spec>

<json_schema_requirements>
Your JSON Schema files must:
- use explicit required fields
- use discriminated unions for nodeType and edgeType
- reject unknown top-level keys where appropriate
- allow extensibility only in controlled metadata fields
- validate ids as strings
- validate timestamps as date-time
- validate confidence as 0..1
- validate widths/heights as positive numbers
- validate edge endpoints against string ids

Include comments in markdown, not in JSON Schema.
</json_schema_requirements>

<example_payload_requirement>
Create a concrete example workspace JSON for a realistic student case with:
- 2 school comparison nodes
- 1 funding gap summary card
- 1 scholarship table
- 1 action list
- 1 appeal checklist
- 1 proof-of-funds document checklist
- 1 timeline
- 2 source cards
- several edges connecting summaries to detail nodes

The example must be complete and valid against the schema.
</example_payload_requirement>

<workspace_schema_page_requirements>
In docs/workspace-schema.md include these sections in this order:

1. Purpose
2. Why the workspace exists
3. Top-level document model
4. Node taxonomy
5. Edge taxonomy
6. Layout and infinite-canvas behavior
7. Styling tokens
8. Interaction and state model
9. Provenance and source tracking
10. Stitch handoff contract
11. Validation rules
12. Versioning and migration strategy
13. Example payload walkthrough

Also include:
- one ER-style relationship diagram in Mermaid
- one flowchart for workspace-to-Stitch transformation
- one compact table listing node types and primary use cases
</workspace_schema_page_requirements>

<typescript_implementation_rules>
In src/types/workspace.ts:
- export discriminated unions
- export helper types for each node type
- export workspace document type
- keep names stable and readable

In validateWorkspace.ts:
- validate schema
- return typed validation result
- return readable errors

In normalizeWorkspace.ts:
- fill safe defaults
- normalize missing optional style tokens
- normalize ids and timestamps where appropriate
- do NOT mutate original input

In layoutHints.ts:
- define heuristic layout helpers for cluster placement
- define default regions
- define node sizing defaults by nodeType

In workspaceToStitchBrief.ts:
- transform workspace regions into screen briefs
- preserve sourceNodeIds
- generate compact structured output only
</typescript_implementation_rules>

<quality_bar>
Before finishing:
1. ensure the schema is strict enough for production validation,
2. ensure the markdown spec matches the JSON schema exactly,
3. ensure the example JSON validates,
4. ensure the Stitch brief transform is deterministic,
5. ensure no node type is underspecified,
6. ensure future graph expansion is possible without breaking v1.

If there is ambiguity, choose the simplest schema that supports:
- finance comparisons,
- action planning,
- document workflows,
- source-linked reasoning,
- screen generation handoff.
</quality_bar>

<output_format>
Return:
1. a short summary of files created or changed,
2. the full contents of docs/workspace-schema.md,
3. the JSON Schema files,
4. the TypeScript types,
5. the example workspace payload,
6. the Stitch handoff transform example.
</output_format>

# You may NOT design the frontend on your own. Always prompt stitch for that. Convert the html file from "blogs_feed_vibrant.html" and "uniai_chat_vibrant.html" to the react native pages for the AI page and the blogs post page.

# Look at the financial_instruction.md for the financial capabilities and integrationions

## Important considerations:
the app owns the infinite workspace document as the source of truth
Stitch is only a design/render handoff layer for derived screens