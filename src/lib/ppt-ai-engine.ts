import {
  TechTalkSlide,
  ApiVaultConfig,
  IareMetadata,
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
}

const SYSTEM_PROMPT = `You are a distinguished Computer Science Professor and Principal Systems Architect at Institute of Aeronautical Engineering (IARE Autonomous).
Your task is to generate a complete, high-impact, professional College AAT Tech-Talk slide deck with exact slide counts (defaulting to 13 slides).
Return ONLY a valid JSON object with the key "slides" containing an array of slide objects.
Do NOT include markdown fences, backticks, or preamble. Return pure JSON.

Each slide object must have:
- "id": unique string
- "slideNumber": number (1 to N)
- "layout": one of "title", "index", "paragraph", "bullets", "thank-you"
- "title": concise, punchy slide title.
  * Slide 1: "Topic - [Topic Title]"
  * Slide 2: "INDEX"
  * Slide 3: "INTRODUCTION"
  * Slides 4 to N-2 (8 Core Slides): MUST be in ALL CAPS matching the exact 8-step pedagogical progression.
  * Slide N-1: "CONCLUSION"
  * Slide N: "THANK YOU"
- "subtitle": optional subtitle
- "category": e.g. "AAT - TECH TALK", "ROADMAP", "DOMAIN OVERVIEW", "CORE TECHNICAL MODULE", "SUMMARY", "Q&A"
- "bulletPoints": optional array of strings:
  * Slide 2 (INDEX): Array of items formatted as "1.  [Title Case]", "2.  [Title Case]", ..., "8.  [Title Case]" (with two spaces after period).
  * Slides 4 to N-2: Exactly 5 clean, single-sentence bullet points per slide (complete natural technical sentences without bold labels like "Overview:" or "Benefit:").
- "paragraph": optional 4-sentence academic prose paragraph (Used strictly for Slide 3 INTRODUCTION and Slide N-1 CONCLUSION; strictly NO bullet points on these slides).
- "speakerNotes": exactly 3 to 4 complete, conversational sentences explaining this slide out loud to an academic seminar audience.`;

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
// PROVIDER IMPLEMENTATIONS
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
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter API Error: ${res.status}`);
  const data = await res.json();
  const rawText = data.choices?.[0]?.message?.content;
  return parseSlidesFromJson(rawText, options);
}

async function callPollinations(options: GenerateTechTalkOptions): Promise<TechTalkSlide[]> {
  const prompt = buildUserPrompt(options);
  const encodedPrompt = encodeURIComponent(
    `${SYSTEM_PROMPT}\n\nTask Instructions:\n${prompt}\n\nRespond ONLY with valid JSON.`
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 14000);

  const res = await fetch(`https://text.pollinations.ai/${encodedPrompt}?json=true&model=openai`, {
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (!res.ok) throw new Error(`Pollinations HTTP Error: ${res.status}`);
  const rawText = await res.text();
  return parseSlidesFromJson(rawText, options);
}

// ============================================================================
// PROMPT BUILDER & PARSER
// ============================================================================

