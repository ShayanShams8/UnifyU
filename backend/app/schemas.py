from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────────────────────

class StudentCreate(BaseModel):
    name: str
    userName: str
    email: str = ""
    password: str
    isShowName: bool = False
    timezone: str = "UTC"
    linkedin: str = ""

    @field_validator("userName")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Username cannot be empty")
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters")
        return v


class StudentLogin(BaseModel):
    userName: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class StudentOut(BaseModel):
    id: int
    name: str
    userName: str
    pfp: Optional[str]
    isShowName: bool
    isAdmin: bool
    timezone: str
    linkedin: Optional[str] = None
    email: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    isShowName: Optional[bool] = None
    timezone: Optional[str] = None
    linkedin: Optional[str] = None
    email: Optional[str] = None
    push_token: Optional[str] = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class PublicProfileOut(BaseModel):
    userName: str
    name: Optional[str] = None
    pfp: Optional[str] = None
    linkedin: Optional[str] = None
    email: Optional[str] = None


# ── Posts ─────────────────────────────────────────────────────────────────────

class PostCreate(BaseModel):
    content: str
    title: str = ""
    parent: Optional[int] = None
    isAnonymous: bool = False


class PostOut(BaseModel):
    id: int
    author: int
    path: str
    parent: Optional[int]
    likes: int
    isAnonymous: bool
    created_at: datetime
    # Enriched fields (populated at query time)
    author_name: Optional[str] = None
    author_username: Optional[str] = None
    author_pfp: Optional[str] = None
    content: Optional[str] = None
    title: Optional[str] = None
    comment_count: int = 0
    liked_by_me: bool = False

    class Config:
        from_attributes = True


class CommentWithReplies(PostOut):
    replies: List["PostOut"] = []


class PostDetail(PostOut):
    comments: List[CommentWithReplies] = []


# ── AI ────────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class CanvasNodeCtx(BaseModel):
    id: str
    type: str
    title: str
    content: str = ""
    rows: Optional[List[dict]] = None


class CanvasConnCtx(BaseModel):
    id: str
    from_id: str
    to_id: str


class CanvasCtxPayload(BaseModel):
    nodes: List[CanvasNodeCtx] = []
    connections: List[CanvasConnCtx] = []


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    financials_mode: bool = False  # kept for backwards compat
    active_tools: List[str] = []
    canvas_mode: bool = False
    canvas_context: Optional[CanvasCtxPayload] = None


class CanvasNodeData(BaseModel):
    type: str
    title: str
    content: str = ""
    rows: Optional[List[dict]] = None


class CanvasConnectionData(BaseModel):
    from_index: int
    to_index: int


class CanvasNodesPayload(BaseModel):
    nodes: List[CanvasNodeData] = []
    connections: List[CanvasConnectionData] = []


class CanvasOpsPayload(BaseModel):
    ops: List[dict] = []


class SuggestedPost(BaseModel):
    post_id: int
    title: str
    author: str


class ChatResponse(BaseModel):
    message: str
    suggested_users: List[str] = []
    suggested_posts: List[SuggestedPost] = []
    canvas_nodes: Optional[CanvasNodesPayload] = None
    canvas_ops: Optional[CanvasOpsPayload] = None


# ── Canvas State ──────────────────────────────────────────────────────────────

class CanvasStateIn(BaseModel):
    nodes_json: str
    connections_json: str


class CanvasStateOut(BaseModel):
    nodes_json: str
    connections_json: str
    has_saved: bool = False


# ── Admin ─────────────────────────────────────────────────────────────────────

class AdminStats(BaseModel):
    total_users: int
    total_posts: int
    total_comments: int


# ── Financials ────────────────────────────────────────────────────────────────

class CurrencyConvertRequest(BaseModel):
    amount: float
    from_currency: str
    to_currency: str


class CurrencyConvertOut(BaseModel):
    from_currency: str
    to_currency: str
    amount: float
    converted: float
    rate: float


class FundingGapRequest(BaseModel):
    coa: float
    guaranteed_aid: float = 0.0
    likely_aid: float = 0.0
    user_resources: float = 0.0
    school_name: str = ""
    program: str = ""


class FundingGapOut(BaseModel):
    coa: float
    guaranteed_aid: float
    likely_aid: float
    user_resources: float
    gap: float
    analysis: str


class ScholarshipSearchRequest(BaseModel):
    query: str
    country_of_origin: str = ""
    field_of_study: str = ""
    degree_level: str = ""


class ScholarshipSearchOut(BaseModel):
    query: str
    results: str


class ScamCheckRequest(BaseModel):
    scholarship_name: str
    description: str
    source_url: str = ""


class ScamCheckOut(BaseModel):
    scholarship_name: str
    trust_score: int
    analysis: str


class AppealRequest(BaseModel):
    school_name: str
    current_aid: float
    circumstances: str
    aid_type: str = "merit"


class AppealOut(BaseModel):
    school_name: str
    draft: str


class EmergencyRequest(BaseModel):
    emergency_type: str
    urgency: str = "medium"
    school_name: str = ""
    context: str = ""


class EmergencyResourcesOut(BaseModel):
    emergency_type: str
    resources: str


class ProofOfFundsRequest(BaseModel):
    visa_type: str = "F-1"
    school_name: str = ""
    annual_coa: float
    duration_years: int = 1
    current_funds: float = 0.0
    country_of_origin: str = ""


class ProofOfFundsOut(BaseModel):
    visa_type: str
    total_needed: float
    gap: float
    plan: str
