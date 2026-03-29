from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..security import get_current_student
from ..config import get_settings
import anthropic
import httpx
import os
import re
import json

router = APIRouter(prefix="/ai", tags=["ai"])
settings = get_settings()

SYSTEM_PROMPT = """You are UnifyAI, an AI assistant built into UnifyU — a platform where international students share their experiences and help each other navigate life in a new country.

Your role is to provide helpful, empathetic, and accurate answers to international students' questions. You draw on:
1. Blog posts written by international students in our community (provided as context)
2. Your broad knowledge about academic systems, visa processes, campus life, cultural adjustment, and finances

Common topics you help with:
- Academic systems (SAT, GRE, TOEFL, GPA, AP exams, etc.)
- Visa and immigration (F-1, OPT, CPT, etc.)
- Campus life and housing
- Cultural adjustment and homesickness
- Financial matters (scholarships, banking, budgeting)
- Career and internship searches

When answering, always:
- Be warm, inclusive, and culturally sensitive
- Cite specific blog posts when they are directly relevant
- Suggest specific community members to DM if they have written relevant blog posts
- Use clear, simple language (many users are non-native English speakers)
- If a question is about a specific country's system, acknowledge you may have general rather than country-specific knowledge

Format suggestions nicely using markdown when appropriate."""

CANVAS_SYSTEM_ADDON = """
## Canvas Workspace — Active
You have full access to the student's canvas workspace. Use canvas blocks to organize information visually.

### Adding NEW nodes
[CANVAS_NODES]
{"nodes":[{"type":"table","title":"Short Title","rows":[{"key":"Label","value":"Value"}]},{"type":"concept","title":"Short Title","content":"One sentence"}],"connections":[{"from_index":0,"to_index":1}]}
[/CANVAS_NODES]

Node types: "table" (with "rows" array of {"key","value"}), "concept" (with "content"), "note" (longer text with "content").
Connections in CANVAS_NODES use 0-based indices into the nodes array for that batch.

### Editing, deleting, or connecting EXISTING nodes
[CANVAS_OPS]
{"ops":[
  {"op":"add","type":"concept","title":"New Idea","content":"Description"},
  {"op":"edit","id":"NODE_ID","title":"Updated Title","content":"Updated content"},
  {"op":"edit","id":"NODE_ID","rows":[{"key":"Updated","value":"Value"}]},
  {"op":"delete","id":"NODE_ID"},
  {"op":"connect","from_id":"NODE_ID","to_id":"NODE_ID"},
  {"op":"disconnect","from_id":"NODE_ID","to_id":"NODE_ID"}
]}
[/CANVAS_OPS]

Rules:
- Only produce canvas blocks when you have meaningful structured content (2+ items) to show
- Keep titles ≤28 chars, key/value ≤25 chars
- Only reference IDs that appear in the current canvas context below
- Do NOT output canvas blocks for conversational or single-sentence answers
- After adding canvas content, tell the user "I've added [X] item(s) to your canvas"\
"""

TOOL_DESCRIPTIONS: dict[str, str] = {
    "currency": "Currency Converter — provide real-time exchange rate guidance between world currencies",
    "fundingGap": "Funding Gap Calculator — help calculate remaining costs after all aid sources and suggest strategies to close the gap",
    "scholarships": "Scholarship Finder — surface and describe scholarships tailored to the student's country of origin, field of study, and degree level",
    "scamCheck": "Scam Shield — assess the legitimacy of scholarships or funding opportunities and flag red flags",
    "appeal": "Appeal Copilot — draft or guide professional financial aid appeal letters",
    "emergency": "Emergency Aid Router — identify immediate campus and community funding resources",
    "proofOfFunds": "Proof of Funds Planner — help plan F-1/J-1 visa financial documentation and evidence",
}


def _load_relevant_posts(query: str, db: Session, limit: int = 5) -> list[dict]:
    """Load blog posts relevant to the query for context injection."""
    keywords = query.lower().split()
    posts = db.query(models.Post).filter(models.Post.parent == None).limit(50).all()
    scored = []
    for post in posts:
        path = os.path.join(settings.posts_dir, post.path)
        if not os.path.exists(path):
            continue
        with open(path, "r", encoding="utf-8") as f:
            content = f.read().lower()
        score = sum(1 for kw in keywords if kw in content)
        if score > 0:
            student = db.query(models.Student).filter(models.Student.id == post.author).first()
            author_display = (
                student.userName if student and not post.isAnonymous else "Anonymous"
            )
            scored.append((score, post.id, author_display, content[:800]))

    scored.sort(reverse=True)
    return [
        {"post_id": pid, "author": author, "excerpt": excerpt}
        for _, pid, author, excerpt in scored[:limit]
    ]


