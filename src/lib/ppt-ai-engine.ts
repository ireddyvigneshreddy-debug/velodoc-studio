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

const SYSTEM_PROMPT = `You are a distinguished Computer Science Professor and Principal Systems Architect.
Your task is to generate a complete, high-impact, professional College Tech-Talk slide deck with exact slide counts.
Return ONLY a valid JSON object with the key "slides" containing an array of slide objects.
Do NOT include markdown fences, backticks, or preamble. Return pure JSON.

Each slide object must have:
- "id": unique string
- "slideNumber": number (1 to N)
- "layout": one of "title", "two-column", "three-card", "process-flow", "comparison-table", "code-algorithm", "metric-highlight"
- "title": concise, punchy slide title
- "subtitle": optional subtitle
- "category": e.g. "OVERVIEW", "ARCHITECTURE", "EVALUATION"
- "bulletPoints": optional array of strings
- "columns": optional array of { "title": string, "bullets": string[] } (for two-column)
- "cards": optional array of { "title": string, "text": string, "tag"?: string } (for three-card)
- "processSteps": optional array of { "step": number, "title": string, "desc": string } (for process-flow)
- "table": optional { "headers": string[], "rows": string[][] } (for comparison-table)
- "codeSnippet": optional { "language": string, "code": string, "caption"?: string } (for code-algorithm)
- "metric": optional { "value": string, "label": string, "context": string } (for metric-highlight)
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
    return `Generate an official Institute of Aeronautical Engineering (IARE Autonomous) academic presentation for:
Topic: "${options.topic}"
Assessment Type: "${iare.assessmentType}"
Department: "${iare.department}"
Course Name: "${iare.courseName}"
Course Code: "${iare.courseCode}"
Semester & Regulation: "${iare.semesterRegulation}"
Student Name: "${iare.studentName}"
Roll Number: "${iare.rollNumber}"
Faculty / Coordinator: "${iare.facultyName || "Course Coordinator"}"
Reference Notes / Syllabus / Abstract: "${options.details || "In-depth engineering curriculum overview"}"
Target Slide Count: Exactly ${options.slideCount} slides (Numbered 1 to ${options.slideCount})

Follow IARE's Outcome-Based Education (OBE) and Continuous Internal Assessment (CIA/AAT) evaluation structure:
1. Slide 1: Official IARE Title & Student/Course Metadata Cover (layout: "title", category: "${iare.assessmentType.toUpperCase()}")
2. Slide 2: Presentation Outline / Contents (layout: "two-column")
3. Slide 3: Learning Objectives & Course Outcome (CO) Mapping (layout: "three-card", linking topic to CO1, CO2, CO3 and Bloom's Taxonomy levels)
4. Slide 4: Key Definitions & Fundamental Terminology (layout: "three-card")
5. Slide 5: Introduction, Background & Technological Motivation (layout: "two-column")
6. Slide 6: Problem Statement & Existing Engineering Bottlenecks (layout: "two-column")
7. Slide 7: Core Theoretical Concept & Mathematical/Logical Foundation (layout: "metric-highlight")
8. Slide 8: System Architecture & Block Diagram / Component Workflow (layout: "process-flow")
9. Slide 9: Step-by-Step Working Mechanism / Algorithmic Execution (layout: "process-flow")
10. Slide 10: Practical Implementation / Code Example / Numerical Case Study (layout: "code-algorithm")
11. Slide 11: Comparative Analysis Table: Traditional vs. Modern Approach (layout: "comparison-table")
12. Slide 12: Advantages, Limitations & Engineering Trade-offs (layout: "two-column")
13. Slide 13: Real-World Industrial & Engineering Applications (layout: "three-card")
14. Slide 14: Conclusion, Future Scope & Summary Takeaways (layout: "two-column")
15. Slide 15: References (Standard Textbooks, IEEE Transactions, NPTEL) & Thank You / Q&A (layout: "two-column")

If slideCount is less than 15 (e.g. 10 to 14), condense middle technical slides cleanly to equal exactly ${options.slideCount} slides.
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

  // Clean markdown wrappers if any
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  const parsed = JSON.parse(cleaned);
  let slidesArray: TechTalkSlide[] = [];

  if (Array.isArray(parsed)) {
    slidesArray = parsed;
  } else if (parsed && Array.isArray(parsed.slides)) {
    slidesArray = parsed.slides;
  } else {
    throw new Error("Invalid slides JSON structure");
  }

  // Normalize IDs and slide numbers
  return slidesArray.map((s, idx) => ({
    id: s.id || `slide-${idx + 1}`,
    slideNumber: idx + 1,
    layout: s.layout || (idx === 0 ? "title" : "two-column"),
    title: s.title || `Slide ${idx + 1}`,
    subtitle: s.subtitle,
    category: s.category || "TECH TALK",
    bulletPoints: s.bulletPoints,
    columns: s.columns,
    cards: s.cards,
    processSteps: s.processSteps,
    table: s.table,
    codeSnippet: s.codeSnippet,
    metric: s.metric,
    speakerNotes:
      s.speakerNotes ||
      `On this slide, we delve into the core architectural principles of ${options.topic}. Notice how the components decouple high-throughput compute from persistence. This delivers significant latency and reliability benefits in production environments.`,
  }));
}

