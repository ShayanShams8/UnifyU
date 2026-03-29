from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..security import get_current_student
from ..config import get_settings
import anthropic
import httpx

router = APIRouter(prefix="/financials", tags=["financials"])
settings = get_settings()

COMMON_CURRENCIES = [
    "USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CNY", "INR",
    "IRR", "AED", "SAR", "KRW", "BRL", "MXN", "CHF", "SGD",
    "HKD", "NOK", "SEK", "DKK", "PLN", "TRY", "ZAR", "NZD",
    "EGP", "PKR", "BDT", "VND", "THB", "MYR", "IDR", "PHP",
]


@router.get("/currencies")
async def get_currencies(
    _: models.Student = Depends(get_current_student),
):
    return {"currencies": COMMON_CURRENCIES}


@router.post("/convert", response_model=schemas.CurrencyConvertOut)
async def convert_currency(
    data: schemas.CurrencyConvertRequest,
    _: models.Student = Depends(get_current_student),
):
    """Convert currency using open.er-api.com (free, no key required)."""
    from_cur = data.from_currency.upper()
    to_cur = data.to_currency.upper()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"https://open.er-api.com/v6/latest/{from_cur}",
                headers={"User-Agent": settings.reddit_user_agent},
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=503, detail="Exchange rate service unavailable")
            payload = resp.json()
            rates = payload.get("rates", {})
            rate = rates.get(to_cur)
            if rate is None:
                raise HTTPException(status_code=400, detail=f"Currency '{to_cur}' not supported")
            converted = round(data.amount * rate, 2)
            return schemas.CurrencyConvertOut(
                from_currency=from_cur,
                to_currency=to_cur,
                amount=data.amount,
                converted=converted,
                rate=rate,
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=503, detail="Exchange rate service timed out")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Currency conversion error: {str(e)}")


def _claude_client():
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=503, detail="AI service not configured")
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


@router.post("/funding-gap", response_model=schemas.FundingGapOut)
async def calculate_funding_gap(
    data: schemas.FundingGapRequest,
    _: models.Student = Depends(get_current_student),
):
    """Calculate funding gap and provide actionable recommendations."""
    client = _claude_client()

    gap = data.coa - data.guaranteed_aid - data.likely_aid - data.user_resources
    gap = max(0.0, gap)

    prompt = f"""You are a financial aid expert for international students.
A student needs help with their funding gap analysis:

School: {data.school_name or "Not specified"}
Program: {data.program or "Not specified"}
Cost of Attendance (COA): ${data.coa:,.0f}/year
Guaranteed Aid: ${data.guaranteed_aid:,.0f}/year
Likely/Expected Aid: ${data.likely_aid:,.0f}/year
Student Resources: ${data.user_resources:,.0f}/year
Calculated Funding Gap: ${gap:,.0f}/year

Provide:
1. A brief analysis of the funding situation (2-3 sentences)
2. Top 5 specific, actionable steps to close this gap (numbered list)
3. A list of 3-5 scholarship types this student should search for
4. Key warning about common mistakes (1-2 sentences)

Keep it concise, practical, and encourage the student. Format with clear headers."""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=800,
        messages=[{"role": "user", "content": prompt}],
    )
    analysis = response.content[0].text

    return schemas.FundingGapOut(
        coa=data.coa,
        guaranteed_aid=data.guaranteed_aid,
        likely_aid=data.likely_aid,
        user_resources=data.user_resources,
        gap=gap,
        analysis=analysis,
    )


@router.post("/scholarships", response_model=schemas.ScholarshipSearchOut)
async def search_scholarships(
    data: schemas.ScholarshipSearchRequest,
    _: models.Student = Depends(get_current_student),
):
    """AI-powered scholarship search for international students."""
    client = _claude_client()

    prompt = f"""You are a scholarship expert for international students studying in the US.

Search criteria:
- Query: {data.query}
- Country of Origin: {data.country_of_origin or "International (any)"}
- Field of Study: {data.field_of_study or "Any field"}
- Degree Level: {data.degree_level or "Any level"}

Provide a structured list of 6-8 real, relevant scholarships and grants. For each, include:
- Name
- Brief description (1-2 sentences)
- Estimated amount or range
- Key eligibility requirements
- Application deadline pattern (e.g., "typically October-January")
- Where to find it (general search terms or official body, NOT made-up URLs)
- Whether it stacks with other aid (Yes/No/Conditional)

Focus on legitimate, established programs. Include a mix of:
- Federal/government programs
- University-based scholarships
- Private foundations
- Country-specific scholarships

End with 2-3 tips for maximizing scholarship success for international students.

Format clearly with numbered scholarships."""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1200,
        messages=[{"role": "user", "content": prompt}],
    )

    return schemas.ScholarshipSearchOut(
        query=data.query,
        results=response.content[0].text,
    )


