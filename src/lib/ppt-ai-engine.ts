import {
  TechTalkSlide,
  ApiVaultConfig,
  IareMetadata,
  ContentDepth,
} from "@/types/ppt";

export interface GenerateTechTalkOptions {
  topic: string;
  details?: string;
  slideCount: number;
  presenterName?: string;
  collegeName?: string;
  eventName?: string;
  config: ApiVaultConfig;
  iareMetadata?: IareMetadata;
  contentDepth?: ContentDepth;
}

const SYSTEM_PROMPT = `You are a distinguished Engineering Professor and Principal Systems Architect at Institute of Aeronautical Engineering (IARE Autonomous).
Your objective is to generate an authoritative, college-seminar-grade, professional B.Tech AAT Tech Talk presentation with rigorous technical depth and academic excellence.
Every slide must contain substantive engineering explanations, concrete architectural mechanisms, mathematical/algorithmic formulation, and measurable performance trade-offs.
BANNING SHORT 1-LINE BULLETS, SUPERFICIAL SUMMARIES, OR GENERIC FILLER SENTENCES! Write like an engineering subject-matter expert preparing a student for a top-tier evaluative technical viva.

Return ONLY a valid JSON object with the root key "slides" containing an array of slide objects.
Do NOT include markdown fences, backticks, or explanatory preamble. Return pure JSON.

Slide Schema & Pedagogical Progression:
1. Slide 1 (Cover Slide):
   - "layout": "title"
   - "category": "[AAT - TECH TALK]"
   - "title": "Topic - [Topic Title]"
   - "subtitle": "Name: [Student Name] | Roll No: [Roll Number] | Branch: [Branch] | Subject: [Subject]"
2. Slide 2 (INDEX):
   - "layout": "index"
   - "title": "INDEX"
   - "category": "ROADMAP"
   - "bulletPoints": Exactly 8 numbered technical modules formatted in Title Case with two spaces after the period:
     e.g., ["1.  Core Theoretical Foundations", "2.  Architectural Framework & Data Flow", ..., "8.  Industrial Applications & Future Directions"]
3. Slide 3 (INTRODUCTION):
   - "layout": "paragraph"
   - "title": "INTRODUCTION"
   - "category": "DOMAIN OVERVIEW"
   - "paragraph": Strictly ONE cohesive, information-rich 5–6 sentence academic paragraph (~95–125 words, strictly prose, NO bullet points). Must cover foundational context, technical problem motivation, core working principles, practical engineering impact, and architectural scope.
4. Slides 4 to 11 (8 Core Technical Slides):
   - "layout": "bullets"
   - "title": ALL CAPS side-heading matching the corresponding INDEX module (e.g., "CORE THEORETICAL FOUNDATIONS & MATHEMATICAL FORMULATION")
   - "category": "CORE TECHNICAL MODULE"
   - "bulletPoints": Comprehensive technical bullet points (5 bullets for Detailed Tech Talk, 6 bullets for Extra Deep Technical). EVERY SINGLE BULLET MUST BE EXACTLY 2 FULL, INFORMATION-DENSE SENTENCES (~28–40 words per bullet):
     * Sentence 1 defines the core mechanism, architectural component, or mathematical/algorithmic intuition clearly.
     * Sentence 2 adds concrete technical depth—such as specific parameters, complexity/performance trade-offs, edge cases, or real-world engineering applications.
     * Strictly NO 1-line fragments, NO generic placeholders, NO bold prefixes like "Overview:" or "Benefit:".
5. Slide 12 (CONCLUSION):
   - "layout": "paragraph"
   - "title": "CONCLUSION"
   - "category": "SUMMARY & TAKEAWAYS"
   - "paragraph": Strictly ONE cohesive, information-rich 5–6 sentence academic summary paragraph (~95–125 words, strictly prose, NO bullet points) synthesizing core mechanisms, empirical trade-offs, performance gains, production lessons, and 2026+ future engineering directions.
6. Slide 13 (THANK YOU):
   - "layout": "thank-you"
   - "title": "THANK YOU"
   - "subtitle": "Questions & Discussion"
   - "category": "Q&A"

Every slide MUST include "speakerNotes": A detailed 4–5 sentence spoken stage explanation per slide written in articulate first-person spoken cadence, explaining the technical concepts, data structures, and trade-offs so the student can confidently explain every nuance during faculty evaluation and Q&A.`;

/**
 * Main AI Generation Orchestrator
 */
export async function generateTechTalkPresentation(
  options: GenerateTechTalkOptions
): Promise<TechTalkSlide[]> {
  const { config } = options;

  // 1. If BYOK Provider configured, use it first
  if (config.provider === "gemini" && config.geminiKey) {
    try {
      const slides = await callGemini(options);
      if (slides && slides.length > 0) return slides;
    } catch (err) {
      console.warn("Gemini generation failed, falling back to local synthesis:", err);
    }
  } else if (config.provider === "groq" && config.groqKey) {
    try {
      const slides = await callGroq(options);
      if (slides && slides.length > 0) return slides;
    } catch (err) {
      console.warn("Groq generation failed, falling back to local synthesis:", err);
    }
  } else if (config.provider === "openai" && config.openaiKey) {
    try {
      const slides = await callOpenAi(options);
      if (slides && slides.length > 0) return slides;
    } catch (err) {
      console.warn("OpenAI generation failed, falling back to local synthesis:", err);
    }
  } else if (config.provider === "openrouter" && config.openrouterKey) {
    try {
      const slides = await callOpenRouter(options);
      if (slides && slides.length > 0) return slides;
    } catch (err) {
      console.warn("OpenRouter generation failed, falling back to local synthesis:", err);
    }
  }

  // 2. Zero-key mode: try free public AI endpoint
  try {
    const slides = await callPollinations(options);
    if (slides && slides.length >= Math.min(8, options.slideCount - 2)) {
      return slides;
    }
  } catch (err) {
    console.warn("Zero-key cloud endpoint failed or offline, switching to deterministic synthesis:", err);
  }

  // 3. Fallback: Deep Client-Side Deterministic Tech-Talk Synthesis Engine
  return synthesizeTechTalkLocally(options);
}

// ============================================================================
// PROVIDER IMPLEMENTATIONS (Min 4096 Tokens Output Budget)
// ============================================================================

async function callGemini(options: GenerateTechTalkOptions): Promise<TechTalkSlide[]> {
  const apiKey = options.config.geminiKey;
  const prompt = buildUserPrompt(options);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `${SYSTEM_PROMPT}\n\nTask:\n${prompt}` }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API Error: ${res.status} - ${errorText}`);
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return parseSlidesFromJson(rawText, options);
}

async function callGroq(options: GenerateTechTalkOptions): Promise<TechTalkSlide[]> {
  const apiKey = options.config.groqKey;
  const prompt = buildUserPrompt(options);

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) throw new Error(`Groq API Error: ${res.status}`);
  const data = await res.json();
  const rawText = data.choices?.[0]?.message?.content;
  return parseSlidesFromJson(rawText, options);
}

async function callOpenAi(options: GenerateTechTalkOptions): Promise<TechTalkSlide[]> {
  const apiKey = options.config.openaiKey;
  const prompt = buildUserPrompt(options);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI API Error: ${res.status}`);
  const data = await res.json();
  const rawText = data.choices?.[0]?.message?.content;
  return parseSlidesFromJson(rawText, options);
}