async def _fetch_reddit_context(query: str) -> str:
    """Fetch relevant posts from international student subreddits."""
    subreddits = ["internationalstudents", "f1visa", "college"]
    results = []
    async with httpx.AsyncClient(timeout=10.0) as client:
        for sub in subreddits[:2]:
            try:
                url = f"https://www.reddit.com/r/{sub}/search.json?q={query}&limit=3&restrict_sr=1"
                resp = await client.get(
                    url, headers={"User-Agent": settings.reddit_user_agent}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    for item in data.get("data", {}).get("children", []):
                        post_data = item.get("data", {})
                        title = post_data.get("title", "")
                        text = post_data.get("selftext", "")[:300]
                        if title:
                            results.append(f"Reddit r/{sub}: {title}\n{text}")
            except Exception:
                pass
    return "\n\n".join(results[:4])


@router.post("/chat", response_model=schemas.ChatResponse)
async def chat(
    request: schemas.ChatRequest,
    current: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=503, detail="AI service not configured")

    relevant_posts = _load_relevant_posts(request.message, db)
    reddit_context = await _fetch_reddit_context(request.message)

    context_parts = []
    if relevant_posts:
        context_parts.append("=== UNIFYU COMMUNITY BLOG POSTS (relevant) ===")
        for p in relevant_posts:
            context_parts.append(
                f"Post ID #{p['post_id']} by @{p['author']}:\n{p['excerpt']}"
            )

    if reddit_context:
        context_parts.append("\n=== EXTERNAL CONTEXT (Reddit) ===")
        context_parts.append(reddit_context)

    system = SYSTEM_PROMPT

    # When canvas is OFF, tell the AI to nudge the user to enable it
    if not request.canvas_mode:
        system += (
            "\n\nNote: Canvas integration is currently OFF for this session. "
            "If the user asks to add content to canvas, visualize information, "
            "or mentions the canvas workspace, tell them to tap the "
            "\"Enable integration with Canvas\" button at the top of the chat screen to activate it."
        )

    # Build agent-mode system prompt based on active tools
    active = [t for t in request.active_tools if t in TOOL_DESCRIPTIONS]
    if not active and request.financials_mode:
        # backwards compat: old financials_mode flag enables all financial tools
        active = list(TOOL_DESCRIPTIONS.keys())
    if active:
        tool_list = "\n".join(f"- {TOOL_DESCRIPTIONS[t]}" for t in active)
        system += f"""

## Agent Mode — Active Tools
You are operating as a financial agent for this session. The following tools are active:
{tool_list}

When the user's question relates to an active tool, respond in a structured, agent-style manner:
- Use clear headers (##) and bullet points
- Be specific, actionable, and thorough
- For currency questions: ask for amount and currencies if not provided, then give conversion guidance with real rate caveats
- For scholarship searches: list specific opportunities with eligibility details
- For scam checks: give a trust score (1–10) with clear reasoning
- Always conclude with a concrete next step the student can take"""

    # Canvas mode: add canvas instructions + current canvas state
    if request.canvas_mode:
        system += CANVAS_SYSTEM_ADDON
        if request.canvas_context and request.canvas_context.nodes:
            node_lines = "\n".join(
                "  [{}] {}: \"{}\"{}".format(
                    n.id,
                    n.type,
                    n.title,
                    f" ({len(n.rows)} rows)" if n.rows else (f" — \"{n.content[:40]}\"" if n.content else ""),
                )
                for n in request.canvas_context.nodes
            )
            system += f"\n\n### Current canvas nodes\n{node_lines}"
            if request.canvas_context.connections:
                conn_lines = "\n".join(
                    f"  {c.from_id} → {c.to_id}"
                    for c in request.canvas_context.connections
                )
                system += f"\n\n### Current connections\n{conn_lines}"

    if context_parts:
        system += "\n\n" + "\n\n".join(context_parts)

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    messages = [{"role": m.role, "content": m.content} for m in request.history]
    messages.append({"role": "user", "content": request.message})

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=system,
        messages=messages,
    )

    ai_text = response.content[0].text

    # Extract [CANVAS_NODES] block (adds new nodes)
    canvas_payload: schemas.CanvasNodesPayload | None = None
    canvas_match = re.search(r"\[CANVAS_NODES\](.*?)\[/CANVAS_NODES\]", ai_text, re.DOTALL)
    if canvas_match:
        try:
            raw = json.loads(canvas_match.group(1).strip())
            canvas_payload = schemas.CanvasNodesPayload(
                nodes=[schemas.CanvasNodeData(**n) for n in raw.get("nodes", [])],
                connections=[
                    schemas.CanvasConnectionData(**c) for c in raw.get("connections", [])
                ],
            )
            ai_text = re.sub(
                r"\s*\[CANVAS_NODES\].*?\[/CANVAS_NODES\]", "", ai_text, flags=re.DOTALL
            ).strip()
        except Exception:
            pass

    # Extract [CANVAS_OPS] block (edit/delete/connect existing nodes + add new)
    canvas_ops_payload: schemas.CanvasOpsPayload | None = None
    ops_match = re.search(r"\[CANVAS_OPS\](.*?)\[/CANVAS_OPS\]", ai_text, re.DOTALL)
    if ops_match:
        try:
            raw_ops = json.loads(ops_match.group(1).strip())
            canvas_ops_payload = schemas.CanvasOpsPayload(ops=raw_ops.get("ops", []))
            ai_text = re.sub(
                r"\s*\[CANVAS_OPS\].*?\[/CANVAS_OPS\]", "", ai_text, flags=re.DOTALL
            ).strip()
        except Exception:
            pass

    # Extract suggested usernames (users mentioned in relevant posts)
    suggested = list({p["author"] for p in relevant_posts if p["author"] != "Anonymous"})[:3]

    # Extract suggested blog posts (top relevant posts with a preview)
    suggested_posts = [
        schemas.SuggestedPost(
            post_id=p["post_id"],
            title=p["excerpt"][:60].replace("\n", " ").strip(),
            author=p["author"],
        )
        for p in relevant_posts[:3]
    ]

    return schemas.ChatResponse(
        message=ai_text,
        suggested_users=suggested,
        suggested_posts=suggested_posts,
        canvas_nodes=canvas_payload,
        canvas_ops=canvas_ops_payload,
    )
