export type PocCategory = "container" | "serverless" | "cloud-xdr" | "ai";

export type StoryKind = "story" | "follow-on" | "extra";

export interface PocStory {
  id: string;
  category: PocCategory;
  kind: StoryKind;
  /** Primary story number (1 or 2). Follow-ons/extras omit this in the UI badge. */
  storyIndex?: 1 | 2;
  /** Workload this chain targets (chat-rag vs frontend, etc.). */
  targetResource: string;
  title: string;
  /** One sentence: what this story does. */
  blurb: string;
  /** Longer detail kept for docs / future UI — not shown on the main card. */
  underTheHood: string;
  /** One line: what to watch for in your tooling. */
  lookFor: string;
  /** Seconds between automated steps (helps tools space events). */
  stepGapSeconds?: number;
  pocIds: string[];
  continueIn?: { tab: PocCategory; storyId: string; label: string };
}

export interface SecurityPoc {
  id: string;
  category: PocCategory;
  cve: string;
  title: string;
  method: "POST" | "GET";
  apiPath: string;
  description: string;
  outcome: string;
  signals: string[];
  requiresPillow?: boolean;
  awsOnly?: boolean;
  lambdaOnly?: boolean;
}

export const POC_CATEGORIES: Array<{
  id: PocCategory;
  label: string;
  blurb: string;
}> = [
  {
    id: "container",
    label: "Container CVEs",
    blurb: "Path traversal, Pillow RCE, and post-exploit runtime on chat-rag.",
  },
  {
    id: "serverless",
    label: "Lambda & storefront",
    blurb: "React2Shell on the Next.js app and PyYAML on order-webhook.",
  },
  {
    id: "cloud-xdr",
    label: "Cloud XDR",
    blurb: "Task metadata creds, IAM enumeration, and S3 exfiltration.",
  },
  {
    id: "ai",
    label: "AI & Maya",
    blurb: "Order hijack, OWASP LLM Top 10, and unauthenticated RAG admin.",
  },
];

