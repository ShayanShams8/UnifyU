
Implementable Instruction Set for a Claude-Based Coding Agent to Build Funding OS Features
Executive summary
A “Funding OS” that materially improves student outcomes must shift from “scholarship search” to (a) structured funding intelligence, (b) rule-based eligibility/stacking/renewal reasoning, and (c) actionable outputs (appeal drafts, proof-of-funds plans, deadline alerts, and emergency funding routing). This aligns with how U.S. aid is actually administered: aid offers are bounded by cost of attendance (COA) and subject to school policies and Title IV constraints. 

This report specifies a complete, implementable instruction set for a Claude-based coding agent that (1) ingests scholarship and institutional funding data from university sites (including JS-rendered pages via Playwright), (2) normalizes it into a Funding Graph schema, (3) evaluates it using a rule engine (stackability, renewals/SAP, eligibility logic), and (4) generates user-facing products for the seven requested dimensions: Funding Gap Closer, Scholarship Stack Optimizer, Appeal Copilot, International Proof-of-Funds Planner, Renewal Guard, Emergency Funding Router, Scam Shield. 

Key build decisions:

Use a two-stage extraction: deterministic parsing + Claude structured extraction to minimize hallucinations and ensure parseable outputs. 
Treat robots.txt as a crawl directive, not authorization; build a compliance gate that respects Terms of Service and access controls even when Playwright can technically render pages. 
Anchor institutional cost baseline on primary datasets (IPEDS / College Scorecard) and institutional COA pages, then enrich with scholarships and emergency resources. 
Model renewals and “stay eligible” logic explicitly, using SAP requirements referenced by federal regulation and school policies. 
For basic-needs and emergency routing, incorporate evidence that basic needs insecurity is widespread among students; this feature can meaningfully prevent stop-out if it routes students to available campus/community supports. 
Where details (tech stack/hosting/UI framework) are not provided, this report marks them unspecified and provides implementation-neutral patterns.

Funding OS goals and measurable outcomes
The agent’s job is not “search.” It is to build and maintain funding decision objects and outputs that map cleanly to each goal, with measurable impact KPIs.

Funding Gap Closer
Goal: For each institution/program scenario, compute:
COA – (guaranteed aid + likely aid + user-known resources) → uncovered gap, plus ranked actions to reduce it.

Why COA matters: COA is the “cornerstone” for establishing need and sets a limit on total aid in multiple Title IV programs. 

Minimum outputs:

Gap estimate with confidence band (deterministic numbers + uncertainty from “likely” aid).
Prioritized action list (applications, appeals, documentation, deadlines).
Evidence links to source pages and timestamps.
Scholarship Stack Optimizer
Goal: Maximize total usable aid after stackability constraints (institutional rules like “cannot combine with X,” “max total institutional aid,” “replaces unmet need,” etc.).

Minimum outputs:

A set of stackable aid bundles + explanation.
“Conflict reason” graph when aid cannot be combined.
“Renewal fragility score” for each bundle (rules + conditionality).
Appeal Copilot
Goal: Provide drafts and document checklists for:

Financial aid reconsideration (institutional grants/merit).
Professional judgment / special circumstances pathway (school-managed). StudentAid.gov directs students to contact the school for an aid adjustment (professional judgment) and notes that the school’s decision is final. 
Minimum outputs:

Situation intake with structured fields.
Draft emails/letters (school-adapted).
Required documents list and submission method.
International Proof-of-Funds Planner
Goal: For F-1 / J-1 processes, guide users to plan funds and documents to meet i) school issuance of I-20/DS-2019 and ii) visa interview readiness.

Primary requirement: DHS states prospective students must have financial evidence showing sufficient funds to cover tuition and living expenses for the period of study. 

Regulatory framing: USCIS policy guidance notes F-1 students must have sufficient funds such that they can study without resorting to unauthorized employment. 

Minimum outputs:

School-specific “required amount” + what counts as evidence.
Gap-to-proof plan (what documents, from whom, dated how recently if stated).
Timeline aligned to admissions/visa deadlines.
Renewal Guard
Goal: Prevent aid loss due to missed renewal criteria (GPA/credits, SAP, FAFSA/CSS deadlines, renewal forms).

Federal layer: SAP is governed by 34 CFR § 668.34 (institutions must establish reasonable SAP policies for Title IV eligibility). 

Minimum outputs:

Monitor each award’s renewal rules + school SAP requirements.
Alerts with lead time that corresponds to deadline criticality.
Emergency Funding Router
Goal: Route students facing immediate hardship to resources (campus emergency funds, food/housing supports, public benefits navigation).