@router.post("/scam-check", response_model=schemas.ScamCheckOut)
async def check_scam(
    data: schemas.ScamCheckRequest,
    _: models.Student = Depends(get_current_student),
):
    """Analyze a scholarship or financial offer for scam indicators."""
    client = _claude_client()

    prompt = f"""You are a financial scam detection expert protecting international students.

Scholarship/Offer to analyze:
Name: {data.scholarship_name}
Description: {data.description}
Source URL: {data.source_url or "Not provided"}

Evaluate this offer for scam indicators. The FTC has documented that scholarship scams often:
- Claim students were "selected" without applying
- Charge fees to apply or receive money
- Have vague eligibility or contact information
- Pressure for immediate action
- Request sensitive personal information upfront

Provide:
1. TRUST SCORE: Rate 1-10 (10 = very trustworthy, 1 = almost certainly a scam)
2. RED FLAGS: List any warning signs found (or "None detected")
3. POSITIVE INDICATORS: List legitimacy signals (or "None found")
4. VERDICT: Brief conclusion (1-2 sentences)
5. RECOMMENDED ACTION: What the student should do next

Be direct. If it looks like a scam, say so clearly."""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=600,
        messages=[{"role": "user", "content": prompt}],
    )

    text = response.content[0].text
    # Parse trust score from response
    trust_score = 5
    for line in text.split("\n"):
        if "trust score" in line.lower() or "score:" in line.lower():
            import re
            nums = re.findall(r"\b([1-9]|10)\b", line)
            if nums:
                trust_score = int(nums[0])
                break

    return schemas.ScamCheckOut(
        scholarship_name=data.scholarship_name,
        trust_score=trust_score,
        analysis=text,
    )


@router.post("/appeal", response_model=schemas.AppealOut)
async def generate_appeal(
    data: schemas.AppealRequest,
    _: models.Student = Depends(get_current_student),
):
    """Generate a financial aid appeal letter draft."""
    client = _claude_client()

    prompt = f"""You are an expert in financial aid appeals for international students.

Student situation:
- School: {data.school_name}
- Current Aid Package: ${data.current_aid:,.0f}/year
- Aid Type to Appeal: {data.aid_type}
- Special Circumstances: {data.circumstances}

Generate:
1. A professional appeal letter draft (ready to customize and send)
2. A checklist of supporting documents to include
3. Key tips for submitting this appeal

The letter should:
- Be warm but professional
- Specifically reference the school by name
- Clearly explain the circumstances without being dramatic
- Make a specific, reasonable ask
- Express commitment to academic success

Format: Letter first, then document checklist, then tips."""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1200,
        messages=[{"role": "user", "content": prompt}],
    )

    return schemas.AppealOut(
        school_name=data.school_name,
        draft=response.content[0].text,
    )


@router.post("/emergency", response_model=schemas.EmergencyResourcesOut)
async def get_emergency_resources(
    data: schemas.EmergencyRequest,
    _: models.Student = Depends(get_current_student),
):
    """Route student to emergency funding resources based on their situation."""
    client = _claude_client()

    prompt = f"""You are an emergency financial advisor for college students facing hardship.

Student situation:
- School: {data.school_name or "Not specified"}
- Emergency Type: {data.emergency_type}
- Urgency: {data.urgency} (high/medium/low)
- Additional context: {data.context or "None provided"}

Provide an emergency resource guide including:

1. IMMEDIATE ACTIONS (within 24-48 hours): 2-3 steps the student can take RIGHT NOW
2. ON-CAMPUS RESOURCES: Types of resources typically available at US colleges (emergency funds, food pantries, housing assistance, counseling)
3. GOVERNMENT/PUBLIC BENEFITS: Programs that may apply (SNAP, utility assistance, etc. - note eligibility varies)
4. COMMUNITY RESOURCES: Types of local nonprofits and community organizations to look for
5. PRIVACY NOTE: What personal information they should and should not share when seeking help

Emphasize: The student is NOT alone. Many students face these challenges. Seeking help is a sign of strength.
Note: Students should verify current availability of resources with their school's financial aid or student services office."""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=900,
        messages=[{"role": "user", "content": prompt}],
    )

    return schemas.EmergencyResourcesOut(
        emergency_type=data.emergency_type,
        resources=response.content[0].text,
    )


@router.post("/proof-of-funds", response_model=schemas.ProofOfFundsOut)
async def proof_of_funds_plan(
    data: schemas.ProofOfFundsRequest,
    _: models.Student = Depends(get_current_student),
):
    """Generate an international proof-of-funds plan for F-1/J-1 visa."""
    client = _claude_client()

    prompt = f"""You are an international student visa financial advisor.

Student situation:
- Visa Type: {data.visa_type} (F-1 or J-1)
- School: {data.school_name or "Not specified"}
- Annual COA: ${data.annual_coa:,.0f}
- Duration: {data.duration_years} year(s)
- Current Funds Available: ${data.current_funds:,.0f}
- Country of Origin: {data.country_of_origin or "Not specified"}

Total funds needed for I-20/DS-2019: approximately ${data.annual_coa * data.duration_years:,.0f}
Current gap: ${max(0, data.annual_coa * data.duration_years - data.current_funds):,.0f}

Provide a comprehensive proof-of-funds plan:

1. REQUIRED AMOUNT: What the school typically requires as evidence
2. ACCEPTABLE DOCUMENTS: Types of financial documents that work (bank statements, scholarship letters, sponsor letters, etc.)
3. DOCUMENT PREPARATION CHECKLIST: Specific steps to gather and prepare documents
4. TIMELINE: When to prepare each document relative to I-20 request and visa interview
5. SPONSOR LETTER GUIDE: If using a financial sponsor, what their letter must include
6. COMMON MISTAKES: 3-4 things that commonly cause delays or rejections
7. GAP STRATEGY: If there's a funding gap, options to consider

Note: Requirements vary by school. Always verify with your school's international student office."""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1100,
        messages=[{"role": "user", "content": prompt}],
    )

    total_needed = data.annual_coa * data.duration_years
    gap = max(0.0, total_needed - data.current_funds)

    return schemas.ProofOfFundsOut(
        visa_type=data.visa_type,
        total_needed=total_needed,
        gap=gap,
        plan=response.content[0].text,
    )