export const SECURITY_POCS: SecurityPoc[] = [
  {
    id: "design-gallery-leak",
    category: "ai",
    cve: "CWE-639",
    title: "List everyone's custom boards",
    method: "GET",
    apiPath: "/api/board?designs=1",
    signals: ["Unauthenticated API", "Broken object-level authorization"],
    description:
      "Unauthenticated GET /designs on board-generator returns every Create-A-Board design.",
    outcome: "Gallery of all custom board IDs and image URLs — no ownership check.",
  },
  {
    id: "react2shell",
    category: "serverless",
    cve: "CVE-2025-55182",
    title: "Exploit React2Shell on the frontend",
    method: "POST",
    apiPath: "/api/security/demo/react2shell",
    signals: [
      "Operating system utilities processes",
      "Shell Process Redirect",
      "Crypto mining threats",
      "Sensitive file access",
    ],
    description:
      "Uses React2Shell (CVE-2025-55182) against Next.js App Router to run post-RCE tooling in the frontend process.",
    outcome: "Process activity (shell, downloader, sensitive reads, miner sim) from the frontend container.",
  },
  {
    id: "pillow-rce",
    category: "container",
    cve: "CVE-2023-50447",
    title: "Gain code execution via Pillow",
    method: "POST",
    apiPath: "/api/security/demo/pillow",
    requiresPillow: true,
    signals: [
      "Operating system utilities processes",
      "Shell Process Redirect",
      "Out Of Baseline",
    ],
    description: "Exploits Pillow 10.0.1 ImageMath.eval for local code execution in chat-rag.",
    outcome: "Runs a short identity probe after RCE — discrete process activity in chat-rag.",
  },
  {
    id: "shell-pipe",
    category: "container",
    cve: "CWE-78",
    title: "Redirect a shell through a pipe",
    method: "POST",
    apiPath: "/api/security/demo/runtime/shell-pipe",
    signals: [
      "Interactive shell process stream redirected to a pipe",
      "Shell Process Redirect",
      "Operating system utilities processes",
    ],
    description: "Spawns real shell utilities with stdio wired through pipes (id, tee, interactive sh).",
    outcome: "Interactive shell / pipe-shaped process patterns.",
  },
  {
    id: "cve-probe-story",
    category: "container",
    cve: "CVE-2023-50447",
    title: "One-shot post-exploit probe",
    method: "POST",
    apiPath: "/api/security/demo/runtime/cve-probe-story",
    requiresPillow: false,
    signals: [
      "Suspicious CVE Exploitation Probing",
      "Crypto mining threats",
      "Shell Process Redirect",
      "Package Managers Processes",
      "Drift",
    ],
    description:
      "Compressed replay of several post-exploit techniques in one request (handy for a single detection window).",
    outcome: "Bundled process + network activity typical of CVE probing after foothold.",
  },
  {
    id: "cryptominer-sim",
    category: "container",
    cve: "CWE-400",
    title: "Simulate a crypto miner",
    method: "POST",
    apiPath: "/api/security/demo/runtime/cryptominer-sim",
    signals: ["Crypto mining threats", "CryptoMiners Services DNS"],
    description: "Harmless simulation: drop a renamed xmrig binary and resolve known mining-pool DNS names.",
    outcome: "Miner-shaped process chain plus mining-pool DNS lookups.",
  },
  {
    id: "curl-pipe-sh",
    category: "container",
    cve: "T1059 / T1105",
    title: "Download and pipe to shell",
    method: "POST",
    apiPath: "/api/security/demo/runtime/curl-pipe-sh",
    signals: ["Operating system utilities processes", "Out Of Baseline"],
    description: "Runs curl | sh against a harmless local script (supply-chain shaped).",
    outcome: "curl + sh pipe pattern with a /tmp marker.",
  },
  {
    id: "renamed-downloader",
    category: "container",
    cve: "T1036 / T1105",
    title: "Run a renamed downloader",
    method: "POST",
    apiPath: "/api/security/demo/runtime/renamed-downloader",
    signals: ["Operating system utilities processes", "Out Of Baseline"],
    description: "Copies curl to a hidden path, then executes it under a fake name.",
    outcome: "Renamed-binary / process-masquerade signal from /tmp.",
  },
  {
    id: "package-manager",
    category: "container",
    cve: "CWE-494",
    title: "Install a package with pip",
    method: "POST",
    apiPath: "/api/security/demo/runtime/package-manager",
    signals: ["Package Managers Processes", "Drift"],
    description: "Runs pip install inside the live chat-rag container.",
    outcome: "Package-manager process activity inside a running container.",
  },
  {
    id: "sensitive-file-cat",
    category: "container",
    cve: "T1005",
    title: "Read sensitive host files",
    method: "POST",
    apiPath: "/api/security/demo/runtime/sensitive-file-cat",
    signals: [
      "Sensitive file access",
      "Sensitive System File Access",
      "System Information File Access",
      "Operating system utilities processes",
    ],
    description: "Cats /etc/passwd, /etc/hosts, and selected /proc files via discrete processes.",
    outcome: "Sensitive file-read process/file events.",
  },
  {
    id: "path-traversal",
    category: "container",
    cve: "CVE-2021-41773",
    title: "Steal files via path traversal",
    method: "GET",
    apiPath: "/api/security/demo/traversal",
    signals: [
      "Sensitive file access",
      "Sensitive System File Access",
      "System Information File Access",
      "Operating system utilities processes",
    ],
    description: "Legacy download path reads a confidential file, then probes system paths.",
    outcome: "Path traversal plus sensitive file access on chat-rag.",
  },
  {
    id: "metadata-creds",
    category: "container",
    cve: "CWE-918",
    title: "Steal task credentials from metadata",
    method: "POST",
    apiPath: "/api/security/demo/runtime/metadata-creds",
    awsOnly: true,
    signals: [
      "AWS credentials access",
      "Metadata DNS rebind",
      "Lookup IP Services DNS",
    ],
    description: "Queries the ECS task metadata endpoint for temporary IAM credentials.",
    outcome: "Redacted AWS creds from the task role — gateway to identity abuse.",
  },
  {
    id: "order-yaml-checkout",
    category: "serverless",
    cve: "CVE-2020-14343",
    title: "Poison checkout with unsafe YAML",
    method: "POST",
    apiPath: "/api/security/demo/order-yaml-checkout",
    lambdaOnly: true,
    signals: [
      "API custom rules — poisoned checkout",
      "CVE-2020-14343 / unsafe deserialization",
      "Shell Process Redirect",
      "Crypto mining threats",
      "CloudTrail identity",
      "CloudTrail S3 ListBuckets",
    ],
    description:
      "Sends a poisoned POST /checkout to the order-webhook Lambda — unsafe YAML deserialize into a post-exploit sequence.",
    outcome: "Full serverless kill chain on the order webhook (process, identity, storage, miner sim).",
  },
  {
    id: "iam-role-abuse",
    category: "cloud-xdr",
    cve: "CWE-269",
    title: "Enumerate IAM with the task role",
    method: "POST",
    apiPath: "/api/security/demo/iam-abuse",
    awsOnly: true,
    signals: ["CloudTrail / identity", "AWS credentials access"],
    description: "Abuses the overprivileged ECS task role — ListBuckets, ListRoles, ListSecrets.",
    outcome: "CloudTrail identity enumeration after container compromise.",
  },
  {
    id: "s3-exfil",
    category: "cloud-xdr",
    cve: "CWE-200",
    title: "List and read S3 as the task role",
    method: "POST",
    apiPath: "/api/security/demo/runtime/s3-exfil",
    awsOnly: true,
    signals: ["CloudTrail S3 APIs", "IAM role abuse chain"],
    description: "Enumerates S3 buckets and samples objects using the task role.",
    outcome: "S3 list/get via cloud IAM — post-compromise data access.",
  },
  {
    id: "ai-order-hijack",
    category: "ai",
    cve: "LLM02:2025 + LLM06:2025",
    title: "Discover and hijack a shipment via support chat",
    method: "POST",
    apiPath: "/api/security/demo/runtime/ai-order-hijack",
    signals: [
      "In-cloud AI inference",
      "DynamoDB Scan/UpdateItem",
      "Cross-customer data disclosure",
      "AI tool abuse (IDOR)",
    ],
    description:
      "Jordan asks Maya which longboards are still shipping, learns Sam's order ID, then says ship it to my address on file.",
    outcome: "Sam's paid Classic Longboard redirects to Jordan's Hermosa Beach address in DynamoDB.",
  },
  {
    id: "ai-chat-unauth",
    category: "ai",
    cve: "LLM01:2025",
    title: "Prompt injection (unauthenticated chat)",
    method: "POST",
    apiPath: "/api/security/demo/runtime/ai-prompt-injection",
    signals: ["Communication to External AI Service", "Prompt injection", "AI SPM"],
    description:
      "OWASP LLM01 — sends a direct prompt-injection style request through the open chat API.",
    outcome: "Unauthenticated LLM call with instruction-override prompt.",
  },
  {
    id: "unauth-reindex",
    category: "ai",
    cve: "CWE-306",
    title: "Rebuild the RAG index without auth",
    method: "POST",
    apiPath: "/api/security/demo/reindex",
    signals: ["AI admin action", "Unauthorized API"],
    description: "Wipes and rebuilds the RAG knowledge base with no authentication.",
    outcome: "Unauthorized admin action on the AI data plane — picks up planted demo secrets.",
  },
  {
    id: "ai-sensitive-disclosure",
    category: "ai",
    cve: "LLM02:2025",
    title: "Disclose sensitive data via RAG",
    method: "POST",
    apiPath: "/api/security/demo/runtime/ai-sensitive-disclosure",
    signals: ["Sensitive data in RAG corpus", "PII / secret disclosure via AI"],
    description:
      "OWASP LLM02 — retrieves planted VIP emails and an internal API key from the knowledge base.",
    outcome: "Sensitive docs (and often the model reply) expose demo PII/secrets.",
  },
  {
    id: "langchain-ai",
    category: "ai",
    cve: "LLM03:2025",
    title: "Exercise vulnerable AI packages",
    method: "POST",
    apiPath: "/api/security/demo/runtime/langchain-ai",
    signals: [
      "AI SPM / vulnerable AI packages",
      "Operating system utilities processes",
      "Shell Process Redirect",
      "Package Managers Processes",
      "Crypto mining threats",
    ],
    description:
      "OWASP LLM03 supply chain — pinned langchain-community / chromadb CVEs plus light tooling on chat-rag.",
    outcome: "SCA package signals plus process activity from the AI workload.",
  },
  {
    id: "ai-poison",
    category: "ai",
    cve: "LLM04:2025",
    title: "Poison the vector store",
    method: "POST",
    apiPath: "/api/security/demo/runtime/ai-poison",
    signals: ["Unauthenticated RAG write", "Poisoned embedding retrieval"],
    description:
      "OWASP LLM04 — unauthenticated upsert of a fake FREEBOARD promo into Chroma, then retrieves it.",
    outcome: "Poisoned chunk is written and comes back from similarity search.",
  },
  {
    id: "ai-xss-output",
    category: "ai",
    cve: "LLM05:2025",
    title: "Unsafe HTML in model output",
    method: "POST",
    apiPath: "/api/security/demo/runtime/ai-xss-output",
    signals: ["HTML/JS in model output", "Client-side XSS if unsanitized"],
    description:
      "OWASP LLM05 — obtains executable HTML/JS as assistant output (falls back to a canned payload).",
    outcome: "Unsafe HTML written for a render-as-HTML XSS demo.",
  },
  {
    id: "ai-system-prompt-leak",
    category: "ai",
    cve: "LLM07:2025",
    title: "Leak the system prompt",
    method: "POST",
    apiPath: "/api/security/demo/runtime/ai-system-prompt-leak",
    signals: ["System prompt secret extraction", "Instruction leakage"],
    description:
      "OWASP LLM07 — the system prompt embeds a staff PIN / wholesale code; asks the model to repeat it.",
    outcome: "Prompt-leak attempt against system instructions that contain workshop secrets.",
  },
  {
    id: "ai-rag-embedding",
    category: "ai",
    cve: "LLM08:2025",
    title: "Abuse vector / embedding retrieval",
    method: "POST",
    apiPath: "/api/security/demo/runtime/ai-rag-embedding",
    signals: ["Insecure RAG retrieval", "No tenant/ACL on embeddings"],
    description:
      "OWASP LLM08 — similarity search returns sensitive or poisoned chunks with no access control.",
    outcome: "Vector hits on confidential and/or poisoned embeddings.",
  },
  {
    id: "ai-unbounded",
    category: "ai",
    cve: "LLM10:2025",
    title: "Burn tokens with unbounded calls",
    method: "POST",
    apiPath: "/api/security/demo/runtime/ai-unbounded",
    signals: ["Burst LLM/token spend", "No rate limit on AI API"],
    description:
      "OWASP LLM10 — fires multiple unauthenticated chat completions in one request (cost/availability).",
    outcome: "Burst of LLM calls with aggregated token counts.",
  },
];