Evidence base: The Hope Center’s 2023–2024 survey reports 59% of students experienced at least one form of basic needs insecurity related to food or housing. 

Government evidence: GAO analysis estimated 23% of college students experienced food insecurity in 2020 (NPSAS-based). 

Minimum outputs:

Needs assessment (time-to-cash, category, risk of stop-out).
Resource matches (campus emergency funds + public supports + local nonprofits).
Safe, privacy-preserving guidance (do not collect unnecessary details).
Scam Shield
Goal: Detect and warn about scholarship/aid scams and unsafe requests.

FTC guidance: scholarship and financial aid scams often start with messages claiming the student was “selected,” may push workshops, and can resemble official offers. 

Minimum outputs:

Trust score + reasons.
“Never pay to apply” and safe-check guidance.
“Report to FTC” direction for suspected fraud (policy-aligned).
Data sources and acquisition pipeline
Source categories
Funding OS needs three classes of inputs:

Institutional sources

Scholarship listings, departmental award pages, bursar/financial aid pages, and program pages (often JS-rendered).
COA pages and institutional policies on packaging/renewals. COA definition and constraints are formalized in FSA guidance. 
Required public disclosures, including net price calculator availability (federal disclosure regime). 
Federal and national datasets

IPEDS: NCES describes IPEDS as annual survey components gathering data from every institution participating in federal student financial aid programs. 
College Scorecard: U.S. Department of Education site provides institution-level outcomes and data documentation. 
Aid process references

FAFSA reference pages (process steps, document checklists) for user guidance. 
CSS Profile references for institutions requiring non-federal institutional aid applications (College Board). 
Professional judgment/special circumstance guidance (FSA). 
International proof-of-funds: DHS + school-specific admissible documents. 
Scam guidance (FTC). 
Emergency funding sources

University emergency funding pages (criteria, application steps). 
Basic needs research for program design and targeting interventions. 
Compliance and access rules for scraping and automation
Because your concept includes “robots-hidden pages,” your system needs a compliance gate that distinguishes:

Crawl directives (robots.txt) vs.
Access controls (authentication walls, paywalls, CAPTCHAs, explicit anti-scraping terms).
RFC 9309 explicitly states Robots Exclusion Protocol rules are not a form of access authorization. 

Legal landscape varies; public data scraping has been litigated in cases such as hiQ v. LinkedIn and related analyses, and may still create contractual or other liabilities depending on circumstances; treat this as a compliance risk area, not an engineering-only problem. 

Implementation requirement: The agent must never be instructed to “bypass” access controls. If the page requires login, CAPTCHA, or explicit prohibition, the workflow must branch to:

“Request permission / partnership,” or
“User-provided documents upload,” or
“Use publicly accessible alternative sources.”
Acquisition pipeline stages
A robust ingestion pipeline is:

Discovery

Seed URLs per institution (financial aid/scholarship categories, COA pages, emergency funds page).
Optional: incorporate IPEDS/Scorecard institution identifiers (UnitID/OPEID) to unify sources. 
Fetch

HTTP fetch for static.
Playwright-run for JS-rendered.
Parse & snapshot

Store raw HTML, extracted text, and screenshot where needed (for audit and regression).
Compute content hash; dedupe.
LLM-assisted extraction into schema

Use structured outputs to force strict JSON schema. 
Normalization & conflict resolution

Merge duplicates, unify currencies, normalize deadlines, and maintain provenance.
Rule compilation

Convert eligibility and stackability text into rule AST with tri-state evaluation (true/false/unknown).
User-facing generation

Gap plans, optimizations, appeal drafts, proof-of-funds plans, renewal alerts, emergency routing, scam warnings.
Normalization schema and rule engine
Funding Graph normalization schema
A Funding OS requires a graph-first schema rather than a flat “scholarship list.” This aligns with the need to represent: eligibility constraints, stackability constraints, renewals, deadlines, and provenance.

Core entities

Institution (with identifiers: domain, IPEDS UnitID where known, Scorecard ID where known). 
Program (degree level, major, campus, modality).
CostOfAttendance (term/year, components, residency flags). COA is a central concept in FSA guidance. 
FundingOpportunity (scholarship, grant, tuition discount, fellowship, assistantship, emergency microgrant).
EligibilityRule (compiled AST + original text).
StackRule (constraints and precedence).
RenewalRule (SAP/GPA/credits/renewal application requirements).
DocumentRequirement (forms, proof docs, translation requirements).
Deadline (application, renewal, deposit, visa/I-20).
SourceArtifact (URL, snapshot hash, retrieved_at, robots policy status, terms notes).
Student-side entities (privacy-scoped)

