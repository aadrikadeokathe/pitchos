import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

// ─── Coverage Areas ───────────────────────────────────────────────────────────
export const COVERAGE_AREAS = {
  PROBLEM: {
    id: 'PROBLEM',
    name: 'Problem Clarity',
    description: 'Is the pain point real, specific, and validated? Who suffers from it?',
  },
  MARKET: {
    id: 'MARKET',
    name: 'Market Sizing Logic',
    description: 'Does the TAM/SAM/SOM logic hold? Are numbers sourced and realistic?',
  },
  SOLUTION: {
    id: 'SOLUTION',
    name: 'Solution Differentiation',
    description: 'Is the solution unique? Why can\'t an incumbent just copy this?',
  },
  BUSINESS_MODEL: {
    id: 'BUSINESS_MODEL',
    name: 'Revenue Logic',
    description: 'What are the unit economics? CAC vs LTV? Pricing strategy?',
  },
  GTM: {
    id: 'GTM',
    name: 'Go-To-Market Strategy',
    description: 'Who are the first 100 customers and how do you acquire them?',
  },
  TRACTION: {
    id: 'TRACTION',
    name: 'Traction & Validation',
    description: 'What evidence proves people want this? Growth metrics?',
  },
  TEAM: {
    id: 'TEAM',
    name: 'Team-Market Fit',
    description: 'Why is THIS team the right one to solve this problem?',
  },
  COMPETITION: {
    id: 'COMPETITION',
    name: 'Competitive Moat',
    description: 'What stops a well-funded competitor from winning?',
  },
  ASK: {
    id: 'ASK',
    name: 'The Ask',
    description: 'What exactly is this money for? Is the ask sized correctly?',
  },
};

// ─── 1. Slide Segmentation ────────────────────────────────────────────────────
export async function segmentSlides(fullText) {
  const prompt = `You are an expert at analyzing startup pitch decks.

Below is the extracted text of a pitch deck PDF. Your task is to intelligently segment it into logical slides.

Rules:
- Each slide should represent one coherent section of the pitch (e.g., Problem, Solution, Market, Team)
- If a slide has no clear title, infer a descriptive title from its content
- Ignore header/footer text, page numbers, and decorative elements
- Each slide's rawText should be clean and complete

Return a JSON array of slides in this exact format:
[
  { "index": 1, "title": "Problem", "rawText": "..." },
  { "index": 2, "title": "Market Size", "rawText": "..." },
  ...
]

Return ONLY the JSON array, no markdown, no explanation.

PITCH DECK TEXT:
${fullText}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(cleaned);
}

// ─── 2. Slide Analysis ────────────────────────────────────────────────────────
export async function analyzeSlide(slide) {
  const areaList = Object.values(COVERAGE_AREAS)
    .map((a) => `${a.id}: ${a.name} — ${a.description}`)
    .join('\n');

  const prompt = `You are a partner-level VC and product strategist evaluating a startup pitch deck slide-by-slide.

Slide Title: "${slide.title}"
Slide Content:
${slide.rawText}

Evaluate this slide using a rigorous VC/PM framework. Be specific, not generic.

Coverage Area Mapping — assign this slide to the SINGLE most relevant area from:
${areaList}

If the slide doesn't clearly map to any area, assign "PROBLEM" as default.

Return a JSON object in this EXACT format (no markdown, no explanation, raw JSON only):
{
  "slideType": "Problem|Market|Solution|Business Model|Traction|Team|Competition|GTM|Ask|Other",
  "areaId": "PROBLEM|MARKET|SOLUTION|BUSINESS_MODEL|GTM|TRACTION|TEAM|COMPETITION|ASK",
  "score": <1-5 integer>,
  "verdict": "Strong|Solid|Weak|Critical Gap",
  "issues": ["specific issue 1", "specific issue 2"],
  "suggestions": ["specific suggestion 1", "specific suggestion 2"]
}

Scoring rubric:
5 = Investor-ready, no gaps
4 = Solid with minor gaps
3 = Passable but raises questions
2 = Weak, significant gaps
1 = Critical gap, would kill a pitch

Be honest and specific. Vague praise is useless.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(cleaned);
}

// ─── 3. QA Question Generator ─────────────────────────────────────────────────
export async function generateQAQuestion(session, area, conversationHistory) {
  const areaInfo = COVERAGE_AREAS[area.areaId];
  const historyText = conversationHistory.length
    ? conversationHistory
        .map((m) => `${m.role === 'ai' ? 'VC' : 'Founder'}: ${m.content}`)
        .join('\n')
    : 'No previous exchange on this topic.';

  const slideContext = session.slides
    .filter((s) => s.analysis?.areaId === area.areaId)
    .map((s) => `Slide "${s.title}" (Score: ${s.analysis.score}/5): ${s.analysis.issues.join('; ')}`)
    .join('\n') || `Area: ${areaInfo.name} — no specific slide found but this area needs coverage.`;

  const prompt = `You are a tough but fair partner-level VC conducting a live pitch Q&A.
You are currently probing the founder on: ${areaInfo.name}

Context from their pitch deck:
${slideContext}

Previous conversation on this topic:
${historyText}

Your task: Ask ONE sharp, specific follow-up question about the weakest point in this area.
Rules:
- ONE question only
- Do NOT repeat a question already asked
- Be incisive but not cruel — you want them to succeed
- Reference specifics from their deck or their previous answers
- The question should expose an assumption they haven't proven

Return ONLY the question text, no quotes, no explanation.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

// ─── 4. QA Answer Evaluator ───────────────────────────────────────────────────
export async function evaluateAnswer(area, question, answer, conversationHistory) {
  const areaInfo = COVERAGE_AREAS[area.areaId];

  const prompt = `You are a partner-level VC evaluating a founder's answer during a pitch Q&A.

Area being evaluated: ${areaInfo.name}
Focus: ${areaInfo.description}

VC Question: "${question}"
Founder's Answer: "${answer}"

Evaluate whether this answer ACTUALLY addresses the concern or just deflects.

Return a JSON object in this EXACT format (raw JSON only, no markdown):
{
  "verdict": "COVERED|PARTIAL|INSUFFICIENT",
  "feedback": "Brief 1-2 sentence evaluation — what was good, what was missing",
  "pushback": "If PARTIAL or INSUFFICIENT, one sharp follow-up challenge. If COVERED, empty string."
}

Verdict guide:
- COVERED: The founder demonstrated genuine understanding and gave specific, credible evidence
- PARTIAL: They touched on it but left a key assumption unproven
- INSUFFICIENT: They deflected, gave generic answers, or showed they haven't thought this through

Be honest. Flattery helps no one.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(cleaned);
}

// ─── 5. Report Generator ──────────────────────────────────────────────────────
export async function generatePriorityActions(session) {
  const slidesSummary = session.slides
    .map((s) => `${s.title} (Score: ${s.analysis?.score}/5, Verdict: ${s.analysis?.verdict}): Issues — ${(s.analysis?.issues || []).join('; ')}`)
    .join('\n');

  const prompt = `You are a senior VC giving a founder their final debrief after reviewing their pitch deck.

Slides summary:
${slidesSummary}

Generate a prioritized action list — the top 5 most important things this founder MUST fix before their next investor meeting.
Order by impact. Be specific, not generic.

Return a JSON array (raw JSON only):
[
  { "priority": 1, "area": "Market", "action": "Specific action to take", "why": "Why this matters most" },
  ...
]`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(cleaned);
}