function buildUserPrompt(options: GenerateTechTalkOptions): string {
  const isIare = options.iareMetadata?.isIareMode;
  const iare = options.iareMetadata;

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
   - bulletPoints: Exactly ${coreCount} numbered titles matching the core slides in ALL CAPS! (e.g. ["1. CORE THEORETICAL FOUNDATIONS", "2. ARCHITECTURAL MECHANISMS", ..., "${coreCount}. APPLICATIONS & FUTURE DIRECTIONS"])

3. Slide 3 (INTRODUCTION):
   - layout: "paragraph"
   - title: "INTRODUCTION"
   - category: "DOMAIN OVERVIEW"
   - paragraph: One well-structured, academic 4–5 sentence introductory paragraph defining the domain, explaining the core concepts in "${options.topic}", and stating what the presentation covers.

4. Slides 4 to ${totalSlides - 2} (${coreCount} Core Technical Slides):
   - layout: "bullets"
   - title: Formatted in ALL CAPS matching the exact INDEX items (e.g., "1. CORE THEORETICAL FOUNDATIONS", "2. ARCHITECTURAL MECHANISMS", etc.)
   - bulletPoints: Exactly 5 detailed, substantive technical bullet points per slide (1–2 complete sentences per bullet, including technical parameters, trade-offs, and real-world context — never shallow 3-word bullets).

5. Slide ${totalSlides - 1} (CONCLUSION):
   - layout: "paragraph"
   - title: "CONCLUSION"
   - category: "SUMMARY"
   - paragraph: One cohesive 4–5 sentence academic summary paragraph synthesizing the key mechanisms, optimization strategies, comparative takeaways, and real-world impact.

6. Slide ${totalSlides} (THANK YOU):
   - layout: "thank-you"
   - title: "THANK YOU"
   - subtitle: "Questions & Discussion"
   - category: "Q&A"

Ensure every single slide includes 3-4 complete, articulate conversational sentences in "speakerNotes" for what the student should say out loud on stage to the evaluators and faculty.`;
  }

  return `Generate an academic college tech-talk presentation for:
Topic: "${options.topic}"
Reference Notes / Syllabus / Abstract: "${options.details || "Comprehensive technical overview"}"
Presenter: "${options.presenterName || "Student Presenter"}"
Department / College: "${options.collegeName || "Dept. of Computer Science & Engineering"}"
Event: "${options.eventName || "Annual Tech Seminar 2026"}"
Target Slide Count: Exactly ${options.slideCount} slides (Numbered 1 to ${options.slideCount})

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

Ensure every slide has 3-4 sentence stage speakerNotes explaining what to say verbally to the audience.`;
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
        `On this slide, we examine key technical and architectural mechanisms of ${options.topic}. Notice how the data models and algorithmic pipelines maintain high throughput while strictly conforming to Course Outcome attainment standards.`,
    };
  });
}

// ============================================================================
// IARE OFFICIAL 13-SLIDE AAT TECH-TALK SYNTHESIS ENGINE
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
    .replace(/\bIare\b/g, "IARE");
}

export function synthesizeIarePresentation(options: GenerateTechTalkOptions): TechTalkSlide[] {
  const { topic, details, slideCount, iareMetadata } = options;
  const titleTopic = topic.trim() || "Technical Presentation";
  const assessment = iareMetadata?.assessmentType || "AAT - TECH TALK";
  const studentName = iareMetadata?.studentName?.trim() || options.presenterName?.trim() || "Student";
  const rollNo = iareMetadata?.rollNumber?.trim() || "";
  const branch = iareMetadata?.department?.trim() || "";
  const subject = iareMetadata?.subject?.trim() || iareMetadata?.courseName?.trim() || "";

  const totalSlides = slideCount || 13;
  const coreCount = Math.max(5, totalSlides - 5); // Default 8 core slides for 13-slide deck

  const lower = (titleTopic + " " + (details || "")).toLowerCase();
  const isEnsemble =
    lower.includes("bagg") ||
    lower.includes("boost") ||
    lower.includes("ensembl") ||
    lower.includes("random forest") ||
    lower.includes("adaboost") ||
    lower.includes("xgboost");
  const isAiMl =
    isEnsemble ||
    lower.includes("ai") ||
    lower.includes("machine learn") ||
    lower.includes("neural") ||
    lower.includes("deep") ||
    lower.includes("llm") ||
    lower.includes("vision") ||
    lower.includes("transformer");

  // Generate 8 core technical slide titles in ALL CAPS following exact pedagogical progression
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
      "APPLICATIONS AND FUTURE DIRECTIONS",
    ];

    coreBulletsMatrix = [
      // 1. Core Concept & Definition
      [
        "Ensemble learning combines multiple weak base learners to construct an aggregate hypothesis with strictly superior generalization bounds.",
        "Generalization error decomposes mathematically into bias, variance, and irreducible noise using formal bias-variance trade-off formulations.",
        "Inductive bias is mitigated by exploring multiple diverse regions of the underlying hypothesis space concurrently.",
        "Aggregate majority voting reduces individual uncorrelated base learner errors toward zero at an exponential rate.",
        "Provides the foundational theoretical framework for state-of-the-art tabular learning benchmarks across industrial production applications.",
      ],
      // 2. First Primary Technique: Bagging
      [
        "Bootstrap aggregating draws multiple uniform replacement subsets of size N from the empirical training distribution.",
        "Trains independent, fully grown high-variance base estimators such as unpruned decision trees concurrently across parallel compute cores.",
        "Aggregates predictions via uniform arithmetic averaging for continuous regression or hard and soft majority voting for classification.",
        "Leaves approximately thirty-six percent of training observations out-of-bag, enabling built-in unbiased cross-validation error estimation.",
        "Maintains invariant expected bias while systematically attenuating ensemble variance by a factor proportional to subset count.",
      ],
      // 3. Fine-Tuning First Technique
      [
        "Introduces random feature sub-sampling at every internal node split to decorrelate individual tree architectures.",
        "Systematic decorrelation diminishes pairwise tree correlation, driving aggregate ensemble variance toward its theoretical minimum.",
        "Fine-tunes the maximum depth and minimum samples per split to eliminate leaf overfitting while preserving model expressive capacity.",
        "Optimizes Mean Decrease in Impurity and permutation feature importances for interpretability across safety-critical domains.",
        "Scales computational throughput linearly across multi-core CPUs and GPU-accelerated gradient tree libraries without memory thrashing.",
      ],
      // 4. Second Primary Technique: Boosting
      [
        "Constructs an additive ensemble sequentially where each successive base learner focuses directly on previously misclassified observations.",
        "AdaBoost dynamically updates instance distribution weights, assigning exponentially higher penalties to mispredicted samples.",
        "Computes learner stage weights proportional to the logarithm of their empirical classification accuracy at each iteration.",
        "Converts weak learners possessing accuracy only slightly better than random guessing into an arbitrarily strong predictor.",
        "Substantially reduces training bias within early iterations through targeted sequential error correction.",
      ],
      // 5. Fine-Tuning Second Technique
      [
        "Formulates ensemble optimization as functional gradient descent over arbitrary differentiable convex or non-convex loss functions.",
        "Each consecutive weak tree fits directly to negative pseudo-residuals computed from the preceding ensemble stage.",
        "Learning rate shrinkage scales newly added tree contributions, preventing step overshoots and improving test error stability.",
        "Second-order Taylor approximations compute optimal split scores efficiently within modern gradient boosting engines.",
        "Histogram-based continuous feature binning accelerates split-finding complexity while conserving GPU memory bandwidth.",
      ],
      // 6. Comparative Analysis
      [
        "Bagging reduces variance while preserving bias, whereas boosting systematically minimizes bias through sequential residual correction.",
        "Bagging trains independent base estimators in parallel, while boosting requires sequential computation across consecutive dependency rounds.",
        "Bagging demonstrates superior robustness against noisy labels, whereas standard boosting can overfit outliers without tuning.",
        "Empirical benchmarks across tabular datasets confirm gradient boosted decision trees achieve top accuracy on structured data.",
        "Computational profiling indicates bagging achieves faster training throughput while boosting delivers superior parameter compactness.",
      ],
      // 7. Advanced Techniques & Hybridization
      [
        "L1 and L2 leaf weight regularization terms constrain model complexity and smooth decision boundaries across noisy margins.",
        "Stochastic gradient boosting applies row and column sub-sampling per iteration to introduce randomized regularization.",
        "Early stopping criteria monitor holdout validation loss curves to halt training before empirical over-fitting occurs.",
        "Categorical target encoding with ordered target statistics prevents target leakage while supporting high-cardinality features.",
        "Hybrid stacking architectures combine gradient boosted decision trees with neural networks to maximize multi-modal predictive accuracy.",
      ],
      // 8. Applications and Future Directions
      [
        "Production deployment across credit scoring, fraud detection, algorithmic trading, and medical diagnostic classification.",
        "Compilation to optimized C code via TreeLite and ONNX runtimes achieves sub-millisecond real-time scoring latencies.",
        "Differentiable decision trees bridge tabular tree algorithms with end-to-end deep learning neural architectures.",
        "Neuro-tree hybrid pipelines automate feature discovery while maintaining transparent decision interpretability.",
        "Ongoing research focuses on quantum-enhanced ensemble algorithms and privacy-preserving federated boosting across distributed devices.",
      ],
    ];
  } else if (isAiMl) {
    coreTitles = [
      "CORE CONCEPTS & THEORETICAL FOUNDATIONS",
      "PRIMARY ARCHITECTURAL MECHANISMS & REPRESENTATIONS",
      "FINE-TUNING ARCHITECTURES & HYPERPARAMETER OPTIMIZATION",
      "SECONDARY MECHANISMS & ATTENTION WORKFLOWS",
      "FINE-TUNING REGULARIZATION & LOSS DYNAMICS",
      "ALGORITHMIC MODELS: A COMPARATIVE ANALYSIS",
      "ADVANCED TECHNIQUES & HYBRID ACCELERATION",
      "APPLICATIONS AND FUTURE DIRECTIONS",
    ];

    coreBulletsMatrix = [
      [
        `Establishes the foundational theoretical framework and mathematical principles governing ${titleTopic}.`,
        "Formulates the analytical problem space into continuous vector representations governed by rigorous loss objectives.",
        "Structural invariants and inductive biases mirror natural symmetries within the problem domain.",
        "Decomposes system input tensors through multi-layered linear and non-linear parametric activation functions.",
        "Maintains mathematically bounded gradients across deep computational graphs to prevent numerical divergence.",
      ],
      [
        "Projects high-dimensional raw observations into dense, low-dimensional Riemannian embedding manifolds.",
        "Preserves semantic similarity metrics using learned cosine distances and geometric contrastive objectives.",
        "Applies positional and contextual token encodings to capture intricate long-range sequence dependencies.",
        "Normalizes activation distributions to stabilize internal covariate shift across training iterations.",
        "Enables cross-modal semantic mapping between unstructured text, numerical signals, and perceptual representations.",
      ],
      [
        "Implements cosine annealing learning rate schedules with linear warmup to ensure smooth loss basin convergence.",
        "Tunes critical hyperparameters including batch size, weight decay, dropout probability, and layer width.",
        "Utilizes Bayesian optimization and Tree-structured Parzen Estimators for automated search space traversal.",
        "Balances computational budget against convergence speed to identify the Pareto-optimal parameter frontier.",
        "Enforces deterministic seed control across all random generators to guarantee strict scientific reproducibility.",
      ],
      [
        "Processes partitioned data blocks concurrently through multi-headed attention and cross-modal projection heads.",
        "Executes discrete state machine transitions with formal verification to eliminate race conditions.",
        "Implements mixed-precision arithmetic pipelines to double memory throughput and minimize hardware stall cycles.",
        "Applies gradient clipping thresholds to maintain stable parameter step updates during steep loss curvature transitions.",
        "Integrates real-time telemetry hooks to monitor per-step gradient norms and activation magnitudes.",
      ],
      [
        "L1 and L2 weight penalties constrain parameter magnitude coefficients, smoothing decision boundaries across noisy margins.",
        "Mitigates overfitting through dropout, spectral regularization, and early stopping on validation loss inflection points.",
        "Examines adversarial vulnerability by evaluating model stability against engineered input perturbations.",
        "Enforces temperature calibration techniques to align predicted probabilities with empirical frequencies.",
        "Ensures fairness, demographic parity, and robustness across edge cases in high-stakes operational environments.",
      ],
      [
        "Comprehensive empirical benchmarks validate performance advantages against conventional baseline architectures.",
        "Achieves marked throughput amplification while simultaneously reducing per-inference computational cycle consumption.",
        "Demonstrates negligible memory footprint growth during sustained long-duration stress test runs at peak load.",
        "Maintains flat, predictable response time curves across increasing concurrency levels where legacy solutions saturate.",
        "Publishes reproducible measurement methodology and telemetry logs conforming to standard academic benchmarks.",
      ],
      [
        "Compresses full-precision parameters into low-bit representations using Post-Training Quantization.",
        "Prunes redundant weight connections and attention heads without incurring statistically significant accuracy penalties.",
        "Fuses adjacent kernel operations into unified compiled hardware primitives for optimal throughput.",
        "Utilizes KV-caching and memory-paged attention blocks to achieve linear memory scaling during sequential generation.",
        "Reduces end-to-end P99 inference latency significantly while conserving GPU and NPU memory bandwidth.",
      ],
      [
        "Packages validated models into containerized microservices utilizing high-throughput inference engines.",
        "Implements real-time telemetry pipelines to monitor data drift, concept drift, and prediction latency in production.",
        "Deploys into autonomous systems, smart manufacturing, financial surveillance, and enterprise analytics platforms.",
        "Reduces operational infrastructure costs through superior hardware efficiency and automated elastic scaling.",
        "Establishes a resilient foundation for the next generation of scalable and intelligent software systems.",
      ],
    ];
  } else {
    coreTitles = [
      "CORE CONCEPTS & THEORETICAL FOUNDATIONS",
      "PRIMARY ARCHITECTURAL PIPELINES & DATA FLOW",
      "FINE-TUNING SYSTEM BUFFERS & RUNTIME PARAMETERS",
      "SECONDARY SUBSYSTEMS & CONCURRENCY MECHANISMS",
      "FINE-TUNING RESOURCE SCHEDULING & CACHE LOCALITY",
      "ARCHITECTURAL APPROACHES: A COMPARATIVE ANALYSIS",
      "ADVANCED TECHNIQUES & RESILIENCE HYBRIDIZATION",
      "APPLICATIONS AND FUTURE DIRECTIONS",
    ];

    coreBulletsMatrix = [
      [
        `Establishes the foundational theoretical principles governing ${titleTopic} within modern computing systems.`,
        "Formulates the core computational problem through rigorous mathematical models and deterministic state constraints.",
        "Decomposes system responsibilities into modular, loosely coupled architectural subsystems with well-defined APIs.",
        "Ensures architectural decoupling between high-throughput ingest layers, business compute, and durable storage.",
        "Provides the theoretical guarantees required for dependable, fault-tolerant execution under heavy production load.",
      ],
      [
        "End-to-end data pipeline routes incoming transactions through validation gates, normalization filters, and queues.",
        "Leverages asynchronous non-blocking event loops to maximize hardware utilization and eliminate thread starvation.",
        "Employs zero-copy buffer handoffs across internal socket layers to conserve system memory bandwidth.",
        "Maintains consistent internal state indices utilizing distributed consensus protocols and atomic memory barriers.",
        "Integrates real-time telemetry hooks to track per-packet serialization, deserialization, and transit latencies.",
      ],
      [
        "Fine-tunes operational parameters including buffer capacities, thread pool allocations, and batch flush timeouts.",
        "Applies adaptive throttling and backpressure signaling to safeguard downstream services during load spikes.",
        "Calibrates timeout thresholds and exponential backoff retry schedules based on live empirical latency profiles.",
        "Conducts systematic sensitivity analysis to isolate the optimal operating envelope across varying workload profiles.",
        "Automates dynamic parameter reconfiguration through runtime control planes without requiring process restarts.",
      ],
      [
        "Executes discrete state machine transitions with formal verification to eliminate race conditions and deadlocks.",
        "Processes partitioned data blocks in parallel utilizing vectorized instructions and multi-core thread pools.",
        "Applies continuous checkpointing to persist incremental state snapshots without halting runtime execution loops.",
        "Validates computational intermediate results against mathematical invariant assertions before final commit.",
        "Ensures exact-once processing semantics through deterministic sequence numbering and deduplication windows.",
      ],
      [
        "Optimizes CPU cache locality by aligning internal data structures along sixty-four byte cache line boundaries.",
        "Controls memory fragmentation utilizing custom slab allocators, avoiding erratic garbage collection pauses.",
        "Demonstrates sub-millisecond latency guarantees under concurrent transaction volumes exceeding high production thresholds.",
        "Employs read-replicas and distributed caching layers to offload repetitive analytical queries effectively.",
        "Dynamically rebalances query workloads across heterogeneous processor cores to prevent thermal throttling.",
      ],
      [
        "Comprehensive empirical benchmarks validate performance advantages against conventional legacy architectures.",
        "Achieves marked throughput amplification while simultaneously reducing per-transaction CPU cycle consumption.",
        "Demonstrates negligible memory footprint growth during sustained long-duration stress test runs at peak load.",
        "Maintains flat, predictable response time curves across increasing concurrency levels where legacy solutions saturate.",
        "Publishes reproducible measurement methodology and telemetry logs conforming to standard academic benchmarks.",
      ],
      [
        "Examines foundational engineering trade-offs between consistency, availability, and partition tolerance.",
        "Balances the performance benefits of aggressive in-memory caching against the overhead of synchronous write durability.",
        "Implements automated circuit breakers and failover mechanisms to isolate and recover from node failures instantaneously.",
        "Ensures zero data loss during simulated catastrophic infrastructure failures using distributed quorum replicas.",
        "Minimizes deployment complexity through declarative infrastructure, automated health probes, and self-healing nodes.",
      ],
      [
        "Widely adopted across mission-critical sectors including financial trading, telecommunications, aerospace, and cloud scale.",
        "Powers real-time mission telemetry processing, fraud prevention pipelines, and distributed ledger networks.",
        "Reduces operational infrastructure costs through superior hardware efficiency and automated elastic scaling.",
        "Identifies open research challenges including post-quantum security integration and edge neuromorphic compilation.",
        "Establishes a resilient foundation for the next generation of autonomous, scalable, and intelligent software systems.",
      ],
    ];
  }

  // Adjust core arrays to match coreCount
  while (coreTitles.length < coreCount) {
    coreTitles.push("ADVANCED SUBSYSTEM ARCHITECTURE & METRICS");
    coreBulletsMatrix.push([
      `Examines advanced subsystem mechanics and internal execution dynamics for ${titleTopic}.`,
      "Applies low-level profiling to identify memory bottlenecks, instruction cache misses, and pipeline stalls.",
      "Optimizes critical code paths through loop unrolling, branch prediction hints, and vectorization.",
      "Validates operational correctness against formal specification benchmarks under randomized fuzzing test suites.",
      "Integrates telemetry metrics directly into production observability dashboards for proactive anomaly detection.",
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
    speakerNotes: `Respected Faculty and dear peers, I am ${studentName}, bearing roll number ${rollNo} from the Department of ${branch}. Today, I am presenting my ${assessment} on the topic "${titleTopic}" under the subject ${subject}. In this presentation, we will walk through the core theoretical foundations, architectural mechanisms, comparative benchmarks, and real-world engineering impact.`,
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
    speakerNotes: `On this index slide, we outline the roadmap of our technical presentation. We will methodically progress through these core modules, starting from theoretical foundations to fine-tuning, comparative evaluation, and industrial applications.`,
  };

  // 3. INTRODUCTION Slide (Strictly ONE cohesive 4-sentence academic paragraph, NO bullets)
  const introParagraph = `${titleTopic} represents a pivotal paradigm in modern computational engineering, establishing rigorous mathematical principles for scalable, deterministic problem-solving. By decomposing complex analytical problem spaces into modular, structured sub-components, this framework systematically addresses longstanding variance, throughput, and latency bottlenecks. In mission-critical enterprise environments, disciplined parameter calibration and runtime optimization are essential to achieve peak algorithmic efficiency and maintain operational stability under volatile workloads. Throughout this technical presentation, we systematically unpack the underlying architectural mechanics, algorithmic workflows, comparative benchmarks, and real-world implementation strategies.`;

  const s3: TechTalkSlide = {
    id: "aat-slide-3",
    slideNumber: 3,
    layout: "paragraph",
    title: "INTRODUCTION",
    category: "DOMAIN OVERVIEW",
    subtitle: "Conceptual Foundation & Problem Scope",
    paragraph: introParagraph,
    speakerNotes: `To introduce our topic, ${titleTopic} represents a pivotal paradigm in modern computing. By addressing traditional scalability and latency bottlenecks, it enables high-throughput, fault-tolerant execution. Throughout this talk, we will break down its fundamental mechanisms and practical optimization strategies.`,
  };

  // 4..N-2: 8 Core Content Slides (Strictly 5 clean, single-sentence bullet points)
  const coreSlides: TechTalkSlide[] = coreTitles.map((titleText, idx) => ({
    id: `aat-slide-${idx + 4}`,
    slideNumber: idx + 4,
    layout: "bullets",
    title: titleText,
    category: "CORE TECHNICAL MODULE",
    subtitle: `Detailed Analysis & Engineering Metrics`,
    bulletPoints: coreBulletsMatrix[idx] || [
      `Applies foundational principles of ${titleTopic} to optimize operational execution.`,
      "Decomposes data transformations across high-performance computational kernels.",
      "Balances latency and throughput constraints through adaptive runtime calibration.",
      "Demonstrates measurable efficiency gains over conventional baseline implementations.",
      "Ensures robust error containment and state consistency during high concurrency bursts.",
    ],
    speakerNotes: `On this slide covering ${titleText}, we examine the key algorithmic dynamics and parameters. Notice how each component contributes to overall system stability and performance efficiency.`,
  }));

  // N-1: CONCLUSION Slide (Strictly ONE cohesive 4-sentence academic summary paragraph, NO bullets)
  const conclusionParagraph = `In summary, our investigation into ${titleTopic} validates that combining robust foundational principles with disciplined fine-tuning yields decisive throughput and computational efficiency dividends. The empirical benchmarks confirm marked reductions in latency and error rates alongside superior generalization capability across demanding real-world constraints. By resolving traditional architectural trade-offs between precision and resource utilization, this framework establishes a proven standard for high-assurance engineering systems. As computational workloads continue to expand, extending these optimization methodologies into real-time distributed and edge environments represents an impactful frontier for ongoing innovation.`;

  const sConclusion: TechTalkSlide = {
    id: `aat-slide-${totalSlides - 1}`,
    slideNumber: totalSlides - 1,
    layout: "paragraph",
    title: "CONCLUSION",
    category: "SUMMARY & TAKEAWAYS",
    subtitle: "Synthesis of Findings & Future Trajectory",
    paragraph: conclusionParagraph,
    speakerNotes: `In conclusion, we have systematically evaluated the core mechanisms, hyperparameter tuning techniques, and comparative trade-offs of ${titleTopic}. The empirical results affirm that this approach achieves superior throughput and computational efficiency across real-world workloads.`,
  };

  // N: THANK YOU Slide (Clean centered THANK YOU, no extra clutter)
  const sThankYou: TechTalkSlide = {
    id: `aat-slide-${totalSlides}`,
    slideNumber: totalSlides,
    layout: "thank-you",
    title: "THANK YOU",
    category: "Q&A",
    subtitle: "Questions & Discussion",
    speakerNotes: `Thank you very much for your time and attentive listening. I would now like to open the floor for any questions, feedback, or technical discussion.`,
  };

  const allSlides = [s1, s2, s3, ...coreSlides, sConclusion, sThankYou];
  return allSlides.map((s, i) => ({ ...s, slideNumber: i + 1, id: `aat-slide-${i + 1}` }));
}

// ============================================================================
// DEEP DETERMINISTIC CLIENT-SIDE SYNTHESIS ENGINE
// ============================================================================

export function synthesizeTechTalkLocally(
  options: GenerateTechTalkOptions
): TechTalkSlide[] {
  if (options.iareMetadata?.isIareMode) {
    return synthesizeIarePresentation(options);
  }

  const { topic, details, slideCount, presenterName, collegeName, eventName } = options;

  const titleTopic = topic.trim() || "Distributed Systems & Cloud Computing";
  const pName = presenterName?.trim() || "Student Presenter";
  const cName = collegeName?.trim() || "Dept. of Computer Science & Engineering";
  const eName = eventName?.trim() || "College Technical Seminar 2026";

  // Topic keyword analysis to specialize content
  const lower = (topic + " " + (details || "")).toLowerCase();
  const isAi = lower.includes("ai") || lower.includes("llm") || lower.includes("model") || lower.includes("neural") || lower.includes("agent");
  const isCrypto = lower.includes("crypto") || lower.includes("security") || lower.includes("quantum") || lower.includes("tls") || lower.includes("zk") || lower.includes("block");
  const isCloud = lower.includes("cloud") || lower.includes("k8s") || lower.includes("distributed") || lower.includes("database") || lower.includes("microservice") || lower.includes("kafka");

  const techDomain = isAi ? "AI & Agentic Systems" : isCrypto ? "Cryptography & Security" : isCloud ? "Cloud & Distributed Systems" : "High-Performance Computing";

  // Master pool of academic slide templates
  const masterSlideTemplates: TechTalkSlide[] = [
    // Slide 1: Cover
    {
      id: "s1",
      slideNumber: 1,
      layout: "title",
      title: titleTopic,
      subtitle: `An In-Depth Investigation into Modern Architectures, Algorithms & Practical Implementations`,
      category: "ACADEMIC SEMINAR",
      columns: [
        {
          title: "Presenter Information",
          bullets: [
            `Lead Presenter: ${pName}`,
            `Institution: ${cName}`,
            `Forum: ${eName}`,
            `Academic Year: 2026`,
          ],
        },
      ],
      speakerNotes: `Good morning respected professors and fellow peers. Today, I am proud to present our technical seminar on ${titleTopic}. Over the next fifteen minutes, we will unpack the foundational theory, architectural mechanisms, and real-world benchmarks that make this technology a game changer.`,
    },

    // Slide 2: Agenda
    {
      id: "s2",
      slideNumber: 2,
      layout: "three-card",
      title: "Seminar Roadmap & Agenda",
      subtitle: "A systematic traversal from first principles to production evaluation",
      category: "EXECUTIVE OVERVIEW",
      cards: [
        {
          tag: "PHASE 1",
          title: "Theory & Problem Space",
          text: "Critical limitations of legacy architectures, mathematical formulations, and foundational primitives.",
        },
        {
          tag: "PHASE 2",
          title: "Architecture & Mechanics",
          text: "Component orchestration, end-to-end data pipelines, algorithms, and protocol execution flows.",
        },
        {
          tag: "PHASE 3",
          title: "Benchmarks & Future Scope",
          text: "Empirical throughput and latency metrics, traditional vs. modern trade-offs, and 2026+ open research challenges.",
        },
      ],
      speakerNotes: `To give you a clear roadmap of today's discussion, we have structured this tech talk into three distinct phases. First, we define why legacy systems fall short. Then, we open the hood on the internal mechanics and code. Finally, we analyze quantitative benchmark results and future directions.`,
    },

    // Slide 3: Problem Statement
    {
      id: "s3",
      slideNumber: 3,
      layout: "two-column",
      title: "Problem Statement & Industry Motivation",
      subtitle: "Why traditional legacy methodologies break down at scale",
      category: "MOTIVATION",
      columns: [
        {
          title: "Legacy Infrastructure Bottlenecks",
          bullets: [
            "Exponential scaling costs: O(N²) quadratic overhead under concurrent transaction spikes.",
            "High latency tail distributions: P99 latency degrades by up to 340% during peak loads.",
            "Monolithic fragility: Cascading failures due to tightly coupled state synchronization.",
            "Security vulnerability surface: Vulnerable to side-channel timing attacks and replay payloads.",
          ],
        },
        {
          title: "The Urgent Need for Modernization",
          bullets: [
            "Sub-millisecond SLA requirements for mission-critical modern deployments.",
            "Zero-trust compliance mandates across HIPAA, GDPR, and SOC2 frameworks.",
            "Hardware-efficient memory utilization to operate seamlessly in edge environments.",
            "Resilience against asynchronous network partitions without centralized coordinators.",
          ],
        },
      ],
      speakerNotes: `Let's begin with the core problem statement. In today's production landscape, traditional systems face severe quadratic scaling penalties and unacceptable tail latency. As data volumes surge, we urgently require an architecture that guarantees deterministic performance and zero-trust security.`,
    },

    // Slide 4: Theoretical Foundation
    {
      id: "s4",
      slideNumber: 4,
      layout: "three-card",
      title: "Foundational Concepts & Core Theory",
      subtitle: "The mathematical and algorithmic pillars underlying the paradigm",
      category: "FOUNDATION",
      cards: [
        {
          tag: "CONCEPT A",
          title: "Asynchronous Consensus",
          text: "Decouples state mutation from global lock synchronization using vector clocks and conflict-free replicated data structures.",
        },
        {
          tag: "CONCEPT B",
          title: "Zero-Knowledge Invariants",
          text: "Verifiable algebraic commitments proving state transitions without exposing sensitive plaintext data streams.",
        },
        {
          tag: "CONCEPT C",
          title: "Dynamic Resource Scheduling",
          text: "Adaptive work-stealing thread schedulers with NUMA-aware memory locality minimizing cross-socket cache invalidation.",
        },
      ],
      speakerNotes: `Before examining the system architecture, we must understand the three theoretical pillars shown on this slide. By decoupling state mutation from global locks and using vector commitments, the system maintains strict invariants even during unexpected node failures.`,
    },

    // Slide 5: System Architecture
    {
      id: "s5",
      slideNumber: 5,
      layout: "process-flow",
      title: "End-to-End System Architecture",
      subtitle: "Sequential execution workflow from ingest to persistent settlement",
      category: "SYSTEM ARCHITECTURE",
      processSteps: [
        {
          step: 1,
          title: "Ingestion Gateway",
          desc: "Validates incoming telemetry frames, enforces cryptographic signatures, and applies rate-limiting tokens.",
        },
        {
          step: 2,
          title: "Event Dispatcher",
          desc: "Partitions payloads across zero-copy circular ring buffers using cache-line aligned hash keys.",
        },
        {
          step: 3,
          title: "Execution Core",
          desc: "Runs parallelized deterministic state-machine updates inside isolated WebAssembly/Worker micro-sandboxes.",
        },
        {
          step: 4,
          title: "Audit & Settlement",
          desc: "Emits Merkle root attestations and writes immutable transaction receipts to persistent log storage.",
        },
      ],
      speakerNotes: `Here we see the end-to-end system architecture. Notice the clean four-stage pipelining: incoming requests hit the Ingestion Gateway, get mapped onto ring buffers, execute inside memory-isolated sandboxes, and finally commit Merkle proofs to disk. This design completely eliminates single-point bottlenecks.`,
    },

    // Slide 6: Algorithmic Mechanics
    {
      id: "s6",
      slideNumber: 6,
      layout: "code-algorithm",
      title: "Under the Hood: Algorithmic Mechanics",
      subtitle: "Deterministic state verification & conflict resolution routine",
      category: "ALGORITHM",
      codeSnippet: {
        language: "rust",
        caption: "Core Consensus & Ring-Buffer Dispatch Loop",
        code: `fn dispatch_event_batch(batch: &mut EventBatch) -> Result<Proof, EngineError> {
    // 1. Verify cryptographic batch commitment
    let commitment = Verifier::compute_merkle_root(&batch.transactions)?;
    assert!(batch.header.verify_signature(&commitment));

    // 2. Parallel state mutation with atomic CAS
    batch.transactions.par_iter().for_each(|tx| {
        let state_ref = REGISTRY.get_partition(tx.shard_id);
        state_ref.apply_atomic_mutation(tx.delta);
    });

    // 3. Emit deterministic cryptographic checkpoint
    Ok(Proof::generate(commitment, batch.timestamp))
}`,
      },
      speakerNotes: `On this slide, we examine the actual core dispatch algorithm written in Rust. Step one validates cryptographic commitments. Step two executes lock-free parallel state mutations using atomic compare-and-swap operations. This guarantees zero race conditions while maximizing multi-core CPU utilization.`,
    },

    // Slide 7: Technical Implementation
    {
      id: "s7",
      slideNumber: 7,
      layout: "two-column",
      title: "Technical Implementation & Protocol Stack",
      subtitle: "Layer-by-layer breakdown of protocol primitives and transport abstractions",
      category: "IMPLEMENTATION",
      columns: [
        {
          title: "Transport & Runtime Layer",
          bullets: [
            "gRPC / HTTP/3 over QUIC with 0-RTT connection resumption.",
            "Custom Protobuf schemas eliminating JSON serialization tax.",
            "eBPF socket filters bypassing kernel network stack overhead.",
            "SIMD-accelerated AVX-512 vector parsing routines.",
          ],
        },
        {
          title: "State & Fault Tolerance",
          bullets: [
            "Append-only LSM-Tree storage with bloom filter indexing.",
            "Automated leader election via Raft protocol within 150ms.",
            "Snapshot compaction preventing unbounded disk amplification.",
            "Multi-region quorum replication resilient to 2-node outages.",
          ],
        },
      ],
      speakerNotes: `Moving into the concrete implementation details, the protocol stack leverages QUIC with zero round-trip resumption and eBPF kernel bypass. On the storage side, append-only LSM trees paired with bloom filters provide lightning-fast lookups without random disk seek penalties.`,
    },

    // Slide 8: Real-World Use Cases
    {
      id: "s8",
      slideNumber: 8,
      layout: "three-card",
      title: "Real-World Industrial Case Studies",
      subtitle: "Production deployments demonstrating empirical efficacy across domains",
      category: "CASE STUDIES",
      cards: [
        {
          tag: "CASE 1",
          title: "Global FinTech Exchange",
          text: "Processed 4.8 million transactions per second with sub-100 microsecond settlement during extreme market volatility.",
        },
        {
          tag: "CASE 2",
          title: "Healthcare Telemetry Core",
          text: "Secured 12 million real-time patient biometric sensor streams compliant with strict HIPAA zero-knowledge rules.",
        },
        {
          tag: "CASE 3",
          title: "Autonomous Fleet Mesh",
          text: "Orchestrated peer-to-peer collision avoidance telemetry across 50,000 edge vehicles with 99.999% packet delivery.",
        },
      ],
      speakerNotes: `To demonstrate that this is not merely theoretical, let's examine three production case studies. From high-frequency financial exchanges handling millions of events per second to autonomous vehicular telemetry, the architecture proves robust under real enterprise duress.`,
    },

    // Slide 9: Quantitative Benchmarks
    {
      id: "s9",
      slideNumber: 9,
      layout: "metric-highlight",
      title: "Empirical Performance & Quantitative Benchmarks",
      subtitle: "Experimental validation conducted on AWS c6i.32xlarge cluster (128 vCPUs)",
      category: "EVALUATION",
      metric: {
        value: "4.6x Faster",
        label: "Throughput Acceleration vs. Baseline Industry Standard",
        context: "Sustained 2.45M ops/sec with P99 latency capped under 0.82ms across 100-node distributed cluster.",
      },
      bulletPoints: [
        "Memory footprint reduced by 64% due to arena-allocated zero-copy buffers.",
        "CPU context switches dropped from 142k/sec to under 8k/sec via user-space polling.",
        "Cold-start recovery completed in 1.4 seconds compared to 48.2 seconds in monolithic baseline.",
      ],
      speakerNotes: `Here is the defining quantitative highlight of our research. In standardized cluster benchmarks, the proposed engine demonstrated a 4.6 times throughput acceleration over existing industry baselines. Most importantly, P99 tail latency remained strictly under one millisecond.`,
    },

    // Slide 10: Comparison Table
    {
      id: "s10",
      slideNumber: 10,
      layout: "comparison-table",
      title: "Comparative Analysis: Traditional vs. Modern",
      subtitle: "Side-by-side technical evaluation across key architectural dimensions",
      category: "COMPARISON",
      table: {
        headers: ["Architectural Metric", "Legacy Traditional Approach", "Modern Proposed System"],
        rows: [
          ["Time Complexity", "O(N²) Quadratic Contention", "O(log N) Concurrent Tree"],
          ["P99 Tail Latency", "18.4 ms (High Variance)", "0.82 ms (Deterministic)"],
          ["Fault Recovery SLA", "25 - 60 Seconds (Manual)", "< 1.5 Seconds (Self-Healing)"],
          ["Memory Allocation", "Heap-Allocated with GC Pauses", "Zero-Copy Arena Buffers"],
          ["Security Primitives", "Symmetric Perimeter Firewalls", "Zero-Knowledge Verifiable State"],
        ],
      },
      speakerNotes: `This comparative table summarizes the architectural revolution. Notice the leap from O(N squared) lock contention down to logarithmic complexity, and the reduction of failover times from nearly a minute to under 1.5 seconds. This represents an order-of-magnitude upgrade.`,
    },

    // Slide 11: Security & Limitations
    {
      id: "s11",
      slideNumber: 11,
      layout: "two-column",
      title: "Security Considerations & Practical Limitations",
      subtitle: "Transparent technical trade-offs and mitigation strategies",
      category: "SECURITY & TRADEOFFS",
      columns: [
        {
          title: "Attack Surfaces & Mitigations",
          bullets: [
            "Side-channel timing leaks: Mitigated via constant-time execution algorithms.",
            "Denial-of-Service amplification: Throttled by cryptographically signed rate tokens.",
            "Sybil identity poisoning: Prevented via proof-of-stake node bonding collateral.",
          ],
        },
        {
          title: "Known Engineering Trade-offs",
          bullets: [
            "Initial setup complexity: Requires specialized low-level systems engineering knowledge.",
            "Higher memory footprint during burst synchronization checkpoints.",
            "Debugging non-deterministic edge conditions requires deterministic replay logs.",
          ],
        },
      ],
      speakerNotes: `A thorough technical analysis must acknowledge trade-offs. While constant-time algorithms protect against side-channel leaks, the system requires higher upfront engineering discipline and specialized observability tooling to manage distributed state during network partitions.`,
    },

    // Slide 12: Future Scope
    {
      id: "s12",
      slideNumber: 12,
      layout: "three-card",
      title: "Future Research Scope & 2026+ Horizons",
      subtitle: "Emerging technological vectors set to redefine the next decade",
      category: "FUTURE RESEARCH",
      cards: [
        {
          tag: "HORIZON 1",
          title: "Hardware Offloading (ASIC/FPGA)",
          text: "Implementing cryptographic hash verification and ring buffer arbitration directly onto PCIe SmartNIC cards.",
        },
        {
          tag: "HORIZON 2",
          title: "Self-Optimizing Neural Scheduling",
          text: "Deep reinforcement learning models predicting traffic surges to dynamically adjust CPU governor states in advance.",
        },
        {
          tag: "HORIZON 3",
          title: "Post-Quantum Cryptographic Migrations",
          text: "Transitioning signature schemes to NIST-approved lattice cryptography (ML-KEM and ML-DSA) for quantum immunity.",
        },
      ],
      speakerNotes: `Looking forward to 2026 and beyond, three exciting research frontiers stand out. We anticipate hardware acceleration via SmartNIC FPGAs, autonomous AI-driven scheduling that pre-empts traffic spikes, and the urgent adoption of quantum-resistant lattice cryptography.`,
    },

    // Slide 13: Key Takeaways
    {
      id: "s13",
      slideNumber: 13,
      layout: "two-column",
      title: "Key Takeaways & Summary",
      subtitle: "Core principles and conclusions to remember from this presentation",
      category: "SUMMARY",
      columns: [
        {
          title: "What We Discovered",
          bullets: [
            "Legacy architectures cannot satisfy modern low-latency, zero-trust constraints.",
            "Asynchronous state separation yields dramatic throughput and resilience gains.",
            "Deterministic algorithms ensure predictable P99 SLAs under extreme real-world stress.",
          ],
        },
        {
          title: "Core Recommendations",
          bullets: [
            "Adopt zero-copy ring buffers and eBPF kernel bypass for data-plane traffic.",
            "Prioritize constant-time cryptographic primitives from the architectural inception.",
            "Design for self-healing failover rather than relying on centralized orchestrators.",
          ],
        },
      ],
      speakerNotes: `To summarize our findings today: legacy designs are no longer viable for modern real-time systems. By separating state mutation, utilizing zero-copy buffers, and designing for automated self-healing, we achieve verifiable, ultra-scalable document and computing infrastructure.`,
    },

    // Slide 14: Q&A & References
    {
      id: "s14",
      slideNumber: 14,
      layout: "two-column",
      title: "References & Open Floor Q&A",
      subtitle: "Thank you for your time and engagement! Open for questions and discussion.",
      category: "CONCLUSION",
      columns: [
        {
          title: "Key Academic References",
          bullets: [
            "Lamport, L. 'Time, Clocks, and the Ordering of Events in a Distributed System.' CACM.",
            "Dean, J. & Barroso, L. 'The Tail at Scale.' Communications of the ACM.",
            "NIST Special Publication 800-208: 'Stateful Hash-Based Signature Schemes.'",
            "IEEE Transactions on Dependable and Secure Computing (2025/2026).",
          ],
        },
        {
          title: "Presenter Contact & Acknowledgements",
          bullets: [
            `Presenter: ${pName} (${cName})`,
            `Seminar Topic: ${titleTopic}`,
            `Technical Domain: ${techDomain}`,
            "Special thanks to our Faculty Guide & Department Mentors.",
          ],
        },
      ],
      speakerNotes: `Thank you very much for your kind attention and thoughtful engagement throughout this presentation. The key academic references are listed on the left. I would now be delighted to open the floor for any questions, critiques, or technical discussions.`,
    },
  ];

  // Adjust slide templates count to match exact requested slideCount
  const targetCount = Math.max(8, Math.min(20, slideCount));

  if (targetCount === 14) {
    return masterSlideTemplates;
  }

  if (targetCount < 14) {
    // Trim middle slides gracefully (e.g. drop slide 8, 11, 7 if needed)
    const prioritizedIndices = [0, 1, 2, 3, 4, 5, 8, 9, 11, 12, 13];
    const selected = masterSlideTemplates.filter((_, idx) =>
      prioritizedIndices.slice(0, targetCount).includes(idx)
    );
    // Ensure last slide is always Q&A
    if (selected.length > 0 && selected[selected.length - 1].layout !== "two-column") {
      selected[selected.length - 1] = masterSlideTemplates[masterSlideTemplates.length - 1];
    }
    return selected.map((s, idx) => ({ ...s, slideNumber: idx + 1, id: `slide-${idx + 1}` }));
  }

  // If targetCount > 14 (e.g. 15 to 20 slides), add deep dive slides
  const expanded = [...masterSlideTemplates];
  while (expanded.length < targetCount) {
    const extraNum = expanded.length;
    expanded.splice(expanded.length - 2, 0, {
      id: `extra-${extraNum}`,
      slideNumber: extraNum,
      layout: extraNum % 2 === 0 ? "three-card" : "two-column",
      title: `Deep Dive: Advanced Technical Subsystem ${extraNum - 12}`,
      subtitle: `Granular analysis of edge-case reliability, latency profiling, and kernel integration`,
      category: "DEEP DIVE",
      cards: [
        {
          tag: "ANALYSIS",
          title: "Memory Allocation Profile",
          text: "Zero-fragmentation slab allocators reduce GC stop-the-world pauses to absolute zero.",
        },
        {
          tag: "PROFILING",
          title: "Instruction Cache Hit Rate",
          text: "Optimized function inlining and branch prediction yield 98.4% L1i cache hits.",
        },
        {
          tag: "VERIFICATION",
          title: "Formal TLA+ Verification",
          text: "State machine transitions proven free of deadlocks across 10^9 modeled permutations.",
        },
      ],
      speakerNotes: `On this extended deep-dive slide, we examine the low-level systems profiling and formal verification results. Using TLA plus specifications, we formally verified that state transitions remain deadlock-free across billions of permutation cycles.`,
    });
  }

  return expanded.map((s, idx) => ({ ...s, slideNumber: idx + 1, id: `slide-${idx + 1}` }));
}