StudentProfile (non-PII attributes: residency state/country, citizenship category, academic level, GPA band, dependency, etc.).
StudentScenario (a scenario is: student profile + target institution/program + year/term).
AidOffer (when user uploads or inputs award letter details).
ActionPlan (generated timeline tasks + dependencies).
Mermaid ER diagram for Funding Graph
offers

publishes

provides

has

requires

constrained_by

renews_by

interacts_with

sourced_from

defines

includes

produces

evaluated_against

applied_to

INSTITUTION

string

institution_id

string

name

string

primary_domain

string

ipeds_unitid

string

scorecard_id

PROGRAM

COST_OF_ATTENDANCE

FUNDING_OPPORTUNITY

string

opportunity_id

string

type

string

title

string

award_amount_text

string

award_amount_normalized

string

frequency

string

renewable

string

stacking_policy_text

DEADLINE

DOCUMENT_REQUIREMENT

ELIGIBILITY_RULE

string

rule_id

string

rule_text

string

rule_ast_json

string

evaluation_mode

RENEWAL_RULE

string

renewal_rule_id

string

rule_text

string

sap_required

string

gpa_min

string

credits_min

STACK_RULE

string

stack_rule_id

string

rule_text

string

rule_ast_json

string

conflict_group

SOURCE_ARTIFACT

STUDENT_PROFILE

STUDENT_SCENARIO

AID_OFFER

ACTION_PLAN



Show code
Extraction rules: mapping messy pages into structured objects
Your agent must follow deterministic rules before LLM extraction:

Document classification (deterministic)

Identify page purpose: scholarship list / single scholarship detail / COA / proof-of-funding / emergency funds / policy / application form.
Identify “award objects” boundaries (tabs/accordions/cards).
Field extraction heuristics

Amount: capture raw amount string and structured numeric if unambiguous; preserve currency symbol and period (“per year,” “per semester”).
Deadlines: convert to ISO-8601 with timezone assumptions; preserve raw.
Eligibility: store as bullet text + compiled rule AST with tri-state evaluation.
Stackability: detect phrases like “cannot be combined with,” “may replace,” “up to,” “maximum institutional aid,” “first-dollar/last-dollar.”
Renewal: capture SAP/GPA/credits requirements; link to SAP policy when referenced.
Proof-of-funds: required amount, acceptable documents, freshness requirements (“within X months”), translation rules, sponsor letters.
Provenance

Always persist:
URL, retrieval timestamp
page title
hash of html/text
a short evidence snippet for each extracted field (for audit and UI details)
Rule engine design
The rule engine should compile extracted natural language into an explainable internal representation.

Represent rules as

A JSON AST supporting:
logical ops: AND/OR/NOT
comparisons: >=, <=, ==, in, contains
quantifiers: “at least N credits,” “minimum GPA”
categorical constraints: residency, citizenship class, class year, major
time constraints: before deadline, maintain per term
Evaluation semantics

Use tri-state logic: true / false / unknown
Unknown arises when user hasn’t provided required attributes (e.g., GPA not entered).
Rule sources

SAP: Institutions must have a SAP policy (Title IV), and 34 CFR § 668.34 governs the policy expectation. 
COA: Use FSA COA conceptual structure as reference where relevant. 
Professional judgment: handled by schools and described in FSA handbook and StudentAid.gov guidance. 
Explainability requirement Every evaluation returns:

decision: eligible | ineligible | unknown
reasons[] (human readable)
missing_fields[] (what user must enter)
source_links[]
Claude coding agent instruction set and prompts
Claude API integration requirements
Use the Claude Messages API as the controlling interface. Anthropic documents the API base (https://api.anthropic.com) and primary endpoint (POST /v1/messages), with required headers including x-api-key and anthropic-version. 

Recommended supplemental endpoints:

Token counting: POST /v1/messages/count_tokens (cost control gates). 
Models list: GET /v1/models (runtime model selection). 
Message batches for large-scale extraction jobs (50% cost reduction per Anthropic docs): POST /v1/messages/batches. 
Use structured outputs to guarantee schema compliance for extraction and planning modules. Anthropic documents structured outputs as a way to constrain responses to a schema and strict tool use. 

Response parsing and retry/backoff
Treat stop_reason and tool calls as first-class: tool use requires executing tool(s) and returning results as tool_result blocks (Claude tool-use workflow). 
Backoff on 429 / rate-limit responses using tier-aware exponential backoff (jitter), because Anthropic enforces tiered rate limits (RPM/TPM). 
Add a circuit breaker for repeated scraping/extraction failures.
Claude prompting best practices for this agent
Anthropic guidance emphasizes avoiding blanket instructions like “always use tool,” and instead giving targeted “use tool when it enhances understanding” instructions. 

Tool definitions should be extremely detailed about what the tool does and when to use it, per Anthropic tool-use documentation. 

Use “just-in-time context engineering” patterns for agent workflows to avoid huge context windows and reduce tool-definition overhead. 

Safety and PII handling specification
Data you should treat as sensitive:

SSN, tax returns, bank statements, loan documents, passport numbers, immigration IDs, account numbers.
Aid offer letters may include sensitive identifiers even if the award amounts are non-sensitive.
Policy for the agent

Never request SSN or ask users to upload full tax/bank statements unless you have explicit and necessary workflow justification; prefer partial redactions and structured input fields.
Store only what is required for computation; keep original uploads encrypted and access-controlled; log access.
Provide fraud/scam warnings consistent with FTC advice (scams mimic “selected” awards). 
Anthropic notes data protection measures like encryption in transit and at rest and limited employee access defaults for Claude user data (for Claude services). 

For your own app, implement comparable controls (encryption, least privilege, audit logging).

Skill-based architecture: concrete Claude skill definitions
You can implement these skills as:

“tools” passed into the Messages API, or
internal skill modules in your orchestrator, or
(optionally) via Anthropic Skills API (beta) if you choose to adopt it. 
Below is a concrete skills list with name, purpose, input/output schema, and permissions (agent authorization scope).

Skills list
Skill name	Primary goal dimension(s)	Input schema (summary)	Output schema (summary)	Permissions
fetch_page_static	all	{url, headers?, timeout_ms?}	{status, final_url, html, text, fetched_at}	Network: allowlisted domains only
run_playwright_job	all data acquisition	{job_id, url, actions[], storage_state_ref?, output: {html,screenshot,har}}	{html, screenshot_path?, network_log?, fetched_at, blocked_reason?}	OS exec: Playwright sandbox only
extract_funding_objects	Gap Closer, Stack Optimizer	{source_artifact_id, page_text, page_html?, page_type}	{opportunities[], deadlines[], docs[], warnings[]}	LLM: structured output only
compile_rules	Stack Optimizer, Renewal Guard, Proof-of-Funds	{rule_text, rule_type, context}	{rule_ast, unknown_fields[], confidence}	LLM: structured output only
evaluate_rules	all decision features	{rule_ast, student_profile}	{decision, reasons[], missing_fields[]}	No network
compute_funding_gap	Gap Closer	{scenario_id, coa, offers[], opportunities[]}	{gap_amount, range, explanation, next_actions[]}	No network
draft_appeal_packet	Appeal Copilot	{scenario_id, school_contact?, circumstances, offers[], attachments_available}	{email_text, letter_text, doc_checklist[]}	No network
proof_of_funds_plan	International Planner	{institution_requirements, user_funding_sources}	{required_amount, docs_needed[], timeline[]}	No network
route_emergency_support	Emergency Router	{location?, need_type, timeframe, student_status}	{resources[], scripts[], safety_notes[]}	Network: curated directory only
scam_score_opportunity	Scam Shield	{opportunity, source_url}	{score, flags[], user_warning_text}	No network

Two concrete SKILL.md-style definitions (ready to paste)
The “Agent Skills open standard” format used by Stitch skill libraries demonstrates a lightweight front-matter + instruction body pattern (name, description, allowed-tools). 

You can adopt the same pattern for your Claude coding agent.

Skill: Funding object extraction
md
Copy
name extract-funding-objects
description Extract scholarships, grants, fee waivers, and emergency funds from an institutional web page into the Funding OS normalization schema.
allowed-tools

fetch_page_static
run_playwright_job

# Funding Object Extraction Skill

You are a data extraction specialist. Your only goal is to produce schema-valid JSON for FundingOpportunity, Deadline, DocumentRequirement, and SourceArtifact links.

## Constraints
- Output MUST be valid JSON matching the provided schema.
- Never invent missing values. Use null and populate `warnings[]`.
- Every extracted field MUST include at least one evidence snippet reference: {source_artifact_id, quote, selector_or_locator?}.
- If the page requires login, CAPTCHA, or blocks automation, stop and output `blocked_reason` without attempting bypass.

## Input
You will receive:
- source_artifact_id
- page_type (e.g., scholarship_list, scholarship_detail, coa, proof_of_funds, emergency_fund, policy)
- page_text (required)
- page_html (optional)

## Output (high-level)
Return:
{
  "opportunities": [...],
  "deadlines": [...],
  "document_requirements": [...],
  "warnings": [...]
}
Skill: Rule compilation
md
Copy
name compile-funding-rules
description Convert eligibility/renewal/stacking text into an explainable rule AST with tri-state evaluation support.
allowed-tools

# Rule Compilation Skill

You are a rules compiler. Convert policy text into a JSON AST.

## Constraints
- Do NOT guess. If the rule is ambiguous, encode it as unknown and add a warning.
- Preserve original rule_text verbatim in the output (truncated only if huge).
- Use tri-state fields: decision can be true/false/unknown.
- Identify missing user fields explicitly (e.g., gpa, residency_state, citizenship_category).

## Output AST operators
- and/or/not
- equals/in/contains
- gte/lte
- date_before/date_after
- requires_document(document_type)
- max_total(type, amount)
- exclusive_group(group_id)

## Required Output
{
  "rule_ast": {...},
  "unknown_fields": [...],
  "confidence": 0.0-1.0,
  "warnings": [...]
}
Exact Claude prompt templates with few-shot examples
Structured outputs should be used for these prompts to enforce schemas. 

Prompt template: Scholarship extraction (HTML/text → FundingOpportunity[])
text
Copy
SYSTEM:
You extract institutional funding information into the provided JSON Schema. You never invent facts.
If information is missing or ambiguous, set the normalized field to null and add a warning.
Every non-null field must include at least one evidence reference.

USER:
Task: Extract funding opportunities from this page.
Page type: {page_type}
Institution: {institution_name} (domain: {domain})
Source artifact id: {source_artifact_id}
Retrieved at: {retrieved_at_iso}

Return JSON matching this schema:
{JSON_SCHEMA_HERE}

Page text:
<<<
{page_text}
>>>

Optional HTML:
<<<
{page_html_or_empty}
>>>
Few-shot example (abbreviated)

Input snippet

text
Copy
"Scholarship: Example STEM Award
Amount: $2,500 per year (renewable)
Eligibility: Undergraduate, GPA 3.0+, Computer Science majors
Deadline: March 1"
Output (illustrative)

json
Copy
{
  "opportunities": [
    {
      "title": "Example STEM Award",
      "type": "scholarship",
      "award_amount_normalized": {"currency":"USD","min":2500,"max":2500,"period":"year"},
      "renewable": true,
      "eligibility_text": "Undergraduate, GPA 3.0+, Computer Science majors",
      "evidence": [{"source_artifact_id":"sa_123","quote":"Amount: $2,500 per year (renewable)"}]
    }
  ],
  "deadlines": [
    {
      "opportunity_title": "Example STEM Award",
      "deadline_date": "2026-03-01",
      "deadline_type": "application",
      "evidence": [{"source_artifact_id":"sa_123","quote":"Deadline: March 1"}]
    }
  ],
  "warnings": []
}
Prompt template: Aid appeal draft (inputs → email + checklist)
This must reflect that aid adjustments / professional judgment requests are handled by the school and may require documentation. 

text
Copy
SYSTEM:
You draft a professional financial aid reconsideration email and a supporting-document checklist.
You do not provide legal advice. You do not request SSN or bank statements.
You must be empathetic, concise, and specific. Never threaten or misrepresent facts.

USER:
School: {school_name}
Office contact (if known): {office_email_or_null}
Student context: {student_context_structured}
Current aid offer summary: {aid_offer_structured}
Comparable offers (optional): {peer_offers_structured}
Circumstances: {special_circumstances_structured}

Output JSON:
{
  "email_subject": "...",
  "email_body": "...",
  "attachment_checklist": [ ... ],
  "notes_for_student": [ ... ]
}
Playwright CLI operations design
What Playwright CLI is best for in this system
Playwright provides a CLI for running tests, generating code, etc., and the most up to date command list can be retrieved with npx playwright --help. 

For scraping, Playwright is typically used as a library (Node/Python/.NET), but CLI + generated scripts can accelerate selector creation and reproducibility.

Authentication/session handling (authorized-only)
Playwright recommends saving and reusing authenticated state (“storage state”) in workflows where you can authenticate once and reuse cookies/local storage/IndexedDB. 

Compliance constraint: only use saved sessions where the user has authorization and the site permits automated access.

Rate limits, caching, and “anti-bot” handling (non-evasive)
Do not implement evasion. Focus on:

Respect robots/ToS gates. 
Throttle concurrency; exponential backoff on 429.
Cache HTML snapshots by URL + content hash (avoid re-fetch if unchanged).
Fail closed when encountering CAPTCHA/blocked states and route to alternate workflows.
Approach comparison table: where Playwright runs
Approach	Summary	Pros	Cons	Best fit
Server-side Playwright (dedicated workers)	Run Playwright in controlled worker pool	Strong control of caching, observability, secrets; consistent runtime	Higher ops overhead; requires sandboxing	Production-grade ingestion
Serverless Playwright	Run in ephemeral functions/containers	Burst scale; easy scheduling	Cold starts, browser deps, time limits, complex state	Periodic batch refresh with moderate complexity
Client-side Playwright (user device)	User runs scraping locally (agent-assisted)	Avoids storing credentials; user-controlled access	Hard to standardize; less scalable; UX complexity	Sensitive sites requiring user login, with consent

Example CLI commands and scripts
Install Playwright

bash
Copy
npm init playwright@latest
npx playwright install

Generate stable selectors for a university scholarship portal flow

bash
Copy
npx playwright codegen https://example.edu/scholarships --output scripts/codegen/scholarships-flow.spec.ts
Playwright’s codegen is designed to generate code by recording browser interactions. 

Save authenticated storage state (authorized use case)
(Example uses Playwright library; run via node scripts/auth/save-state.js.)

js
Copy
// scripts/auth/save-state.js
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(process.env.LOGIN_URL);
  // User completes login manually if needed (authorized use only).
  // After login:
  await context.storageState({ path: 'secrets/storage-state.json' });
  await browser.close();
})();
Storage state reuse is documented by Playwright. 