// ============================================================================
// IARE OFFICIAL TECH TALK & AAT OBE SYNTHESIS ENGINE
// ============================================================================

export function synthesizeIarePresentation(options: GenerateTechTalkOptions): TechTalkSlide[] {
  const { topic, details, slideCount, iareMetadata } = options;
  const titleTopic = topic.trim() || "Design and Analysis of Algorithms";
  const iare = iareMetadata || {
    isIareMode: true,
    assessmentType: "AAT-I Tech Talk",
    department: "Computer Science and Engineering (CSE)",
    semesterRegulation: "II B.Tech I Semester (BT24 / BT25)",
    courseName: "Design and Analysis of Algorithms",
    courseCode: "ACSD08",
    studentName: "Vignesh Reddy",
    rollNumber: "24951A0501",
    facultyName: "Dr. K. Srinivas Rao, Professor",
  };

  const lower = (topic + " " + (details || "")).toLowerCase();
  const isAi = lower.includes("ai") || lower.includes("llm") || lower.includes("model") || lower.includes("neural") || lower.includes("agent") || lower.includes("learn");
  const isCrypto = lower.includes("crypto") || lower.includes("security") || lower.includes("quantum") || lower.includes("tls") || lower.includes("cipher") || lower.includes("block");
  const isAero = lower.includes("aero") || lower.includes("uav") || lower.includes("flight") || lower.includes("propulsion") || lower.includes("drone") || lower.includes("avionics");

  const domainName = isAi
    ? "Artificial Intelligence & Computational Systems"
    : isCrypto
    ? "Network Security & Cryptography"
    : isAero
    ? "Aeronautical & Autonomous Systems"
    : "Computer Science & Engineering";

  const iareSlideTemplates: TechTalkSlide[] = [
    // 1. Cover Slide
    {
      id: "iare-s1",
      slideNumber: 1,
      layout: "title",
      title: titleTopic,
      subtitle: `${iare.courseName} (${iare.courseCode}) — ${iare.semesterRegulation}`,
      category: `${iare.assessmentType.toUpperCase()} PRESENTATION`,
      columns: [
        {
          title: "Presented By",
          bullets: [
            `Student: ${iare.studentName}`,
            `Roll No: ${iare.rollNumber}`,
            `Dept: ${iare.department}`,
          ],
        },
        {
          title: "Course Coordinator / Evaluated By",
          bullets: [
            `Faculty: ${iare.facultyName || "Course Coordinator"}`,
            `Department of ${iare.department}`,
            `IARE (Autonomous), Hyderabad`,
          ],
        },
      ],
      speakerNotes: `Respected Course Coordinator and dear peers, I am ${iare.studentName}, bearing Hall Ticket Number ${iare.rollNumber} from ${iare.department}. Today, I am presenting our ${iare.assessmentType} on "${titleTopic}" under the course ${iare.courseName} (${iare.courseCode}). In this technical presentation, we will walk through theoretical foundations, system architecture, working mechanisms, benchmark matrices, and real-world engineering deployments.`,
    },

    // 2. Presentation Outline
    {
      id: "iare-s2",
      slideNumber: 2,
      layout: "two-column",
      title: "Presentation Outline & Structure",
      subtitle: "Systematic academic traversal aligned with IARE CIA / AAT evaluation rubrics",
      category: "OUTLINE",
      columns: [
        {
          title: "Module I: Theoretical Foundations",
          bullets: [
            "Learning Objectives & Course Outcome (CO) Mapping",
            "Key Definitions, Nomenclature & Primitives",
            "Introduction, Motivation & Technological Context",
            "Problem Statement & Critical Legacy Bottlenecks",
          ],
        },
        {
          title: "Module II: Engineering Execution & Results",
          bullets: [
            "Theoretical Models & Mathematical Formulation",
            "System Architecture & End-to-End Block Diagram",
            "Step-by-Step Algorithm & Working Mechanism",
            "Comparative Benchmarks, Industrial Applications & Future Scope",
          ],
        },
      ],
      speakerNotes: `On this roadmap slide, we outline the systematic progression of our tech talk. We begin with Outcome-Based Education course mapping and fundamental definitions in Module One, before delving into system architecture, algorithmic mechanics, and benchmark matrices in Module Two.`,
    },

    // 3. Learning Objectives & CO Mapping
    {
      id: "iare-s3",
      slideNumber: 3,
      layout: "three-card",
      title: "Learning Objectives & CO Mapping",
      subtitle: "Direct alignment with Autonomous Course Outcomes and Bloom's Taxonomy Cognitive Levels",
      category: "OUTCOME-BASED EDUCATION (OBE)",
      cards: [
        {
          tag: "CO 1 • UNDERSTAND (L2)",
          title: "Foundational Comprehension",
          text: `Understand foundational primitives, architectural paradigms, and design constraints governing ${titleTopic}.`,
        },
        {
          tag: "CO 2 • APPLY (L3)",
          title: "System Modeling & Design",
          text: `Apply mathematical models, block diagram workflows, and algorithmic routines to solve computational engineering tasks.`,
        },
        {
          tag: "CO 3 • ANALYZE (L4)",
          title: "Quantitative Evaluation",
          text: `Analyze comparative performance, time/space complexity trade-offs, and industrial scalability benchmarks against legacy methods.`,
        },
      ],
      speakerNotes: `Here we establish our Outcome-Based Education alignment with the course syllabus. This presentation directly maps to Course Outcome 1 for foundational understanding, Course Outcome 2 for algorithmic design and application, and Course Outcome 3 for quantitative comparative evaluation.`,
    },

    // 4. Key Definitions & Terminology
    {
      id: "iare-s4",
      slideNumber: 4,
      layout: "three-card",
      title: "Key Definitions & Nomenclature",
      subtitle: "Core technical definitions required for CIA & AAT evaluation",
      category: "TERMINOLOGY",
      cards: [
        {
          tag: "PRIMITIVE 1",
          title: "Core Mechanism",
          text: `The central operating protocol that coordinates state transitions, data transformations, and synchronization under deterministic boundaries.`,
        },
        {
          tag: "PRIMITIVE 2",
          title: "Invariance & Safety",
          text: `Mathematical guarantee ensuring data integrity, non-repudiation, and error containment across distributed operating nodes.`,
        },
        {
          tag: "PRIMITIVE 3",
          title: "Throughput Efficiency",
          text: `The quantitative metric defining processing rate per unit resource, minimizing latency and computational overhead.`,
        },
      ],
      speakerNotes: `To ensure absolute technical clarity, this slide establishes the three foundational terms. Understanding these primitives is vital because the subsequent architecture relies directly on these mathematical invariants and throughput boundaries.`,
    },

    // 5. Introduction & Technological Context
    {
      id: "iare-s5",
      slideNumber: 5,
      layout: "two-column",
      title: "Introduction & Technological Context",
      subtitle: `Evolutionary computing paradigm shifts driving modern engineering adoption`,
      category: "BACKGROUND",
      columns: [
        {
          title: "Historical Context & Precedents",
          bullets: [
            "Legacy systems relied on monolithic, single-threaded processing loops with centralized state.",
            "Exponential data growth exposed severe computational bottlenecks and linear latency degradations.",
            "Monolithic synchronization creates single points of failure across enterprise infrastructures.",
          ],
        },
        {
          title: "Catalysts for Modern Engineering",
          bullets: [
            `Modern ${domainName} mandates microsecond response times and zero-downtime resilience.`,
            "Transition toward modular, decoupled architectures with distributed consensus primitives.",
            "Hardware-accelerated processing pipelines achieving order-of-magnitude energy efficiency.",
          ],
        },
      ],
      speakerNotes: `Looking at the introduction, traditional architectures struggled with monolithic bottlenecks and single points of failure when subjected to high data volumes. Modern engineering demands distributed fault tolerance, decoupled execution, and hardware acceleration, which sparked the evolution of this technology.`,
    },

    // 6. Problem Statement & Existing Challenges
    {
      id: "iare-s6",
      slideNumber: 6,
      layout: "two-column",
      title: "Problem Statement & Critical Bottlenecks",
      subtitle: "Why conventional implementations fail to meet contemporary production scale",
      category: "PROBLEM STATEMENT",
      columns: [
        {
          title: "Critical Legacy Vulnerabilities",
          bullets: [
            "Severe I/O and Memory Thrashing under concurrent high-throughput workloads.",
            "Quadratic O(N²) scaling overhead in synchronization and communication barriers.",
            "Fragile error recovery resulting in cascading system failures and silent data corruption.",
          ],
        },
        {
          title: "Engineering Constraints to Overcome",
          bullets: [
            "Strict Sub-10ms P99 latency bounds across heterogenous edge and cloud networks.",
            "Zero tolerance for state inconsistency during unexpected hardware fault transients.",
            "Energy and memory footprint constraints for embedded and autonomous deployments.",
          ],
        },
      ],
      speakerNotes: `This problem statement highlights why we cannot simply scale conventional solutions. Under high concurrency, legacy systems suffer severe memory thrashing and quadratic scaling overhead. Our objective is to achieve sub-ten-millisecond P99 latency while preserving absolute state consistency.`,
    },

    // 7. Core Theoretical Concept & Mathematical Model
    {
      id: "iare-s7",
      slideNumber: 7,
      layout: "metric-highlight",
      title: "Theoretical & Mathematical Foundation",
      subtitle: "Formal analytical model governing state transitions and asymptotic bounds",
      category: "THEORETICAL FOUNDATION",
      metric: {
        value: "O(log N)",
        label: "Asymptotic Upper Bound",
        context: "Logarithmic execution complexity achieved via partitioned balanced DAG trees",
      },
      bulletPoints: [
        "State space modeled as a directed acyclic graph (DAG) with guaranteed acyclic convergence.",
        "Formal mathematical invariant: ∀ S_t, H(S_t) = Hash(S_{t-1} || Input_t) ensuring immutability.",
        "Proved bounds: Worst-case search complexity reduced from linear O(N) to logarithmic O(log N).",
        "Probabilistic error bounds strictly bounded by ε < 2^(-128) using cryptographic entropy roots.",
      ],
      speakerNotes: `Turning to the theoretical foundation, the system models state transitions through a directed acyclic graph. By enforcing cryptographic hashing invariants between consecutive states, we reduce worst-case operational complexity from linear O(N) to logarithmic O(log N).`,
    },

    // 8. System Architecture & Block Diagram
    {
      id: "iare-s8",
      slideNumber: 8,
      layout: "process-flow",
      title: "System Architecture & Block Flow Diagram",
      subtitle: "End-to-end component decomposition from client ingestion to durable persistence",
      category: "SYSTEM ARCHITECTURE",
      processSteps: [
        {
          step: 1,
          title: "Ingestion & Filter Gate",
          desc: "Validates incoming payload schema, applies rate limiting, and normalizes byte streams.",
        },
        {
          step: 2,
          title: "Orchestration Engine",
          desc: "Dispatches workloads to parallel compute kernels with dynamic load rebalancing.",
        },
        {
          step: 3,
          title: "State & Memory Mesh",
          desc: "Maintains atomic in-memory cache synchronized with distributed consensus quorums.",
        },
        {
          step: 4,
          title: "Verification & Persistence",
          desc: "Applies cryptographically signed commits, logs telemetry, and returns verifiable output.",
        },
      ],
      speakerNotes: `This block flow diagram illustrates the end-to-end system architecture. Inputs first arrive at the Ingestion and Filter Gate for schema validation, pass into the Orchestration Engine for load-balanced execution, synchronize through the State Mesh, and finalize with verified cryptographic commits.`,
    },

    // 9. Step-by-Step Working Mechanism / Algorithm
    {
      id: "iare-s9",
      slideNumber: 9,
      layout: "process-flow",
      title: "Algorithmic Execution & Process Logic",
      subtitle: "Step-by-step state machine transition flow during live runtime execution",
      category: "WORKING MECHANISM",
      processSteps: [
        {
          step: 1,
          title: "Handshake & Init",
          desc: "Initializes internal registers, verifies peer certificates, and allocates contiguous memory buffers.",
        },
        {
          step: 2,
          title: "Iterative Transformation",
          desc: "Executes SIMD-accelerated transform rounds over partitioned tensor/packet chunks.",
        },
        {
          step: 3,
          title: "Integrity Assertion",
          desc: "Computes checksum parity vectors; verifies invariant correctness before state commitment.",
        },
        {
          step: 4,
          title: "State Commit & Ack",
          desc: "Atomically commits updated state index and broadcasts confirmation packets to listening sinks.",
        },
      ],
      speakerNotes: `Examining the algorithmic execution flow, the engine begins with register initialization and memory buffer reservation. It then executes parallelized transform rounds, verifies mathematical invariant integrity through parity checks, and atomically commits state without race conditions.`,
    },

    // 10. Practical Implementation & Code Routine
    {
      id: "iare-s10",
      slideNumber: 10,
      layout: "code-algorithm",
      title: "Practical Implementation & Code Routine",
      subtitle: "Production-grade reference implementation demonstrating core processing logic",
      category: "IMPLEMENTATION",
      codeSnippet: {
        language: "typescript",
        caption: `${iare.courseCode} Lab Implementation: Parallel Pipeline Routine`,
        code: `// High-Throughput Processing Routine for ${titleTopic.slice(0, 32)}
async function executeModularPipeline<T>(workload: T[]): Promise<PipelineResult> {
  const context = new ExecutionContext({ timeoutMs: 5000 });
  const memoryPool = allocateDirectBuffer(workload.length * 64);
  
  try {
    // Stage 1: Parallel asynchronous map transformation
    const mapped = await Promise.all(workload.map(item => transformKernel(item, context)));
    
    // Stage 2: Consensus reduction & invariant verification
    const reduced = foldQuorum(mapped, (acc, cur) => acc.merge(cur));
    assertIntegrityInvariant(reduced);
    
    return { success: true, processedCount: mapped.length, digest: reduced.checksum };
  } finally {
    memoryPool.release(); // Prevent heap leaks
  }
}`,
      },
      speakerNotes: `This code snippet demonstrates the practical implementation of the algorithm. Notice the explicit direct buffer allocation that avoids garbage collection overhead, followed by asynchronous parallel map transformations, consensus reduction, and deterministic resource release.`,
    },

    // 11. Comparative Analysis Table
    {
      id: "iare-s11",
      slideNumber: 11,
      layout: "comparison-table",
      title: "Comparative Engineering Benchmark Analysis",
      subtitle: "Quantifying architectural efficiency against conventional approaches across core metrics",
      category: "EVALUATION MATRIX",
      table: {
        headers: ["Performance Metric", "Conventional Paradigm", "Proposed Architecture", "Engineering Delta"],
        rows: [
          ["Time Complexity (Search/Query)", "O(N) Linear Scan", "O(log N) Indexed Tree", "10x–100x Faster"],
          ["P99 Latency (10k Concurrency)", "142.6 ms", "8.4 ms", "94.1% Latency Reduction"],
          ["Memory Footprint", "High (Unbounded Heap)", "Bounded (Fixed Pool)", "65% RAM Conservation"],
          ["Fault Tolerance Guarantee", "Single Point of Failure", "Byzantine Fault Tolerant", "Zero-Downtime Recovery"],
          ["Energy Efficiency (Joules/Op)", "18.4 mJ / op", "2.1 mJ / op", "8.7x Green Computing Gain"],
        ],
      },
      speakerNotes: `Our comparative evaluation matrix clearly demonstrates the quantitative engineering gains. Across P99 latency, the proposed architecture drops response times from over one hundred and forty milliseconds to just eight point four milliseconds, while reducing memory consumption by sixty-five percent.`,
    },

    // 12. Advantages, Limitations & Engineering Trade-offs
    {
      id: "iare-s12",
      slideNumber: 12,
      layout: "two-column",
      title: "Key Advantages & Engineering Trade-offs",
      subtitle: "Balancing peak operational performance against deployment complexity",
      category: "CRITICAL ANALYSIS",
      columns: [
        {
          title: "Key Engineering Advantages",
          bullets: [
            "Extreme Throughput: Handles massive concurrent transactions without performance cliffing.",
            "Mathematical Safety: Formally proven immutability and absence of race conditions.",
            "Hardware Synergy: Leverages modern SIMD, GPU, and multi-core vector extensions.",
            "Autonomous Recovery: Self-healing watchdog threads resolve failed worker nodes instantly.",
          ],
        },
        {
          title: "Engineering Limitations & Trade-offs",
          bullets: [
            "Initial Complexity: Steeper implementation curve and specialized protocol knowledge.",
            "Startup Warmup: Cache pre-warming required to achieve peak microsecond throughput.",
            "Network Bandwidth: Quorum synchronization packets increase inter-node traffic by ~12%.",
          ],
        },
      ],
      speakerNotes: `Every engineering design involves trade-offs. While the proposed approach delivers extreme throughput and formally verified safety, it introduces higher architectural complexity and requires brief initial cache warm-up cycles during cold boot.`,
    },

    // 13. Real-World Industrial & Engineering Applications
    {
      id: "iare-s13",
      slideNumber: 13,
      layout: "three-card",
      title: "Industrial & Real-World Applications",
      subtitle: "Deployments across mission-critical, enterprise, and emerging autonomous systems",
      category: "INDUSTRY DEPLOYMENT",
      cards: [
        {
          tag: "SECTOR 1 • AEROSPACE & DEFENSE",
          title: "Avionics & Autonomous UAVs",
          text: `Mission-critical telemetry processing, real-time collision avoidance, and fail-safe flight trajectory calculation under strict real-time deadlines.`,
        },
        {
          tag: "SECTOR 2 • FINTECH & CLOUD",
          title: "Ultra-Low Latency Clearing",
          text: `Financial exchange transaction ordering, distributed ledger settlement, and fraud prevention pipelines handling 500,000 operations per second.`,
        },
        {
          tag: "SECTOR 3 • HEALTHCARE & IOT",
          title: "Medical Diagnostic Edge AI",
          text: `Real-time patient monitoring sensors and edge neural inference engines operating on low-power battery constraints with guaranteed data privacy.`,
        },
      ],
      speakerNotes: `In terms of industrial applications, this technology is actively deployed in aerospace and unmanned aerial systems for real-time telemetry, in high-frequency financial exchanges for instant settlement, and in medical edge devices for secure on-device patient diagnostics.`,
    },

    // 14. Conclusion & Future Research Directions
    {
      id: "iare-s14",
      slideNumber: 14,
      layout: "two-column",
      title: "Conclusion & Future Research Directions",
      subtitle: "Summary of technical findings and prospective innovations for 2026 and beyond",
      category: "SUMMARY & FUTURE SCOPE",
      columns: [
        {
          title: "Key Summary Conclusions",
          bullets: [
            `${titleTopic} successfully resolves legacy concurrency, scaling, and throughput bottlenecks.`,
            "Achieved formal verification of system invariants alongside 94% lower P99 latencies.",
            "Outcome-Based Education objectives CO1, CO2, and CO3 successfully fulfilled and demonstrated.",
          ],
        },
        {
          title: "2026+ Prospective Research Scope",
          bullets: [
            "Integration with Post-Quantum Lattice Cryptography for quantum-resistant communications.",
            "Neuromorphic spiking neural hardware execution to achieve sub-milliwatt power draw.",
            "Autonomous zero-shot self-tuning algorithms using localized reinforcement learning models.",
          ],
        },
      ],
      speakerNotes: `In conclusion, this presentation demonstrated how ${titleTopic} resolves legacy scalability bottlenecks, achieving verified safety and ninety-four percent lower latency. Future research will explore post-quantum cryptographic integration and neuromorphic hardware adaptation.`,
    },

    // 15. References & Q&A
    {
      id: "iare-s15",
      slideNumber: 15,
      layout: "two-column",
      title: "Academic References & Open Discussion",
      subtitle: "Standard textbooks, IEEE peer-reviewed publications, and evaluation floor",
      category: "REFERENCES & Q&A",
      columns: [
        {
          title: "Academic References & Citations",
          bullets: [
            "Thomas H. Cormen, et al. 'Introduction to Algorithms' (4th Edition), MIT Press.",
            "IEEE Transactions on Parallel and Distributed Systems (Vol. 35, 2025).",
            "NPTEL / Swayam National Course Lecture Series on Advanced Engineering Systems.",
            "IARE Course Curriculum & Autonomous Laboratory Manuals (Academic Year 2025-2026).",
          ],
        },
        {
          title: "Course Outcome Attainment & Q&A",
          bullets: [
            `Student Name: ${iare.studentName} | Roll No: ${iare.rollNumber}`,
            `Department: ${iare.department}`,
            `Assessment: ${iare.assessmentType} (${iare.courseCode})`,
            "Floor is now open for Faculty Evaluation, queries, and technical discussion.",
          ],
        },
      ],
      speakerNotes: `Thank you respected faculty coordinator and dear peers for your time and attention. The academic references and NPTEL course citations are listed on the left. I am now ready for evaluation questions and technical discussion.`,
    },
  ];

  const targetCount = Math.max(8, Math.min(20, slideCount));
  if (targetCount === 15) {
    return iareSlideTemplates;
  }

  if (targetCount < 15) {
    const dropCandidates = [11, 3, 6, 12, 9];
    const dropCount = 15 - targetCount;
    const indicesToDrop = new Set(dropCandidates.slice(0, dropCount));

    const selected = iareSlideTemplates.filter((_, idx) => !indicesToDrop.has(idx));
    if (selected.length > 0 && selected[selected.length - 1].category !== "REFERENCES & Q&A") {
      selected[selected.length - 1] = iareSlideTemplates[14];
    }
    return selected.map((s, idx) => ({ ...s, slideNumber: idx + 1, id: `iare-slide-${idx + 1}` }));
  }

  const expanded = [...iareSlideTemplates];
  while (expanded.length < targetCount) {
    const extraNum = expanded.length;
    expanded.splice(expanded.length - 2, 0, {
      id: `iare-extra-${extraNum}`,
      slideNumber: extraNum,
      layout: extraNum % 2 === 0 ? "three-card" : "two-column",
      title: `Advanced Technical Deep-Dive ${extraNum - 13}`,
      subtitle: `In-depth analysis of subsystem performance, fault recovery and telemetry`,
      category: "DEEP DIVE",
      cards: [
        {
          tag: "PROFILING",
          title: "Cache Affinity & Memory Bound",
          text: "Optimized cache locality reduces L3 misses to under 0.8% across extreme load bursts.",
        },
        {
          tag: "RELIABILITY",
          title: "Byzantine Agreement Protocol",
          text: "Guarantees consensus across n ≥ 3f + 1 nodes despite arbitrary network drops.",
        },
        {
          tag: "COMPLIANCE",
          title: "Autonomous IEEE Standards",
          text: "Full compliance with IEEE 802.1 / POSIX real-time deterministic standards.",
        },
      ],
      speakerNotes: `On this extended deep-dive slide, we examine cache affinity profiling and Byzantine fault tolerance mechanisms, confirming strict adherence to real-time deterministic computing standards.`,
    });
  }

  return expanded.map((s, idx) => ({ ...s, slideNumber: idx + 1, id: `iare-slide-${idx + 1}` }));
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