export const POC_STORIES: PocStory[] = [
  {
    id: "ai-support-hijack",
    category: "ai",
    kind: "story",
    storyIndex: 1,
    targetResource: "chat-rag + DynamoDB",
    title: "Free surfboard via support chat",
    blurb:
      "Jordan signs in, discovers Sam's paid longboard through Maya's order search, then redirects it to his saved address — UI auth was fine; the AI agent wasn't.",
    underTheHood:
      "search_orders (cross-tenant scan) → get_saved_shipping_address → update_shipping_address (no ownership check) on Bedrock + DynamoDB.",
    lookFor:
      "Bedrock Converse · DynamoDB Scan + UpdateItem · LLM02 disclosure · LLM06 excessive agency · MITRE AML.T0051",
    stepGapSeconds: 10,
    pocIds: ["path-traversal", "ai-order-hijack", "metadata-creds", "iam-role-abuse"],
    continueIn: {
      tab: "cloud-xdr",
      storyId: "identity-to-data",
      label: "Continue with identity → S3",
    },
  },
  {
    id: "story-1-cve-probing",
    category: "container",
    kind: "story",
    storyIndex: 1,
    targetResource: "chat-rag",
    title: "Post-exploit toolkit on chat-rag",
    blurb:
      "After a path-traversal / RCE foothold, runs shell, downloaders, secret reads, a miner sim, and package probing on the chat service.",
    underTheHood:
      "Traversal → Pillow RCE → shell pipe → curl|sh → renamed downloader → sensitive cat → xmrig sim → pip → optional one-shot probe.",
    lookFor: "Process, shell redirects, renamed binaries, sensitive files, mining DNS, and pip on chat-rag",
    stepGapSeconds: 8,
    pocIds: [
      "path-traversal",
      "pillow-rce",
      "shell-pipe",
      "curl-pipe-sh",
      "renamed-downloader",
      "sensitive-file-cat",
      "cryptominer-sim",
      "package-manager",
      "cve-probe-story",
    ],
    continueIn: {
      tab: "cloud-xdr",
      storyId: "identity-to-data",
      label: "Continue with identity → S3",
    },
  },
  {
    id: "story-2-frontend-rce",
    category: "serverless",
    kind: "story",
    storyIndex: 2,
    targetResource: "frontend + order-webhook",
    title: "Frontend RCE → serverless checkout",
    blurb:
      "Exploits React2Shell on the storefront, then sends a poisoned order to the serverless checkout webhook.",
    underTheHood:
      "Frontend Node post-RCE toolkit, then PyYAML deserialization kill chain on order-webhook Lambda.",
    lookFor: "Process on frontend · unsafe YAML on Lambda · follow-on crypto / identity noise",
    stepGapSeconds: 8,
    pocIds: ["react2shell", "order-yaml-checkout"],
  },
  {
    id: "identity-to-data",
    category: "cloud-xdr",
    kind: "follow-on",
    targetResource: "chat-rag + AWS APIs",
    title: "Steal task role → reach S3",
    blurb:
      "Pulls temporary credentials from task metadata, enumerates IAM, then lists and reads S3 as the workload.",
    underTheHood: "Fargate metadata creds → IAM enumeration → S3 list/get.",
    lookFor: "CloudTrail · metadata / IMDS credentials · S3 APIs",
    stepGapSeconds: 8,
    pocIds: ["metadata-creds", "iam-role-abuse", "s3-exfil"],
  },
  {
    id: "ai-data-plane",
    category: "ai",
    kind: "extra",
    targetResource: "chat-rag",
    title: "OWASP LLM Top 10 on the shop AI",
    blurb:
      "Eight LLM risks on chat-rag: prompt injection, sensitive disclosure, supply chain, data poisoning, unsafe output, system-prompt leak, vector abuse, and unbounded token spend.",
    underTheHood:
      "LLM01 injection → reindex → LLM02 SID → LLM03 packages → LLM04 poison → LLM05 XSS HTML → LLM07 prompt leak → LLM08 embeddings → LLM10 burst chat.",
    lookFor:
      "AI egress · unauth RAG write/read · secret/PII in context · package CVEs · burst token use",
    stepGapSeconds: 8,
    pocIds: [
      "ai-chat-unauth",
      "unauth-reindex",
      "ai-sensitive-disclosure",
      "langchain-ai",
      "ai-poison",
      "ai-xss-output",
      "ai-system-prompt-leak",
      "ai-rag-embedding",
      "ai-unbounded",
    ],
  },
];

export function getStoriesForCategory(category: PocCategory): PocStory[] {
  return POC_STORIES.filter((story) => story.category === category);
}

/** All stories in presenter order: featured chains first, extras last. */
export function getOrderedStories(): PocStory[] {
  const order: PocStory["kind"][] = ["story", "follow-on", "extra"];
  return [...POC_STORIES].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}

export function isPocBlocked(
  poc: SecurityPoc,
  findings: {
    active_cves: Array<{ cve: string }>;
    aws_runtime: boolean;
    lambda_enabled: boolean;
  }
): boolean {
  if (poc.requiresPillow && findings.active_cves.every((c) => !c.cve.includes("50447"))) {
    return true;
  }
  if (poc.awsOnly && !findings.aws_runtime) return true;
  if (poc.lambdaOnly && !findings.lambda_enabled) return true;
  return false;
}