Scrape script with caching hooks (simplified Node example)

js
Copy
// scripts/scrape/scrape-page.js
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';

function hash(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

(async () => {
  const url = process.argv[2];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: process.env.STORAGE_STATE_PATH || undefined
  });

  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const html = await page.content();

  const h = hash(html);
  await fs.mkdir('cache/html', { recursive: true });
  await fs.writeFile(`cache/html/${h}.html`, html, 'utf8');

  await browser.close();
})();
Scraping QA: traces for reproducibility
Playwright provides tracing and a trace viewer to debug failures and capture what happened during a run. 

Stitch MCP workspace spec and UX deliverables
What Stitch MCP offers (as of current public tooling)
The public Stitch MCP ecosystem you referenced is oriented around UI design assets (projects/screens) and delivering HTML/screenshot context to coding agents, not a generic data graph editor.

For example, the stitch-mcp CLI describes capabilities like serving project screens, building sites from screens, and exposing virtual tools such as build_site, get_screen_code, and get_screen_image. 

The Stitch Agent Skills repo describes installing skills like stitch-design, design-md, and react-components to convert Stitch designs into code and maintain .stitch/DESIGN.md. 

Because official Stitch “infinite canvas” data model docs were not retrievable as plain text via sources accessed here (pages loaded but did not expose parsable content), this section provides:

A Stitch-based UI design workflow (robust, source-backed), and
A repo-level infinite canvas JSON spec (tool-agnostic) that your Claude agent can generate and maintain.
Stitch-based UI workflow for Funding OS screens
Use Stitch MCP to create and export a Funding OS UI kit that your agent implements in your app.

Required Stitch screens

Funding Dashboard (summary of gap, deadlines, alerts)
School Compare (net cost / gap / stack bundles)
Scholarship Detail (eligibility, docs, stack interactions)
Appeal Builder (draft + checklist)
Proof-of-Funds Planner (amount + documents + timeline)
Renewal Guard (rules + status + alerts)
Emergency Support (quick routing + scripts)
Scam Shield modal (warnings + explainers)
Agent instructions

Maintain .stitch/DESIGN.md as design “source of truth” as Stitch skills recommend. 
Use Stitch MCP tools via proxy config to provide designs to the coding agent. The stitch-mcp readme shows MCP client config and auth patterns. 
Example MCP client config (from stitch-mcp readme pattern)

json
Copy
{
  "mcpServers": {
    "stitch": {
      "command": "npx",
      "args": ["@_davideast/stitch-mcp", "proxy"]
    }
  }
}

Infinite canvas workspace spec (repo-level JSON Canvas file)
Because the “Funding Graph” is a graph, your agent should maintain an infinite canvas file (funding-os.canvas.json) that:

documents the schema,
shows entity relationships,
tracks roadmap milestones,
shows live metrics (as pasted JSON snapshots).
This is implementable even if Stitch’s canvas API is not exposed: you can store this file in your repo, and open it in any JSON-canvas-capable tool, or render it in your own app.