async function callOpenRouter(options: GenerateTechTalkOptions): Promise<TechTalkSlide[]> {
  const apiKey = options.config.openrouterKey;
  const model = options.config.customModelId || "meta-llama/llama-3.3-70b-instruct";
  const prompt = buildUserPrompt(options);

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter API Error: ${res.status}`);
  const data = await res.json();
  const rawText = data.choices?.[0]?.message?.content;
  return parseSlidesFromJson(rawText, options);
}

async function callPollinations(options: GenerateTechTalkOptions): Promise<TechTalkSlide[]> {
  const prompt = buildUserPrompt(options);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);

  try {
    const res = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        jsonMode: true,
        model: "openai",
        seed: Math.floor(Math.random() * 1000000),
      }),
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`Pollinations HTTP Error: ${res.status}`);
    const rawText = await res.text();
    return parseSlidesFromJson(rawText, options);
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// ============================================================================
// PROMPT BUILDER & PARSER
// ============================================================================

function buildUserPrompt(options: GenerateTechTalkOptions): string {
  const isIare = options.iareMetadata?.isIareMode;
  const iare = options.iareMetadata;
  const depth = options.contentDepth || "detailed";
  const bulletsPerSlide = depth === "extra-deep" ? 6 : 5;

  if (isIare && iare) {
    const totalSlides = options.slideCount || 13;
    const coreCount = Math.max(5, totalSlides - 5);

    return `Generate an official Institute of Aeronautical Engineering (IARE Autonomous) academic presentation for:
Topic: "${options.topic}"
Assessment Type: "${iare.assessmentType || "AAT - TECH TALK"}"
Student Name: "${iare.studentName}"
Roll Number: "${iare.rollNumber}"
Branch: "${iare.department}"
Subject: "${iare.subject || iare.courseName || ""}"
Reference Notes / Syllabus / Abstract: "${options.details || "Comprehensive technical overview"}"
Content Depth: "${depth === "extra-deep" ? "Extra Deep Technical (6 Dense 2-Sentence Bullets)" : "Detailed Tech Talk (5 Dense 2-Sentence Bullets)"}"
Target Slide Count: Exactly ${totalSlides} slides (Numbered 1 to ${totalSlides})

Follow the EXACT IARE "AAT - TECH TALK" structure:
1. Slide 1 (Cover Slide):
   - layout: "title"
   - category: "${(iare.assessmentType || "AAT - TECH TALK").toUpperCase()}"
   - title: "Topic - ${options.topic}"
   - subtitle: "Name: ${iare.studentName} | Roll No: ${iare.rollNumber} | Branch: ${iare.department} | Subject: ${iare.subject || iare.courseName || ""}"

2. Slide 2 (INDEX):
   - layout: "index"
   - title: "INDEX"
   - category: "ROADMAP"
   - bulletPoints: Exactly ${coreCount} numbered titles matching the core slides in Title Case with two spaces after period! (e.g. ["1.  Core Theoretical Foundations", "2.  Architectural Mechanisms & Pipelines", ..., "${coreCount}.  Applications & Future Directions"])

3. Slide 3 (INTRODUCTION):
   - layout: "paragraph"
   - title: "INTRODUCTION"
   - category: "DOMAIN OVERVIEW"
   - paragraph: Strictly ONE cohesive, information-rich 5–6 sentence academic prose paragraph (~95–125 words, strictly NO bullet points) defining the domain, motivating the architectural problem space, detailing core working mechanisms, highlighting engineering impact, and stating scope.

4. Slides 4 to ${totalSlides - 2} (${coreCount} Core Technical Slides):
   - layout: "bullets"
   - title: Formatted in ALL CAPS matching the corresponding INDEX item (e.g., "CORE THEORETICAL FOUNDATIONS & MATHEMATICAL FORMULATION", "PRIMARY ARCHITECTURAL PIPELINES & DATA FLOW")
   - category: "CORE TECHNICAL MODULE"
   - bulletPoints: Exactly ${bulletsPerSlide} comprehensive technical bullet points per slide. EVERY SINGLE BULLET MUST BE EXACTLY 2 FULL, INFORMATION-DENSE SENTENCES (~28–40 words per bullet):
     * Sentence 1 defines the core mechanism, architectural component, or mathematical/algorithmic intuition clearly.
     * Sentence 2 adds concrete technical depth—such as specific parameters, complexity/performance trade-offs, edge cases, or real-world engineering applications.
     * Banning short 1-line fragments or generic filler sentences.

5. Slide ${totalSlides - 1} (CONCLUSION):
   - layout: "paragraph"
   - title: "CONCLUSION"
   - category: "SUMMARY & TAKEAWAYS"
   - paragraph: Strictly ONE cohesive, information-rich 5–6 sentence academic summary paragraph (~95–125 words, strictly NO bullet points) synthesizing core mechanisms, empirical trade-offs, performance gains, production lessons, and 2026+ future engineering directions.

6. Slide ${totalSlides} (THANK YOU):
   - layout: "thank-you"
   - title: "THANK YOU"
   - subtitle: "Questions & Discussion"
   - category: "Q&A"

Ensure EVERY single slide includes 4–5 complete, articulate conversational sentences in "speakerNotes" explaining what the student should say verbally on stage to the faculty evaluators.`;
  }

  return `Generate an academic college tech-talk presentation for:
Topic: "${options.topic}"
Reference Notes / Syllabus / Abstract: "${options.details || "Comprehensive technical overview"}"
Presenter: "${options.presenterName || "Student Presenter"}"
Department / College: "${options.collegeName || "Dept. of Computer Science & Engineering"}"
Event: "${options.eventName || "Annual Tech Seminar 2026"}"
Target Slide Count: Exactly ${options.slideCount} slides (Numbered 1 to ${options.slideCount})
Content Depth: "${depth === "extra-deep" ? "Extra Deep Technical (6 Dense Bullets)" : "Detailed Tech Talk (5 Dense Bullets)"}"

Structure the deck with rich technical depth:
1. Title & Presenter Cover
2. Agenda & Executive Architecture
3. Problem Statement & Existing Limitations
4. Foundational Principles & Theory
5. System Architecture / Flowchart
6. Algorithmic / Cryptographic / Engine Mechanism
7. Implementation Code / Protocol Structure
8. Benchmark Metrics & Quantitative Results
9. Comparison Table (Traditional vs Proposed)
10. Limitations & Production Tradeoffs
11. 2026+ Future Scope & Trends
12. Key Takeaways, Summary & References

Every bullet point must be 2 full, information-dense technical sentences (~28-40 words). Every slide has 4-5 sentence stage speakerNotes explaining what to say verbally to the audience.`;
}

function parseSlidesFromJson(
  rawText: string | undefined,
  options: GenerateTechTalkOptions
): TechTalkSlide[] {
  if (!rawText) throw new Error("Empty response from AI engine");

  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  const parsed = JSON.parse(cleaned);
  let slidesArray: (TechTalkSlide & { content?: string })[] = [];

  if (Array.isArray(parsed)) {
    slidesArray = parsed;
  } else if (parsed && Array.isArray(parsed.slides)) {
    slidesArray = parsed.slides;
  } else {
    throw new Error("Invalid slides JSON structure");
  }

  const iare = options.iareMetadata;
  const isIare = Boolean(iare?.isIareMode);

  return slidesArray.map((s, idx) => {
    let layout = s.layout || "two-column";
    if (idx === 0) layout = "title";
    else if (idx === 1 && (s.title.toLowerCase().includes("index") || s.title.toLowerCase().includes("agenda"))) layout = "index";
    else if (idx === 2 && s.title.toLowerCase().includes("intro")) layout = "paragraph";
    else if (idx === slidesArray.length - 2 && s.title.toLowerCase().includes("conclu")) layout = "paragraph";
    else if (idx === slidesArray.length - 1 && (s.title.toLowerCase().includes("thank") || s.title.toLowerCase().includes("q&a"))) layout = "thank-you";
    else if (!s.layout) layout = "bullets";

    const paragraph = s.paragraph || s.content;

    return {
      id: s.id || `slide-${idx + 1}`,
      slideNumber: idx + 1,
      layout,
      title: s.title || `Slide ${idx + 1}`,
      subtitle: s.subtitle,
      category: s.category || (isIare ? iare?.assessmentType || "AAT - TECH TALK" : "TECH TALK"),
      bulletPoints: s.bulletPoints,
      paragraph,
      columns: s.columns,
      cards: s.cards,
      processSteps: s.processSteps,
      table: s.table,
      codeSnippet: s.codeSnippet,
      metric: s.metric,
      speakerNotes:
        s.speakerNotes ||
        `On this slide, we examine key technical and architectural mechanisms of ${options.topic}. Notice how the data models and algorithmic pipelines maintain high throughput while strictly conforming to Course Outcome attainment standards. We also observe how parameter fine-tuning stabilizes runtime execution under volatile workloads.`,
    };
  });
}

// ============================================================================
// IARE OFFICIAL 13-SLIDE AAT TECH-TALK SYNTHESIS ENGINE (ZERO-KEY FALLBACK)
// ============================================================================

export function toTitleCase(str: string): string {
  return str
    .replace(/^\d+\.\s*/, "")
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ")
    .replace(/: [a-z]/g, (m) => m.toUpperCase())
    .replace(/& [a-z]/g, (m) => m.toUpperCase())
    .replace(/\bAi\b/g, "AI")
    .replace(/\bMl\b/g, "ML")
    .replace(/\bCpu\b/g, "CPU")
    .replace(/\bGpu\b/g, "GPU")
    .replace(/\bNpu\b/g, "NPU")
    .replace(/\bVs\b/g, "vs.")
    .replace(/\bIot\b/g, "IoT")
    .replace(/\bIare\b/g, "IARE");
}

export function synthesizeIarePresentation(options: GenerateTechTalkOptions): TechTalkSlide[] {
  const { topic, details, slideCount, iareMetadata, contentDepth } = options;
  const titleTopic = topic.trim() || "Technical Presentation";
  const assessment = iareMetadata?.assessmentType || "AAT - TECH TALK";
  const studentName = iareMetadata?.studentName?.trim() || options.presenterName?.trim() || "Student";
  const rollNo = iareMetadata?.rollNumber?.trim() || "";
  const branch = iareMetadata?.department?.trim() || "";
  const subject = iareMetadata?.subject?.trim() || iareMetadata?.courseName?.trim() || "";
  const depth = contentDepth || "detailed";
  const bulletsTarget = depth === "extra-deep" ? 6 : 5;

  const totalSlides = slideCount || 13;
  const coreCount = Math.max(5, totalSlides - 5); // Default 8 core slides for 13-slide deck

  const lower = (titleTopic + " " + (details || "") + " " + branch + " " + subject).toLowerCase();

  const isEnsemble =
    lower.includes("bagg") ||
    lower.includes("boost") ||
    lower.includes("ensembl") ||
    lower.includes("random forest") ||
    lower.includes("adaboost") ||
    lower.includes("xgboost") ||
    lower.includes("lightgbm") ||
    lower.includes("catboost") ||
    lower.includes("stacking");

  const isAiMl =
    isEnsemble ||
    lower.includes("ai") ||
    lower.includes("machine learn") ||
    lower.includes("neural") ||
    lower.includes("deep") ||
    lower.includes("llm") ||
    lower.includes("vision") ||
    lower.includes("transformer") ||
    lower.includes("attention") ||
    lower.includes("diffusion") ||
    lower.includes("gpt") ||
    lower.includes("cnn") ||
    lower.includes("rnn");

  const isCloudDistributed =
    lower.includes("cloud") ||
    lower.includes("distributed") ||
    lower.includes("kubernetes") ||
    lower.includes("k8s") ||
    lower.includes("microservice") ||
    lower.includes("kafka") ||
    lower.includes("docker") ||
    lower.includes("database") ||
    lower.includes("consensus") ||
    lower.includes("raft") ||
    lower.includes("paxos");

  const isCryptoSecurity =
    lower.includes("crypto") ||
    lower.includes("security") ||
    lower.includes("cipher") ||
    lower.includes("blockchain") ||
    lower.includes("zero knowledge") ||
    lower.includes("zk") ||
    lower.includes("privacy") ||
    lower.includes("vulnerability") ||
    lower.includes("hash");

  let domainField = "Computer Science and Engineering";
  if (isEnsemble || isAiMl) domainField = "Artificial Intelligence and Machine Learning";
  else if (isCloudDistributed) domainField = "Cloud Computing and Distributed Systems";
  else if (isCryptoSecurity) domainField = "Cybersecurity and Applied Cryptography";
  else if (branch) domainField = branch;

  // Generate 8 core technical slide titles in ALL CAPS
  let coreTitles: string[] = [];
  let coreBulletsMatrix: string[][] = [];

  if (isEnsemble) {
    coreTitles = [
      "CORE CONCEPTS: BAGGING AND ENSEMBLE LEARNING",
      "FIRST TECHNIQUE: BOOTSTRAP AGGREGATION (BAGGING)",
      "FINE-TUNING BAGGING & RANDOM FORESTS",
      "SECOND TECHNIQUE: SEQUENTIAL RESIDUAL LEARNING (BOOSTING)",
      "FINE-TUNING GRADIENT BOOSTING & REGULARIZATION",
      "BAGGING VS. BOOSTING: A COMPARATIVE ANALYSIS",
      "ADVANCED TECHNIQUES & HYBRID ENSEMBLE ARCHITECTURES",
      "INDUSTRIAL APPLICATIONS & FUTURE 2026+ HORIZONS",
    ];

    coreBulletsMatrix = [
      // 1. Core Concepts
      [
        "Ensemble learning strategically synthesizes multiple weak base learners into an integrated predictive hypothesis with provably superior generalization error bounds. The aggregate generalization error decomposes analytically into bias, variance, and irreducible noise through classical bias-variance decomposition formulations.",
        "Inductive bias is mitigated by projecting input feature distributions across diverse and complementary regions of the underlying hypothesis space. Individual base learner uncorrelated errors cancel out exponentially under unweighted and weighted majority voting schemes.",
        "Base estimators are trained over heterogeneous data splits to optimize the statistical diversity coefficient across candidate split partitions. By dampening sensitivity to sample perturbation, the collective ensemble achieves high stability across volatile non-stationary data regimes.",
        "The fundamental trade-off balances base model diversity against individual learner predictive capacity to avoid suboptimal aggregate convergence. Ensembles maintain theoretical dominance over standalone parametric estimators, especially when operating on noisy high-dimensional tabular datasets.",
        "Industrial benchmarks consistently confirm that well-regularized ensemble architectures outperform single deep networks on structured relational schemas. This theoretical resilience forms the foundation for mission-critical scoring pipelines deployed in financial underwriting and algorithmic risk assessment.",
        "Advanced validation schemes utilize out-of-fold predictions to evaluate multi-learner calibration without incurring data leakage. This guarantees that ensemble variance reduction translates faithfully to real-world out-of-distribution generalization.",
      ],
      // 2. Bagging
      [
        "Bootstrap aggregation draws B independent replacement subsets of size N uniformly from empirical training distributions via Poisson sampling approximations. This stochastic resampling mechanism generates pseudo-independent training distributions that preserve the underlying marginal feature statistics.",
        "Fully grown, unpruned high-variance decision trees are trained concurrently across partitioned subsets without inter-tree structural constraints. Aggregating individual low-bias predictions via arithmetic averaging systematically reduces total ensemble variance by a factor proportional to 1/B.",
        "Each bootstrap iteration leaves approximately 36.8% of observations unselected, forming the out-of-bag (OOB) evaluation partition. This mathematical property enables continuous, unbiased cross-validation error estimation during the training phase without holding out dedicated validation splits.",
        "Random Forests enhance traditional bagging by injecting randomized feature sub-sampling at every internal node partition. Selecting a random subset of size sqrt(p) decorrelates individual tree structures, driving pairwise inter-tree correlation toward zero.",
        "The decorrelation mechanism directly bounds the aggregate ensemble variance formula given by rho*sigma^2 + (1-rho)/B*sigma^2. By minimizing the pairwise correlation coefficient rho, Random Forests achieve near-optimal variance suppression without inflating bias.",
        "Parallelized execution pipelines scale linearly across multi-core CPUs and distributed compute clusters without memory contention. Memory-mapped data arrays and cache-aligned node structures maximize L3 cache hits during simultaneous multi-tree construction.",
      ],
      // 3. Fine-Tuning Bagging
      [
        "Hyperparameter optimization targets critical structural parameters including tree depth, minimum samples per leaf, and maximum feature split ratio. Restricting minimum leaf samples prevents individual trees from isolating label noise while maintaining expressive partition granularity.",
        "Subsample scaling ratios between 0.632 and 0.85 are calibrated alongside max_features to balance individual variance against base model accuracy. Grid search and Bayesian optimization with Gaussian processes traverse the multi-dimensional parameter space to identify optimal Pareto frontiers.",
        "Feature importance metrics decompose into Mean Decrease in Impurity (Gini importance) and Permutation Feature Importance. While MDI provides instantaneous evaluation, permutation importance calculates genuine predictive degradation on shuffled out-of-bag validation sets.",
        "Cost-complexity pruning coefficients (ccp_alpha) can be selectively applied to prune fragile terminal leaves across the forest. This structural regularization eliminates over-specialized branches and compresses memory footprints by up to 45% with negligible accuracy loss.",
        "TreeLite compilation and ONNX runtime integration transform trained decision paths into optimized C code and binary decision tables. This compilation pipeline reduces production inference latency to sub-microsecond levels suitable for high-frequency trading engines.",
        "Class imbalance mitigations introduce balanced bootstrap weights or stratified sub-sampling to maintain minority class sensitivity. Calibrating decision thresholds via cost-sensitive learning curves ensures optimal ROC-AUC and Precision-Recall trade-offs in fraud detection.",
      ],
      // 4. Boosting
      [
        "Boosting constructs an additive forward stagewise model where each successive base learner fits the pseudo-residuals of the prior ensemble. Unlike parallel bagging, boosting sequentially minimizes empirical training loss by prioritizing instances that exhibited large prediction errors.",
        "Adaptive Boosting (AdaBoost) dynamically scales observation weights exponentially based on classification errors computed at step t. Base estimators with lower weighted empirical error receive proportionally higher voting coefficients according to alpha_t = 0.5 * ln((1-epsilon_t)/epsilon_t).",
        "Gradient Boosting formalizes sequential learning as numerical optimization over arbitrary differentiable convex loss functions in function space. At each step, a shallow regression tree is fitted directly to the negative gradient vector of the specified loss objective.",
        "Steepest descent optimization in function space enables gradient boosting to support diverse objectives including MSE, Log-Loss, and Huber loss. The additive model iteratively drives training residuals toward zero while conforming to smooth functional step sizes.",
        "Weak learners in gradient boosting are constrained to shallow decision stumps or regression trees with typical depth between 3 and 8. These constrained learners systematically reduce bias without introducing the explosive variance characteristic of unpruned trees.",
        "Theoretical convergence proofs establish that gradient boosting achieves exponential loss decay under mild margin assumptions. This rapid bias reduction enables boosting to isolate subtle non-linear decision boundaries that linear models fail to detect.",
      ],
      // 5. Fine-Tuning Boosting
      [
        "Learning rate shrinkage (eta between 0.01 and 0.1) scales the contribution of each newly added tree to prevent optimization overshoot. Lower shrinkage rates require a proportionally higher number of estimators but consistently yield superior test-set generalization stability.",
        "Second-order Taylor approximations within XGBoost compute optimal leaf weights and split gain scores using exact gradients and hessians. Incorporating L1 (alpha) and L2 (lambda) leaf weight penalties explicitly penalizes extreme prediction values and controls model complexity.",
        "Histogram-based feature binning in LightGBM and CatBoost quantizes continuous variables into 256 discrete integer bins. This discretization reduces split-finding computational complexity from O(N*log N) to O(K) while dramatically reducing working memory footprint.",
        "Stochastic gradient boosting introduces row sub-sampling and column sub-sampling per tree and per split node. Injecting randomness into sequential iterations breaks gradient correlations, mimicking bagging regularization and accelerating training throughput.",
        "Early stopping criteria track loss metrics across an independent holdout validation split, halting training after P consecutive non-improving iterations. This automated safeguard terminates gradient steps prior to over-fitting, saving computational cycles and preserving generalization.",
        "Categorical feature handling via Ordered Target Statistics eliminates one-hot encoding dimensional explosion while guarding against target leakage. This specialized encoding preserves categorical hierarchy and enables seamless processing of high-cardinality metadata in production.",
      ],
      // 6. Comparative Analysis
      [
        "Bagging primarily reduces variance by averaging independent high-variance base learners, whereas boosting focuses on sequential bias reduction. Consequently, bagging is ideally suited for complex over-parameterized models, while boosting transforms simple constrained estimators into strong predictors.",
        "Computational architectures diverge fundamentally: bagging supports embarrassingly parallel multi-threaded training across CPU/GPU cores, while boosting requires sequential dependency chains. However, modern histogram algorithms allow boosting to achieve comparable training wall-clock times.",
        "Robustness to label noise reveals marked behavioral differences between the two paradigms under contaminated data distributions. Bagging demonstrates high resilience to outliers due to uniform averaging, whereas boosting can aggressively overfit mislabeled instances by assigning them exponential weights.",
        "Parameter sensitivity analysis indicates that Random Forests produce competitive baseline predictions with minimal hyperparameter tuning. In contrast, Gradient Boosted Decision Trees require careful calibration of learning rate, max_depth, and regularizers to realize peak performance.",
        "Model interpretability profiles differ across tree traversal paths and SHAP (SHapley Additive exPlanations) attribution calculations. TreeSHAP provides exact polynomial-time feature explanations for both architectures, though boosted trees typically exhibit crisper localized interaction effects.",
        "Empirical benchmarking across standard Kaggle and OpenML tabular datasets proves that gradient boosting achieves superior predictive accuracy. Random Forests, however, maintain superiority in streaming scenarios requiring rapid concurrent model retraining and low configuration overhead.",
      ],
      // 7. Advanced Techniques
      [
        "Stacking Generalization (Super Learner) trains a meta-classifier on out-of-fold probability vectors generated by heterogeneous base models. Combining decision trees, linear regularized models, and neural networks enables the meta-learner to discover optimal non-linear blending weights.",
        "Multi-layer stacking hierarchies introduce intermediate blending layers with feature pass-through connections to enrich meta-representation. Strict K-fold cross-validation isolation must be enforced during meta-feature generation to prevent catastrophic validation leakage.",
        "Differentiable decision tree architectures integrate smoothed soft split functions with backpropagation algorithms in PyTorch and JAX. This hybridization bridges classical tabular tree mechanics with end-to-end deep learning pipelines for multimodal data fusion.",
        "Neuro-tree ensemble networks combine convolutional or transformer embeddings with gradient boosted decision heads. The deep neural backbone extracts latent semantic representations while the boosting stage handles heterogeneous tabular metadata with optimal fidelity.",
        "Quantization and pruning techniques compress ensemble memory footprints, pruning up to 40% of trees that contribute negligible marginal gain. Compressing leaf precision from float32 to int8 reduces memory bandwidth bottlenecks during concurrent microservice scoring.",
        "Automated Machine Learning (AutoML) frameworks utilize Bayesian optimization with Hyperband scheduling to explore ensemble compositions dynamically. Automated feature synthesis, selector pruning, and stacking configuration converge on production-ready pipelines without manual trial-and-error.",
      ],
      // 8. Industrial Applications & Future Horizons
      [
        "Production deployments across algorithmic trading, real-time credit underwriting, and medical imaging diagnostics rely on ensemble architectures. Financial surveillance engines process millions of transactions per second, requiring sub-millisecond scoring latencies and rigorous auditability.",
        "Industrial anomaly detection systems deploy hybrid ensemble pipelines to monitor industrial IoT sensor telemetry and utility grids. Ensemble consensus mechanisms eliminate false alarms while detecting subtle multivariable degradation patterns prior to hardware failure.",
        "Compilation frameworks like TreeLite, ONNX Runtime, and TensorRT translate ensemble decision paths into native machine instructions. These compiled artifacts execute within user-space polling threads on PCIe SmartNICs, achieving ultra-low P99 latency guarantees.",
        "Federated ensemble learning enables privacy-preserving collaborative model training across decentralized healthcare and mobile edge devices. Differential privacy mechanisms inject calibrated Laplacian noise into gradient updates, safeguarding proprietary data while preserving ensemble predictive power.",
        "Explainable AI (XAI) mandates under EU AI Act and IEEE compliance guidelines require transparent attribution across high-stakes decisions. Combining TreeSHAP, Integrated Gradients, and counterfactual explanations provides mathematically grounded evidence for evaluators and regulatory bodies.",
        "Emerging 2026+ research directions explore quantum-assisted ensemble algorithms and photonic tree traversal accelerators. As computational workloads expand, post-quantum verifiable ensemble attestations will secure mission-critical predictive pipelines against adversarial manipulation.",
      ],
    ];
  } else if (isAiMl) {
    coreTitles = [
      "CORE THEORETICAL FOUNDATIONS & MATHEMATICAL FORMULATION",
      "PRIMARY ARCHITECTURAL MECHANISMS & REPRESENTATIONS",
      "FINE-TUNING ARCHITECTURES & HYPERPARAMETER OPTIMIZATION",
      "SECONDARY MECHANISMS & ATTENTION WORKFLOWS",
      "FINE-TUNING REGULARIZATION & LOSS DYNAMICS",
      "ALGORITHMIC MODELS: A COMPARATIVE ANALYSIS",
      "ADVANCED TECHNIQUES & HARDWARE ACCELERATION",
      "INDUSTRIAL APPLICATIONS & FUTURE 2026+ HORIZONS",
    ];

    coreBulletsMatrix = [
      [
        `Establishes the foundational theoretical framework and mathematical principles governing ${titleTopic} within modern computational intelligence. The analytical problem space is transformed into continuous manifold representations optimized under rigorous objective loss functions.`,
        "Decomposes system input tensors through multi-layered linear transformations interleaved with non-linear activation functions. This architectural hierarchy enables the network to approximate arbitrary continuous functions within bounded error tolerances.",
        "Structural inductive biases are calibrated to preserve spatial, temporal, and semantic invariants across input domains. Enforcing geometric consistency ensures that internal representations remain invariant under translation, rotation, and affine distortions.",
        "Gradient propagation dynamics are formalized through reverse-mode automatic differentiation across deep computational graphs. Mathematically bounded gradient norms prevent exponential vanishing and exploding phenomena during sustained backpropagation updates.",
        "Information-theoretic principles maximize mutual information between latent embeddings and target labels while minimizing redundant feature entropy. This structural regularization improves generalization bounds on out-of-distribution evaluation benchmarks.",
        "Convergence guarantees under stochastic gradient descent leverage Lipschitz smoothness bounds on the objective loss surface. Adaptive momentum terms accelerate parameter traversal across narrow ill-conditioned loss ravines toward flat minima.",
      ],
      [
        "High-dimensional input vectors are mapped into dense, low-dimensional Riemannian embedding manifolds with learned metric distances. Semantic similarity metrics are strictly preserved using cosine proximity and contrastive noise-contrastive estimation objectives.",
        "Multi-headed attention mechanisms partition hidden states into distinct orthogonal subspaces to capture composite contextual dependencies. Scaled dot-product operations calculate cross-token affinity matrices with quadratic computational efficiency.",
        "Rotary position embeddings (RoPE) and learned positional encodings inject relative sequence geometry into permutation-invariant attention blocks. This allows models to generalize gracefully across long-context token sequences without degradation.",
        "Pre-layer normalization and RMSNorm architectures stabilize internal covariate shifts across hundreds of stacked transformer layers. Maintaining constant variance across residual streams eliminates the need for aggressive learning rate warmups.",
        "Feed-forward expansion networks apply gated linear units (SwiGLU) to expand hidden representations before projected dimensionality reduction. This non-linear projection significantly amplifies the expressiveness of token-level knowledge retrieval.",
        "Cross-modal semantic projection layers align heterogeneous representations spanning unstructured text, audio waveforms, and visual patches. Joint multimodal contrastive pre-training establishes a unified latent space for zero-shot downstream reasoning.",
      ],
      [
        "Cosine annealing learning rate schedules with linear warmup phases guide optimizer weights toward wide, robust loss basins. Decoupled weight decay (AdamW) prevents gradient momentum from inflating L2 penalties on active directional updates.",
        "Batch size scheduling and gradient accumulation simulate massive distributed batch sizes without exceeding physical GPU VRAM limits. Operating at scale stabilizes empirical gradient approximations and speeds up overall training wall-clock time.",
        "Hyperparameter optimization employs Bayesian optimization with Tree-structured Parzen Estimators (TPE) across continuous search spaces. Automated traversal balances exploration against exploitation to isolate the Pareto-optimal parameter frontier.",
        "Mixed-precision arithmetic pipelines (FP16 and BF16) leverage Tensor Cores to double compute throughput and halve memory bandwidth usage. Dynamic loss scaling prevents subnormal floating-point underflow during backward gradient calculations.",
        "Selective gradient checkpointing trades re-computation cycles for up to 60% activation memory savings during backpropagation passes. This enables training substantially larger model architectures on standard accelerator clusters.",
        "Deterministic seed synchronization and distributed barrier checks guarantee strict reproducibility across distributed multi-node runs. This ensures that comparative ablation studies reflect genuine algorithmic improvements rather than stochastic drift.",
      ],
      [
        "KV-caching mechanisms store precomputed key and value projection tensors in high-speed GPU HBM to eliminate redundant inference calculations. PagedAttention algorithms partition cache tensors into non-contiguous virtual blocks, reducing memory fragmentation to near zero.",
        "FlashAttention kernel fusions compute exact softmax attention inside on-chip SRAM, bypassing high-latency HBM read-write cycles. This IO-aware hardware optimization accelerates training and inference throughput by up to 300% on modern accelerators.",
        "Speculative decoding frameworks utilize lightweight draft models to generate candidate token sequences verified concurrently by the target network. Parallel verification delivers a 2x to 3x latency reduction while preserving identical output probability distributions.",
        "Mixture-of-Experts (MoE) architectures employ learned top-k routing gates to activate sparse subsets of parameter experts per token. This decouples total model capacity from per-token compute cost, achieving massive scaling efficiency.",
        "Streaming pipeline parallelism partitions large models across sequential accelerator devices with micro-batch pipelining. Bubble overhead is minimized through bidirectional 1F1B scheduling, achieving over 90% hardware compute utilization.",
        "Real-time telemetry hooks track per-layer activation norms, attention entropy, and gradient variance across training checkpoints. Automated anomaly detectors flag loss spikes and initiate parameter rollback before catastrophic divergence occurs.",
      ],
      [
        "Stochastic weight averaging (SWA) and exponential moving averages (EMA) track model checkpoints to discover flatter, more generalizable minima. Flatter loss basins demonstrate provably superior resilience against out-of-distribution domain shift.",
        "Dropout, DropPath, and stochastic depth selectively deactivate network layers during training to prevent co-adaptation of features. This structural regularizer forces redundant representation pathways, significantly improving model robustness.",
        "Label smoothing and temperature calibration soften one-hot target probabilities, preventing the network from becoming overconfident. Calibrated prediction outputs align model confidence closely with empirical verification accuracy.",
        "Adversarial training regimens perturb input representations along gradient ascent directions to reinforce decision boundary margins. Models trained against projected gradient descent (PGD) perturbations exhibit marked resistance to evasion attacks.",
        "Gradient clipping thresholds constrain total parameter gradient L2 norms to safeguard against destabilizing loss landscape cliffs. This stabilizes training dynamics during abrupt distribution transitions and noisy batch anomalies.",
        "Curriculum learning regimens order training data by syntactic and semantic difficulty scores, accelerating initial optimization convergence. Introducing complex edge cases progressively reduces sample complexity and minimizes total epoch requirements.",
      ],
      [
        "Empirical benchmarking on standardized academic suites validates substantial accuracy gains over classical baseline architectures. Quantitative ablation studies isolate the exact marginal contribution of each architectural innovation.",
        "Throughput and latency profiling demonstrates linear scaling characteristics across increasing sequence lengths and batch concurrency. Profiling logs confirm zero memory leaks and predictable P99 latency bounds under sustained peak throughput.",
        "Parameter efficiency metrics evaluate performance per floating-point operation (FLOP) against parameter count and memory footprint. Modern optimized architectures achieve superior downstream task benchmarks with 40% fewer total parameters.",
        "Computational complexity analysis compares O(N^2) full attention against linear attention approximations and state-space models. Linear recurrent formulations exhibit flat inference memory consumption during indefinite context generation.",
        "Robustness stress testing evaluates model degradation under simulated sensor noise, missing tokens, and out-of-vocabulary inputs. The proposed framework maintains graceful degradation curves where legacy baselines experience catastrophic collapse.",
        "Reproducible measurement protocols publish exact hardware configurations, software driver versions, and telemetry seeds. Conforming to open science benchmarks ensures transparent peer verification and enterprise trust.",
      ],
      [
        "Post-Training Quantization (PTQ) and Quantization-Aware Training (QAT) compress 16-bit parameters into 4-bit and 8-bit integer formats. AWQ and GPTQ algorithms protect salient weight channels to maintain zero perceptible accuracy degradation.",
        "Structured weight pruning removes redundant attention heads and MLP channels to create compact, hardware-friendly architectures. Pruned sub-networks execute on specialized sparse tensor cores with minimal memory overhead.",
        "Operator fusion compilers (TensorRT, torch.compile, Triton) fuse consecutive kernel calls into unified machine instructions. Eliminating intermediate kernel launch overhead maximizes GPU compute engine occupancy.",
        "Low-Rank Adaptation (LoRA) and QLoRA freeze base foundation model weights and inject trainable rank-decomposition matrices. This parameter-efficient fine-tuning reduces trainable weights by 99% while enabling modular task switching.",
        "Continuous batching engines dynamically insert incoming requests into active execution iterations without waiting for sequence completion. This dynamic scheduling maximizes GPU utilization and slashes queuing delays in cloud serving systems.",
        "Hardware-software co-design integrates specialized NPU and TPU matrix units with high-bandwidth interconnects (NVLink). Optimized memory hierarchies deliver petabyte-per-second aggregate bandwidth for ultra-fast distributed model inference.",
      ],
      [
        "Production deployment across enterprise agentic platforms, autonomous robotics, diagnostic imaging, and algorithmic trading systems. Real-time inference pipelines process millions of multimodal requests daily under strict service level agreements.",
        "Continuous monitoring frameworks track data drift, prediction latency, and model output toxicity in live production environments. Automated retraining pipelines trigger when population stability indices exceed predefined threshold margins.",
        "Edge deployment optimizes lightweight models onto resource-constrained mobile processors, drones, and IoT microcontrollers. On-device execution guarantees low latency, offline availability, and complete user data privacy.",
        "AI governance and compliance frameworks enforce strict alignment with safety guardrails and algorithmic transparency standards. Auditable telemetry traces verify that automated decisions remain fully explainable to human oversight boards.",
        "Energy efficiency optimization minimizes carbon footprints by optimizing FLOP utilization and dynamic power throttling. Green computing techniques lower operational expenditure while supporting sustainable enterprise scalability.",
        "Emerging 2026+ horizons explore neuromorphic spiking architectures, quantum neural networks, and self-evolving model graphs. These revolutionary vectors establish the theoretical and practical foundation for next-generation cognitive systems.",
      ],
    ];
  } else if (isCloudDistributed) {
    coreTitles = [
      "CORE THEORETICAL FOUNDATIONS & DISTRIBUTED PRIMITIVES",
      "PRIMARY ARCHITECTURAL PIPELINES & DATA FLOW",
      "FINE-TUNING SYSTEM BUFFERS & RUNTIME PARAMETERS",
      "SECONDARY SUBSYSTEMS & CONCURRENCY MECHANISMS",
      "FINE-TUNING RESOURCE SCHEDULING & CACHE LOCALITY",
      "ARCHITECTURAL APPROACHES: A COMPARATIVE ANALYSIS",
      "ADVANCED RESILIENCE & FAULT TOLERANCE HYBRIDIZATION",
      "INDUSTRIAL APPLICATIONS & FUTURE 2026+ HORIZONS",
    ];

    coreBulletsMatrix = [
      [
        `Establishes the foundational theoretical principles governing ${titleTopic} across modern distributed computing architectures. Formal consistency models delineate trade-offs between strict linearizability, causal consistency, and eventual convergence.`,
        "Decomposes system responsibilities into modular, loosely coupled microservices interacting via strongly typed RPC protocols. Decoupling compute from durable storage enables independent horizontal scaling and localized fault containment.",
        "CAP theorem and PACELC frameworks guide architectural decisions during unexpected asynchronous network partition events. The system guarantees high availability while enforcing deterministic data reconciliation upon partition recovery.",
        "Logical clocks, Lamport timestamps, and vector clock structures track causal event ordering across asynchronous network nodes. Resolving concurrency without physical clock synchronization eliminates vulnerability to hardware clock drift.",
        "Distributed consensus primitives (Raft and Paxos) maintain replicated state machine synchronization across quorum majorities. Leader election protocols achieve sub-second failover guarantees without inducing split-brain anomalies.",
        "Deterministic finite state machine formulations guarantee that identical input sequences produce identical node states globally. This mathematical determinism provides the foundation for auditability and disaster recovery replication.",
      ],
      [
        "High-throughput ingestion gateways terminate incoming client connections, validate cryptographically signed tokens, and enforce rate limits. Validated payload frames are transformed into binary serialization schemas to minimize transit overhead.",
        "Asynchronous non-blocking event loops (Netty and epoll) process thousands of concurrent network sockets per thread. Eliminating thread-per-connection concurrency prevents memory thrashing and CPU context switching overhead.",
        "Zero-copy buffer handoffs transfer serialized packet streams directly from kernel network sockets to storage ring buffers. Bypassing user-space memory copies conserves critical memory bandwidth and slashes end-to-end P99 latency.",
        "Partitioned message brokers (Kafka and Apache Pulsar) distribute streaming event logs across durable storage segments. Sharding keys map transactions across balanced consumer partitions to ensure strict in-order processing semantics.",
        "Distributed query engines parse, optimize, and execute complex analytics across distributed cluster nodes. Vectorized query execution kernels process thousands of records per instruction cycle using SIMD hardware acceleration.",
        "Real-time telemetry pipelines extract per-hop network latency, packet drop rates, and serialization metrics across all active links. Continuous distributed tracing (OpenTelemetry) correlates RPC spans to isolate downstream bottlenecks instantaneously.",
      ],
      [
        "Buffer capacity tuning aligns socket receive and transmit buffers with the bandwidth-delay product of the network fabric. Sizing buffers accurately eliminates TCP window stalls while preventing bufferbloat-induced latency spikes.",
        "Thread pool sizing optimizes worker count based on CPU core topology and average IO wait-to-compute ratios. Segregating CPU-intensive workloads from asynchronous IO pools prevents thread starvation under heavy client concurrency.",
        "Adaptive rate-limiting and backpressure signaling propagate congestion upstream to safeguard downstream dependencies. Token bucket and leaky bucket algorithms dynamically throttle aggressive clients without dropping validated transactions.",
        "Connection pooling mechanisms maintain persistent warm keep-alive channels to eliminate expensive TLS handshake overhead. Pre-allocated socket pools reduce connection establishment latency from hundreds of milliseconds to zero.",
        "Batch flush timeouts and minimum payload size thresholds balance per-message transit overhead against latency SLAs. Dynamic micro-batching combines consecutive payloads during high traffic bursts while flushing immediately during lulls.",
        "Automated garbage collection tuning and off-heap memory management minimize stop-the-world JVM and runtime pauses. Utilizing generational ZGC and manual memory arena allocators caps maximum pause times under 1 millisecond.",
      ],
      [
        "Distributed locking mechanisms leverage lease renewals and fencing tokens to prevent split-brain resource mutation. Fencing tokens guarantee that delayed messages from expired leaders are rejected by storage engines.",
        "Conflict-Free Replicated Data Types (CRDTs) enable concurrent multi-master writes with mathematically guaranteed deterministic merge resolution. State-based and operation-based CRDTs ensure eventually consistent convergence without centralized locks.",
        "Distributed two-phase commit (2PC) and Saga orchestration patterns manage multi-service transaction atomicity across boundaries. Saga orchestrators execute compensating transactions to roll back intermediate states when workflow steps fail.",
        "Read-replica routing and distributed caching layers offload repetitive read queries from authoritative primary databases. Cache invalidation protocols enforce write-through or write-around policies to prevent stale read anomalies.",
        "Sharding routers dynamically rebalance hash slot partitions across nodes as cluster infrastructure scales out. Consistent hashing rings minimize data migration overhead to only K/N keys during node addition or removal.",
        "Continuous snapshotting engines persist incremental state checkpoints to durable object storage without interrupting runtime loops. Asynchronous write-ahead logging (WAL) guarantees instant durability with zero write stall cycles.",
      ],
      [
        "CPU cache line alignment packs hot data structures along 64-byte boundaries to eliminate false sharing across multi-core processors. NUMA-aware memory allocation pins thread execution to local memory nodes, cutting interconnect latency in half.",
        "Kernel bypass networking (DPDK and eBPF) routes network frames directly to user-space application memory buffers. Eliminating kernel context switches and interrupt processing unlocks line-rate 100GbE packet processing throughput.",
        "Distributed load balancers utilize power-of-two-random-choices algorithms to distribute incoming traffic evenly across healthy nodes. Avoiding round-robin imbalance ensures that slow nodes do not accumulate disproportionate request queues.",
        "Multi-tiered caching hierarchies combine L1 in-process memory caches with L2 distributed Redis and Memcached clusters. Intelligent predictive prefetching populates cache lines prior to anticipated client read bursts.",
        "Disk IO scheduling optimizes sequential append writes to NVMe storage arrays while batching random read lookups. LSM-tree compactions are throttled during peak hours to preserve sustained disk IOPS for live transaction commits.",
        "Dynamic CPU governor scaling and thread affinity pinning minimize thermal throttling and frequency stepping delays. High-priority transaction threads execute on dedicated isolated cores with uninterrupted execution slices.",
      ],
      [
        "Rigorous empirical benchmarks evaluate throughput, latency distribution, and failover SLA against legacy monolithic systems. Results demonstrate an order-of-magnitude amplification in concurrent operations per second under peak load.",
        "P99 and P99.9 tail latency profiles demonstrate flat, predictable response times where conventional architectures degrade exponentially. Deterministic concurrency handling eliminates uncoordinated queue build-ups across service boundaries.",
        "Resource utilization efficiency metrics prove a 50% reduction in compute and memory footprints for equivalent transaction volumes. Efficient hardware utilization translates directly into massive reductions in enterprise cloud infrastructure costs.",
        "Network efficiency evaluations quantify wire-format protocol overhead across JSON, Protocol Buffers, and FlatBuffers. Zero-copy binary serialization formats reduce network payload sizes by up to 70% and slash parsing CPU cycles.",
        "Fault recovery SLA benchmarks measure cluster recovery time following sudden catastrophic primary node termination. Modern distributed consensus engines complete leader election and resume full write operations in under 500 milliseconds.",
        "Standardized TPC-C and YCSB benchmark suites validate database consistency guarantees and transaction isolation levels. Transparent benchmark methodologies guarantee scientific reproducibility and operational predictability.",
      ],
      [
        "Automated circuit breakers (Resilience4j) isolate failing downstream services and return graceful fallback responses immediately. Fast-failing degraded dependencies prevents cascading thread pool exhaustion across upstream calling services.",
        "Chaos engineering regimens continuously inject network latency, packet loss, and node terminations into live staging clusters. Automated verification ensures that self-healing systems detect anomalies and restore quorum without human intervention.",
        "Multi-region active-active replication replicates state changes across geographically dispersed cloud data centers. BGP Anycast routing directs client traffic to the nearest healthy region, providing instant disaster recovery failover.",
        "Zero-trust security architectures mandate mutual TLS (mTLS) with ephemeral cryptographic certificates across all internal RPCs. Granular RBAC and ABAC authorization policies verify caller identity and permissions on every transaction.",
        "Distributed dead letter queues (DLQ) and exponential backoff retry schedules capture poisoned messages without halting pipelines. Automated replay tooling allows operators to re-inject remediated messages into production streams safely.",
        "Immutable infrastructure and declarative GitOps pipelines automate container orchestration, rolling deployments, and instant rollbacks. Automated health probes verify system stability before routing live production traffic to newly provisioned pods.",
      ],
      [
        "Powers global mission-critical infrastructure including high-frequency financial exchanges, telecommunication networks, and aerospace systems. Billions of real-time transactions settle with sub-millisecond determinism and mathematical consistency.",
        "Enterprise cloud-native platforms deploy containerized microservices across elastic Kubernetes clusters spanning hybrid clouds. Automated horizontal pod autoscalers adjust compute capacity dynamically in response to real-time traffic demand.",
        "IoT telemetry platforms ingest millions of sensor data streams per second from connected vehicles, smart grids, and medical devices. Distributed stream processors perform real-time windowed aggregations and predictive maintenance analytics.",
        "Financial fraud detection engines correlate global transaction graphs in real time to intercept unauthorized payments. High-throughput distributed graph databases execute multi-hop link traversals in milliseconds to block fraudulent syndicates.",
        "Sustainability engineering optimizes server utilization to reduce data center power consumption and environmental carbon impact. Intelligent workload shifting migrates non-urgent batch computations to regions powered by renewable energy.",
        "Emerging 2026+ horizons explore serverless WebAssembly execution sandboxes, post-quantum encrypted networks, and decentralized ledgers. These evolutionary vectors establish the resilient foundation for the next decade of scalable computing.",
      ],
    ];
  } else {
    coreTitles = [
      "CORE THEORETICAL FOUNDATIONS & MATHEMATICAL PRINCIPLES",
      "PRIMARY ARCHITECTURAL FRAMEWORK & SYSTEM WORKFLOW",
      "FINE-TUNING SYSTEM PARAMETERS & COMPUTATIONAL RUNTIME",
      "SECONDARY SUBSYSTEMS & CONCURRENCY MECHANISMS",
      "FINE-TUNING RESOURCE ALLOCATION & CACHE LOCALITY",
      "ARCHITECTURAL APPROACHES: A COMPARATIVE ANALYSIS",
      "ADVANCED TECHNIQUES & SYSTEM RESILIENCE HYBRIDIZATION",
      "INDUSTRIAL APPLICATIONS & FUTURE 2026+ HORIZONS",
    ];

    coreBulletsMatrix = [
      [
        `Establishes the foundational theoretical framework and mathematical principles governing ${titleTopic} within modern engineering systems. The problem domain is formulated into deterministic analytical representations with bounded computational complexity.`,
        "Decomposes system responsibilities into modular, loosely coupled architectural components with strongly typed API interfaces. Structural decoupling isolates state mutations and guarantees high maintainability and testability across modules.",
        "Formulates operational invariants and boundary conditions that must hold true across all valid execution states. Formal invariant verification prevents invalid state transitions, race conditions, and catastrophic runtime failures.",
        "Mathematical complexity analysis bounds time and space requirements to optimal asymptotic algorithmic limits (O(N log N) or O(1)). Minimizing computational complexity guarantees predictable execution speeds as input dataset sizes scale.",
        "Information-theoretic principles maximize throughput efficiency while minimizing entropy and transmission overhead across subsystems. Efficient data encoding preserves signal fidelity while eliminating redundant storage overhead.",
        "Rigorous theoretical modeling provides provable guarantees for deterministic performance under worst-case operational constraints. This theoretical rigor forms the bedrock for high-assurance engineering systems deployed in safety-critical domains.",
      ],
      [
        "End-to-end data processing pipelines route incoming transactions through validation gates, normalization filters, and queues. Pipelined execution stages maximize hardware utilization by overlapping compute cycles with IO operations.",
        "Asynchronous non-blocking architecture utilizes event loops and non-blocking sockets to handle high concurrent task volumes. Eliminating thread-blocking stalls prevents thread pool exhaustion and ensures continuous responsiveness.",
        "Zero-copy buffer architectures transfer data frames across internal memory boundaries without intermediary user-space allocations. Bypassing unnecessary memory copies conserves system memory bandwidth and cuts processing latency.",
        "State machine engines execute discrete verified state transitions based on incoming deterministic event triggers. Atomic memory barriers and compare-and-swap operations guarantee thread safety across multi-threaded worker pools.",
        "Telemetry and logging subsystems capture high-resolution timestamped traces for every processed transaction packet. Real-time metrics streaming enables proactive anomaly detection and instantaneous operational visibility.",
        "Modular plug-in architectures allow seamless integration of domain-specific accelerators and third-party protocol adapters. Standardized interfaces future-proof system infrastructure against disruptive technological shifts.",
      ],
      [
        "Hyperparameter and buffer tuning aligns runtime allocations with the physical hardware characteristics of host systems. Calibrating queue capacities and flush intervals prevents memory exhaustion while minimizing transit delays.",
        "Thread pool allocations balance worker concurrency against CPU core count and memory bandwidth constraints. Eliminating excessive thread contention prevents context switching penalties and maximizes instruction throughput.",
        "Adaptive backpressure mechanisms signal upstream producers to throttle data generation during downstream congestion bursts. Dynamic flow control prevents buffer overflows and maintains steady-state throughput under volatile workloads.",
        "Timeout thresholds and retry policies implement exponential backoff with jitter to eliminate thundering herd connection storms. Calibrated retry schedules prevent transient network glitches from escalating into permanent system outages.",
        "Memory management optimization leverages object pooling and slab allocators to minimize runtime garbage collection overhead. Pre-allocating reusable memory blocks eliminates heap fragmentation and ensures deterministic execution times.",
        "Dynamic runtime reconfiguration control planes allow operators to adjust operational parameters without process restarts. Hot-reloading configuration settings ensures uninterrupted 24/7 service availability in enterprise production.",
      ],
      [
        "Concurrency control protocols implement lock-free and wait-free algorithms to synchronize shared state across processor cores. Lock-free ring buffers eliminate thread synchronization deadlocks and deliver multi-million operation throughput.",
        "Parallel processing engines partition large data payloads into independent chunks processed concurrently by SIMD vector units. Vectorized instruction sets (AVX-512 and ARM Neon) execute parallel operations per single CPU cycle.",
        "Checkpointing and state persistence subsystems commit incremental snapshots to persistent non-volatile storage media. Write-ahead logging ensures full transaction durability and instant crash recovery without data loss.",
        "Validation and assertion frameworks verify intermediate computational results against mathematical invariants prior to commit. Detecting arithmetic anomalies early prevents corrupted states from propagating downstream.",
        "Deduplication windows and sequence numbering enforce exact-once processing semantics across unreliable transmission channels. Filtering out duplicate transmissions guarantees consistent accounting and ledger reconciliation.",
        "Distributed synchronization primitives coordinate node consensus and distributed barrier synchronization without central bottlenecks. Quorum-based voting guarantees deterministic global state agreements across clustered environments.",
      ],
      [
        "Data structures are aligned along 64-byte CPU cache line boundaries to maximize L1 and L2 cache hit ratios. Eliminating false sharing across neighboring processor cores delivers substantial multi-threaded speedups.",
        "NUMA-aware memory allocation strategies bind compute threads directly to local memory banks, cutting interconnect latency. Minimizing cross-socket memory bus traffic unlocks linear performance scaling on multi-socket server hardware.",
        "Disk IO scheduling combines sequential append writing with asynchronous batched IO completion queues (io_uring). Leveraging kernel-native async IO interfaces maximizes NVMe drive IOPS while eliminating thread blocking.",
        "Dynamic CPU core affinity pinning locks critical real-time execution threads to dedicated physical processor cores. Isolating cores eliminates operating system interrupt jitter and guarantees sub-millisecond execution deadlines.",
        "Multi-level hierarchical caching keeps frequently accessed working sets inside high-speed L1/L2 caches and RAM. Intelligent predictive cache eviction algorithms (ARC and 2Q) outperform traditional LRU policies under mixed workloads.",
        "Thermal and power throttling monitors dynamically modulate workload distribution across processor cores to prevent throttling. Maintaining optimal operating temperatures preserves maximum continuous turbo boost clock frequencies.",
      ],
      [
        "Comprehensive empirical benchmarking against industry-standard baselines proves decisive throughput and latency advantages. Standardized measurement methodologies validate reproducible performance gains across diverse test suites.",
        "Throughput scalability benchmarks confirm near-linear throughput amplification as compute core count scales outward. The system maintains high hardware efficiency where traditional legacy solutions saturate prematurely.",
        "Tail latency distributions demonstrate strict determinism with P99.9 latency metrics tightly bounded under production SLAs. Eliminating outlier latency spikes ensures consistent user experience across high-concurrency enterprise workloads.",
        "Memory footprint profiling shows negligible heap growth during sustained multi-day stress testing under continuous peak load. Zero-leak memory architectures guarantee long-term operational stability without scheduled service restarts.",
        "Comparative architectural analysis contrasts the proposed framework against alternative design philosophies across key metrics. The comparative matrix highlights superior trade-offs in computational efficiency, reliability, and cost.",
        "Reproducible benchmark suites publish all source code, test data generators, and hardware profiling scripts openly. Full transparency ensures rigorous scientific validation and fosters peer academic collaboration.",
      ],
      [
        "Circuit breaker patterns and automated fault isolation prevent localized component failures from cascading through the system. Fast-failing degraded subsystems preserves core functionality and safeguards overall system health.",
        "Automated self-healing watchdogs detect node crashes, network disconnects, and hung processes, initiating rapid recovery. Self-healing state machines restore healthy operational states automatically in under two seconds.",
        "Comprehensive threat modeling mitigates attack vectors through input sanitization, cryptographic authentication, and integrity hashing. Enforcing principle-of-least-privilege access controls neutralizes unauthorized privilege escalation attempts.",
        "Graceful degradation protocols prioritize critical operational paths over non-essential background tasks during overload. Load-shedding safeguards the integrity of high-priority transactions under severe infrastructure stress.",
        "Continuous automated testing regimens execute fuzz testing, property-based testing, and randomized fault injection. Proactively uncovering subtle concurrency bugs in CI/CD pipelines guarantees enterprise-grade software robustness.",
        "Immutable deployment artifacts and declarative infrastructure-as-code blueprints guarantee deterministic environment parity. Version-controlled configuration management eliminates configuration drift between development and production.",
      ],
      [
        "Deployed across mission-critical sectors including aerospace avionics, high-frequency finance, smart grids, and healthcare monitoring. High-reliability computational guarantees satisfy stringent regulatory standards across mission-critical domains.",
        "Enterprise cloud platforms utilize this framework to orchestrate microservice fabrics handling petabytes of daily data traffic. Elastic horizontal scaling automatically provisions compute capacity to match fluctuating global demand.",
        "Real-time edge computing solutions deploy optimized runtime builds onto smart IoT sensors, industrial robotics, and vehicles. Localized execution delivers ultra-low latency decision making without dependency on continuous cloud connectivity.",
        "Predictive maintenance systems analyze high-frequency vibration and thermal telemetry to anticipate hardware wear. Predicting mechanical component failure weeks in advance eliminates catastrophic unscheduled industrial downtime.",
        "Resource-efficient software architecture reduces power consumption and computational carbon footprints across enterprise data centers. Sustainable engineering practices optimize hardware lifespan while lowering operational cloud expenditure.",
        "Emerging 2026+ horizons focus on quantum-resistant cryptographic integration, optical computing, and autonomous AI agents. These cutting-edge engineering paradigms establish the foundation for the next generation of intelligent software.",
      ],
    ];
  }

  // Adjust core arrays to match coreCount
  while (coreTitles.length < coreCount) {
    const extraIdx = coreTitles.length + 1;
    coreTitles.push(`ADVANCED SUBSYSTEM ARCHITECTURE & METRICS (PART ${extraIdx})`);
    coreBulletsMatrix.push([
      `Examines advanced subsystem mechanics and internal execution dynamics for ${titleTopic}. The analytical problem space is transformed into modular mathematical representations with verified computational bounds.`,
      "Applies low-level hardware profiling to isolate memory bottlenecks, instruction cache misses, and pipeline stalls. Pinpointing microarchitectural stalls allows targeted optimizations that unlock maximum hardware throughput.",
      "Optimizes critical execution code paths through loop unrolling, branch prediction hints, and SIMD vectorization. Vectorized instruction dispatch doubles processing efficiency on modern heterogeneous compute platforms.",
      "Validates operational correctness against formal specification benchmarks under randomized fuzzing test suites. Exhaustive property-based verification guarantees that internal invariants hold across all edge conditions.",
      "Integrates telemetry metrics directly into production observability dashboards for proactive anomaly detection. Real-time alerting triggers automated remediation workflows before service level agreements are breached.",
      "Establishes a resilient foundation for long-term production scalability across distributed and cloud-native environments. High operational efficiency minimizes infrastructural overhead while maintaining five-nines service reliability.",
    ]);
  }
  coreTitles = coreTitles.slice(0, coreCount);
  coreBulletsMatrix = coreBulletsMatrix.slice(0, coreCount);

  // 1. Cover Slide (Exact 6-line structure)
  const s1: TechTalkSlide = {
    id: "aat-slide-1",
    slideNumber: 1,
    layout: "title",
    title: `Topic - ${titleTopic}`,
    category: `[${assessment.toUpperCase()}]`,
    subtitle: `Name: ${studentName} | Roll No: ${rollNo} | Branch: ${branch} | Subject: ${subject}`,
    columns: [
      {
        title: "Student Credentials",
        bullets: [
          `Name: ${studentName}`,
          `Roll No: ${rollNo}`,
          `Branch: ${branch}`,
          `Subject: ${subject}`,
        ],
      },
    ],
    speakerNotes: `Respected faculty evaluators and fellow classmates, good morning. I am ${studentName}, bearing roll number ${rollNo} from the Department of ${branch}. Today, I am honored to present my ${assessment} on the topic "${titleTopic}" for the course ${subject}. Over the next twelve slides, we will methodically examine the core theoretical foundations, architectural mechanisms, comparative empirical benchmarks, and real-world industrial implementations of this technology.`,
  };

  // 2. INDEX Slide (Numbered 1.  to 8.  with two spaces in Title Case)
  const indexNumberedList = coreTitles.map(
    (t, idx) => `${idx + 1}.  ${toTitleCase(t)}`
  );

  const s2: TechTalkSlide = {
    id: "aat-slide-2",
    slideNumber: 2,
    layout: "index",
    title: "INDEX",
    category: "ROADMAP",
    subtitle: "Roadmap of Core Technical Modules",
    bulletPoints: indexNumberedList,
    speakerNotes: `On this index slide, we outline the structured pedagogical roadmap of our technical presentation. We will methodically progress through these eight core modules, starting from foundational theoretical principles to architectural mechanisms, hyperparameter fine-tuning, comparative evaluations, and 2026+ industrial horizons. Each module builds sequentially to provide a comprehensive, college-seminar-grade understanding of ${titleTopic}.`,
  };

  // 3. INTRODUCTION Slide (Strictly ONE cohesive 5-6 sentence academic paragraph ~95-125 words, NO bullets)
  const introParagraph = `${titleTopic} represents a transformative architectural paradigm in modern ${domainField}, establishing a rigorous mathematical foundation for high-performance computational systems. In contemporary engineering deployments, legacy methodologies suffer from acute scaling bottlenecks, uncontrolled latency variance, and severe vulnerability to edge-case failures under heavy concurrent loads. By decomposing complex analytical problem spaces into modular, loosely coupled computational components, this framework systematically resolves traditional trade-offs between processing throughput and algorithmic precision. Critical to the success of this discipline is the systematic fine-tuning of operational hyperparameters, dynamic resource scheduling, and low-level memory layout optimization across heterogeneous computing hardware. Throughout this AAT Tech Talk, we present an exhaustive technical investigation covering foundational theoretical principles, architectural pipelines, comparative benchmark evaluations, and transformative production implementations.`;

  const s3: TechTalkSlide = {
    id: "aat-slide-3",
    slideNumber: 3,
    layout: "paragraph",
    title: "INTRODUCTION",
    category: "DOMAIN OVERVIEW",
    subtitle: "Conceptual Foundation & Problem Scope",
    paragraph: introParagraph,
    speakerNotes: `To introduce our topic, ${titleTopic} represents a fundamental advancement in modern engineering systems. Traditional approaches routinely break down under exponential data growth and unpredictable latency spikes. By decoupling system components and enforcing rigorous optimization principles, this architecture delivers deterministic throughput and high fault tolerance. In this tech talk, we will explore both the theoretical underpinnings and the practical implementation strategies that make this possible.`,
  };

  // 4..N-2: 8 Core Content Slides (5 or 6 bullets based on requested depth, each 2 sentences ~28-40 words)
  const coreSlides: TechTalkSlide[] = coreTitles.map((titleText, idx) => {
    const rawBullets = coreBulletsMatrix[idx] || [
      `Applies foundational principles of ${titleTopic} to optimize operational execution across heterogeneous hardware. Decomposing analytical transformations across high-performance computational kernels achieves marked throughput acceleration.`,
      "Balances latency and throughput constraints through adaptive runtime calibration and buffer management. Operating within optimal parameter envelopes prevents queue exhaustion during extreme production workload spikes.",
      "Demonstrates measurable efficiency gains over conventional baseline implementations across standard benchmark suites. Rigorous statistical evaluation validates consistent reductions in computational cycle overhead.",
      "Ensures robust error containment and state consistency during high concurrency bursts across clustered nodes. Automated failover state machines isolate anomalous conditions before they propagate downstream.",
      "Integrates low-level memory optimizations and cache alignment strategies to eliminate processor stall cycles. Aligning critical data structures along 64-byte boundaries maximizes L1 and L2 cache hit ratios.",
      "Establishes a proven architectural blueprint for mission-critical software deployments in modern enterprise systems. Continuous telemetry monitoring verifies operational health while guaranteeing compliance with institutional SLAs.",
    ];

    const finalBullets = rawBullets.slice(0, bulletsTarget);

    return {
      id: `aat-slide-${idx + 4}`,
      slideNumber: idx + 4,
      layout: "bullets",
      title: titleText,
      category: "CORE TECHNICAL MODULE",
      subtitle: `Detailed Analysis & Engineering Metrics`,
      bulletPoints: finalBullets,
      speakerNotes: `On this slide covering ${toTitleCase(titleText)}, we unpack the critical engineering mechanisms and operational trade-offs. Notice how the first principles establish mathematical consistency, while parameter fine-tuning ensures stability under real-world load. As we examine the metrics, observe the direct performance dividend gained by eliminating traditional architectural bottlenecks. This demonstrates why ${titleTopic} remains an indispensable paradigm for high-reliability systems.`,
    };
  });

  // N-1: CONCLUSION Slide (Strictly ONE cohesive 5-6 sentence academic summary paragraph ~95-125 words, NO bullets)
  const conclusionParagraph = `In conclusion, our technical investigation into ${titleTopic} validates that synthesizing robust theoretical principles with disciplined parameter fine-tuning delivers decisive performance, resilience, and computational efficiency advantages. Comprehensive empirical benchmarks across diverse workload distributions confirm statistically significant reductions in tail latency, hardware resource consumption, and prediction error rates compared to conventional monolithic baselines. By resolving long-standing architectural tensions between expressive representation capacity and hardware execution constraints, this framework establishes an authoritative engineering benchmark for mission-critical production environments. Successful real-world operationalization demands continuous observability telemetry, proactive regularization against concept drift, and automated self-healing mechanisms to guarantee five-nines service reliability. Looking ahead to 2026 and beyond, integrating automated neural optimization pipelines and hardware-accelerated edge execution represents the next high-impact frontier for ${titleTopic}.`;

  const sConclusion: TechTalkSlide = {
    id: `aat-slide-${totalSlides - 1}`,
    slideNumber: totalSlides - 1,
    layout: "paragraph",
    title: "CONCLUSION",
    category: "SUMMARY & TAKEAWAYS",
    subtitle: "Synthesis of Findings & Future Trajectory",
    paragraph: conclusionParagraph,
    speakerNotes: `In conclusion, we have systematically evaluated the core theoretical foundations, architectural mechanisms, hyperparameter tuning techniques, and comparative trade-offs of ${titleTopic}. The empirical findings affirm that this architecture achieves superior computational efficiency and deterministic reliability across real-world workloads. By addressing longstanding scalability bottlenecks, it provides a dependable foundation for mission-critical engineering systems. Looking toward future horizons, ongoing advancements in hardware acceleration and autonomous optimization will continue to expand its capabilities.`,
  };

  // N: THANK YOU Slide (Clean centered THANK YOU)
  const sThankYou: TechTalkSlide = {
    id: `aat-slide-${totalSlides}`,
    slideNumber: totalSlides,
    layout: "thank-you",
    title: "THANK YOU",
    category: "Q&A",
    subtitle: "Questions & Discussion",
    speakerNotes: `Thank you very much, respected faculty evaluators and dear peers, for your valuable time and courteous attention throughout this technical presentation. I am now delighted to open the floor for any questions, feedback, or technical discussion regarding the architecture, parameters, or benchmarks we have explored today.`,
  };

  const allSlides = [s1, s2, s3, ...coreSlides, sConclusion, sThankYou];
  return allSlides.map((s, i) => ({ ...s, slideNumber: i + 1, id: `aat-slide-${i + 1}` }));
}

// ============================================================================
// DEEP DETERMINISTIC CLIENT-SIDE SYNTHESIS ENGINE (NON-IARE MODE)
// ============================================================================

export function synthesizeTechTalkLocally(
  options: GenerateTechTalkOptions
): TechTalkSlide[] {
  if (options.iareMetadata?.isIareMode) {
    return synthesizeIarePresentation(options);
  }

  // Non-IARE general mode routes to synthesizeIarePresentation for consistent college-grade depth
  return synthesizeIarePresentation({
    ...options,
    iareMetadata: {
      isIareMode: true,
      assessmentType: "AAT - TECH TALK",
      studentName: options.presenterName || "Student Presenter",
      rollNumber: "26951A6701",
      department: options.collegeName || "Dept. of Computer Science & Engineering",
      subject: options.eventName || "Technical Seminar",
    },
  });
}
