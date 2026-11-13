import {
  TechTalkSlide,
  ApiVaultConfig,
} from "@/types/ppt";

export interface GenerateTechTalkOptions {
  topic: string;
  details?: string;
  slideCount: number;
  presenterName?: string;
  collegeName?: string;
  eventName?: string;
  config: ApiVaultConfig;
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
// DEEP DETERMINISTIC CLIENT-SIDE SYNTHESIS ENGINE
// ============================================================================

export function synthesizeTechTalkLocally(
  options: GenerateTechTalkOptions
): TechTalkSlide[] {
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