Node types to include
group: cluster boundaries (Data, Rule Engine, UX, QA, Compliance)
text: requirements, checklists
file: links to schema files in repo
link: links to authoritative references (FSA pages, DHS, FTC, etc.)
data: embedded sample JSON objects (small)
Sample JSON Canvas spec (components, positions, sample data)
json
Copy
{
  "nodes": [
    {
      "id": "group_goals",
      "type": "group",
      "x": 0,
      "y": 0,
      "width": 520,
      "height": 420,
      "label": "Funding OS Goals"
    },
    {
      "id": "text_goals",
      "type": "text",
      "x": 20,
      "y": 40,
      "width": 480,
      "height": 360,
      "text": "Goals:\n- Funding Gap Closer\n- Scholarship Stack Optimizer\n- Appeal Copilot\n- Proof-of-Funds Planner\n- Renewal Guard\n- Emergency Funding Router\n- Scam Shield\n\nOutputs must be explainable and source-linked."
    },

    {
      "id": "group_schema",
      "type": "group",
      "x": 560,
      "y": 0,
      "width": 620,
      "height": 520,
      "label": "Funding Graph Schema"
    },
    {
      "id": "text_schema",
      "type": "text",
      "x": 580,
      "y": 40,
      "width": 580,
      "height": 460,
      "text": "Entities:\nInstitution, Program, COA, FundingOpportunity,\nEligibilityRule, StackRule, RenewalRule,\nDeadline, DocumentRequirement, SourceArtifact,\nStudentScenario, AidOffer, ActionPlan.\n\nRules evaluate in tri-state: true/false/unknown.\nProvenance required for every field."
    },

    {
      "id": "group_pipeline",
      "type": "group",
      "x": 0,
      "y": 460,
      "width": 1180,
      "height": 520,
      "label": "Ingestion + Reasoning Pipeline"
    },
    {
      "id": "text_pipeline",
      "type": "text",
      "x": 20,
      "y": 500,
      "width": 1140,
      "height": 460,
      "text": "1) Discover URLs per institution\n2) Fetch (HTTP or Playwright)\n3) Snapshot + hash + provenance\n4) LLM structured extraction\n5) Normalize + dedupe\n6) Compile rules (eligibility/stack/renewal)\n7) Evaluate scenario\n8) Generate UX outputs + alerts"
    }
  ],
  "edges": [
    { "id": "e1", "fromNode": "text_goals", "toNode": "text_schema", "label": "schema supports goals" },
    { "id": "e2", "fromNode": "text_schema", "toNode": "text_pipeline", "label": "pipeline populates graph" }
  ]
}
Student action plan flowchart (mermaid)
mermaid
Copy
flowchart TD
  A[Start: Student Scenario Created] --> B[Fetch COA + baseline costs]
  B --> C[Fetch Scholarships/Grants/Emergency funds]
  C --> D[Normalize into Funding Graph]
  D --> E[Compile eligibility/stack/renewal rules]
  E --> F{Enough info to decide?}
  F -- No --> G[Ask for missing fields (tri-state unknowns)]
  F -- Yes --> H[Compute gap + stack bundles]
  H --> I{Gap <= 0?}
  I -- Yes --> J[Generate enrollment-ready plan + renewal guard]
  I -- No --> K[Generate action plan: apply, appeal, fee waivers, emergency routing]
  K --> L[Draft appeal packet + doc checklist]
  L --> M[Set alerts: deadlines + renewal triggers]
  J --> M
  M --> N[Monitor changes + refresh sources]
Timeline for student actions (mermaid)
Apr 05
Apr 12
Apr 19
Apr 26
May 03
May 10
May 17
May 24
May 31
Jun 07
Jun 14
Jun 21
Jun 28
Jul 05
Jul 12
Jul 19
Jul 26
Scenario setup + missing fields capture
Fetch COA + scholarships (cached)
Normalize + rule compile
Apply to priority scholarships
Submit aid reconsideration appeal
Proof-of-funds docs (international)
Renewal guard monitoring
Intake
Discovery & Extraction
Actions
Ongoing
Funding OS Student Action Timeline (Example)


Show code
Sample dashboard mockup (ASCII)
text
Copy
┌──────────────────────── Funding OS Dashboard ────────────────────────┐
│ School: [Unspecified University]   Program: [CS BS]   Term: Fall 2026 │
├──────────────────────────────────────────────────────────────────────┤
│ Estimated COA: $38,400         Guaranteed Aid: $12,000               │
│ Likely Aid (est.): $4,500       Current Gap: $21,900 (± $2,000)      │
├─────────────────────────────── Action Plan ──────────────────────────┤
│ 1) Apply: Dept Scholarship A (due Apr 15)    [Eligibility: Likely]    │
│ 2) Appeal: Reconsideration email draft       [Ready]                 │
│ 3) Proof-of-funds packet (I-20): missing 2 docs [Upload]             │
│ 4) Emergency supports: campus microgrant options [View]               │
├──────────────────────────── Deadlines & Alerts ──────────────────────┤
│ Apr 10: FAFSA/CSS supporting docs (if applicable)                     │
│ Apr 15: Dept Scholarship A deadline                                   │
│ May 01: Housing deposit                                                │
│ Renewal Risk: GPA threshold (unknown) → ask user for GPA               │
├───────────────────────────── Trust / Scam Shield ────────────────────┤
│ New opportunity detected: "Guaranteed Grant Hotline"  ⚠ High risk     │
│ Reason: asks for payment + urgent claim                               │
└──────────────────────────────────────────────────────────────────────┘
Testing, compliance, deployment, monitoring, and roadmap
Testing & QA strategy
Unit tests

Parser units: amount parsing, deadline normalization, eligibility clause tokenization.
Rule evaluation: tri-state logic correctness, explanation generation.
Scam scoring: known scam patterns per FTC examples (no payment, no SSN requests). 
Integration tests

Playwright fetch jobs:
verify HTML snapshot, screenshot optional, stable extraction
trace capture for flaky pages (Playwright trace viewer workflow). 
LLM extraction:
structured outputs validate schema; reject non-valid JSON. 
Scraping validation

For each source domain:
snapshot diff checks
“field drift” detection (award amounts/deadlines changed)
provenance presence checks (every field evidences)
Legal/compliance checks (ToS-aware)

robots.txt parsing and compliance gate (REP is standardized; honor it operationally). 
hard stops on:
CAPTCHAs
authenticated portals without explicit user authorization
explicit ToS prohibitions logged in your allowlist metadata
Deployment & monitoring
Core metrics

Ingestion:
fetch success rate by domain
Playwright job failure reasons (blocked/login/captcha/timeouts)
average fetch latency, cache hit rate
Extraction:
schema validation pass rate
“unknown fields” rate (signals missing schema coverage)
Product outcomes:
number of completed action plans
appeal drafts created and exported
deadlines met (user confirmations)
renewal alerts triggered vs. acted on
Security:
PII exposure events (uploads blocked, redaction required)
secrets access logs
Cost:
tokens per extraction batch (use token counting endpoint gates). 
Logging

Use structured logs with correlation IDs for:
scenario_id
source_artifact_id
request-id returned by Claude API (Anthropic returns a request-id header). 
Prioritized implementation roadmap (milestones + estimated effort)
Effort is given as relative size (S/M/L) and sequencing; exact hours are intentionally unspecified.

Milestone	Scope	Deliverables	Effort
Foundation	Data model + ingestion skeleton	Funding Graph schema, SourceArtifact snapshots, minimal fetcher (HTTP + Playwright), structured output harness	L
Scholarship ingestion MVP	Initial scholarship extraction	extract_funding_objects + provenance + dedupe, institution allowlist and compliance gate	M
Funding Gap Closer MVP	First end-to-end “gap plan”	COA ingestion (institution pages + Scorecard/IPEDS baseline), gap computation and action plan flow	L
Stack Optimizer v1	Stack + conflict graph	StackRule AST, bundle optimizer, explanation UI primitives	M
Appeal Copilot v1	Appeal drafts + doc checklist	Templates + structured intake + export formats	M
Proof-of-Funds Planner v1	International planning	Requirement extraction from institution pages + proof packet + timeline	M
Renewal Guard v1	SAP/renewal alerts	RenewalRule AST, alert scheduler, user prompts for missing fields	M
Emergency Router v1	Basic needs + emergency funds	Emergency resource ingestion, routing logic, safe scripts	M
Scam Shield v1	Trust scoring	FTC-aligned flags, warnings, and reporting guidance	S
Stitch UI kit	UX build acceleration	Stitch screens + .stitch/DESIGN.md + export pipeline via Stitch MCP	M
Hardening	QA, monitoring, security	Full test suite, dashboards, secrets policies, incident runbooks	L

Stitch MCP implementation notes for the coding agent
Your coding agent can incorporate Stitch MCP into development workflows using:

stitch-mcp init for auth/config, and proxy to expose tools to an MCP-compatible agent client. 
Leveraging skill patterns from the Stitch Agent Skills repo (front-matter, allowed-tools, workflow routing). 
This pairs well with your Funding OS because the most complex UI surfaces (dashboard, compare, timelines) benefit from rapid design iteration while the funding graph and rule engine remain backend-focused.