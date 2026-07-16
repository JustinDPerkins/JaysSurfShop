import type { ShopTrafficStep } from "@/lib/shopTraffic";
import {
  AI_DISCLOSURE_PROMPT,
  AI_SYSTEM_LEAK_PROMPT,
  AI_UNBOUNDED_PROMPTS,
  AI_XSS_PROMPT,
  MIDDLEWARE_BYPASS_HEADER,
  ORDER_HIJACK_DISCOVER,
  ORDER_HIJACK_SHIP,
  catalogPreviewStep,
  PROMPT_INJECTION,
  TRAVERSAL_SHOP_PATH,
  YAML_CHECKOUT_BODY,
} from "@/lib/shopTraffic";

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
  /**
   * Browser-visible storefront/API requests fired first so sensors see real traffic
   * (not only /api/security/demo/*). TraditionalJay-style.
   */
  shopTraffic?: ShopTrafficStep[];
  /** If true, skip apiPath and use the last shopTraffic response as the PoC result. */
  shopTrafficOnly?: boolean;
  headers?: Record<string, string>;
  body?: unknown;
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
    shopTrafficOnly: true,
    shopTraffic: [{ method: "GET", path: "/api/board?designs=1", label: "board-designs" }],
    signals: ["Unauthenticated API", "Broken object-level authorization"],
    description:
      "Browser GET /api/board?designs=1 — same unauthenticated gallery as Create-A-Board.",
    outcome: "Gallery of all custom board IDs and image URLs — no ownership check.",
  },
  {
    id: "react2shell",
    category: "serverless",
    cve: "CVE-2025-55182",
    title: "Exploit React2Shell on the frontend",
    method: "POST",
    apiPath: "/",
    shopTrafficOnly: true,
    shopTraffic: [
      {
        method: "GET",
        path: "/admin",
        headers: MIDDLEWARE_BYPASS_HEADER,
        label: "middleware-bypass-/admin",
      },
    ],
    signals: [
      "Operating system utilities processes",
      "Shell Process Redirect",
      "Crypto mining threats",
      "Sensitive file access",
      "RSC Flight / Next-Action exploit traffic",
    ],
    description:
      "Browser POSTs a real CVE-2025-55182 RSC Flight multipart payload (Next-Action) to / — unauthenticated RCE in the Next.js process, then post-exploit toolkit.",
    outcome:
      "Real Flight deserialization RCE; id/tee/cat/xmrig argv0 processes from the frontend container (not a demo harness).",
  },
  {
    id: "pillow-rce",
    category: "container",
    cve: "CVE-2023-50447",
    title: "Gain code execution via Pillow",
    method: "POST",
    apiPath: "/api/catalog/preview",
    shopTrafficOnly: true,
    requiresPillow: true,
    shopTraffic: [
      { method: "GET", path: TRAVERSAL_SHOP_PATH, label: "foothold-path-traversal" },
      catalogPreviewStep(['post_rce'], "catalog-preview-pillow-rce"),
    ],
    signals: [
      "Operating system utilities processes",
      "Shell Process Redirect",
      "Out Of Baseline",
    ],
    description:
      "Starts with real GET /api/legacy/download foothold, then exploits Pillow 10.0.1 ImageMath.eval in chat-rag.",
    outcome: "Shop-shaped traversal HTTP + identity probe after RCE in chat-rag.",
  },
  {
    id: "shell-pipe",
    category: "container",
    cve: "CWE-78",
    title: "Redirect a shell through a pipe",
    method: "POST",
    apiPath: "/api/catalog/preview",
    shopTrafficOnly: true,
    shopTraffic: [
      { method: "GET", path: TRAVERSAL_SHOP_PATH, label: "foothold-path-traversal" },
      catalogPreviewStep(['shell-pipe'], "catalog-preview-shell-pipe"),
    ],
    signals: [
      "Interactive shell process stream redirected to a pipe",
      "Shell Process Redirect",
      "Operating system utilities processes",
    ],
    description: "Real download foothold HTTP, then shell utilities with stdio through pipes.",
    outcome: "Shop HTTP + interactive shell / pipe-shaped process patterns.",
  },
  {
    id: "cve-probe-story",
    category: "container",
    cve: "CVE-2023-50447",
    title: "One-shot post-exploit probe",
    method: "POST",
    apiPath: "/api/catalog/preview",
    shopTrafficOnly: true,
    requiresPillow: false,
    shopTraffic: [
      { method: "GET", path: TRAVERSAL_SHOP_PATH, label: "foothold-path-traversal" },
      catalogPreviewStep(['post_rce'], "catalog-preview-cve-probe-story"),
    ],
    signals: [
      "Suspicious CVE Exploitation Probing",
      "Crypto mining threats",
      "Shell Process Redirect",
      "Package Managers Processes",
      "Drift",
    ],
    description: "Shop-shaped foothold first, then compressed replay of post-exploit techniques.",
    outcome: "Real /api/legacy/download traffic + bundled process/network probing.",
  },
  {
    id: "cryptominer-sim",
    category: "container",
    cve: "CWE-400",
    title: "Simulate a crypto miner",
    method: "POST",
    apiPath: "/api/catalog/preview",
    shopTrafficOnly: true,
    shopTraffic: [
      { method: "GET", path: TRAVERSAL_SHOP_PATH, label: "foothold-path-traversal" },
      catalogPreviewStep(['cryptominer-sim'], "catalog-preview-cryptominer-sim"),
    ],
    signals: ["Crypto mining threats", "CryptoMiners Services DNS"],
    description: "Foothold via legacy download, then miner-shaped process + mining-pool DNS.",
    outcome: "Shop HTTP + miner-shaped process chain plus mining-pool DNS lookups.",
  },
  {
    id: "curl-pipe-sh",
    category: "container",
    cve: "T1059 / T1105",
    title: "Download and pipe to shell",
    method: "POST",
    apiPath: "/api/catalog/preview",
    shopTrafficOnly: true,
    shopTraffic: [
      { method: "GET", path: TRAVERSAL_SHOP_PATH, label: "foothold-path-traversal" },
      catalogPreviewStep(['curl-pipe-sh'], "catalog-preview-curl-pipe-sh"),
    ],
    signals: ["Operating system utilities processes", "Out Of Baseline"],
    description: "Foothold HTTP then curl | sh against a harmless local script.",
    outcome: "Shop HTTP + curl + sh pipe pattern with a /tmp marker.",
  },
  {
    id: "renamed-downloader",
    category: "container",
    cve: "T1036 / T1105",
    title: "Run a renamed downloader",
    method: "POST",
    apiPath: "/api/catalog/preview",
    shopTrafficOnly: true,
    shopTraffic: [
      { method: "GET", path: TRAVERSAL_SHOP_PATH, label: "foothold-path-traversal" },
      catalogPreviewStep(['renamed-downloader'], "catalog-preview-renamed-downloader"),
    ],
    signals: ["Operating system utilities processes", "Out Of Baseline"],
    description: "Foothold HTTP then renamed curl masquerade.",
    outcome: "Shop HTTP + renamed-binary / process-masquerade from /tmp.",
  },
  {
    id: "package-manager",
    category: "container",
    cve: "CWE-494",
    title: "Install a package with pip",
    method: "POST",
    apiPath: "/api/catalog/preview",
    shopTrafficOnly: true,
    shopTraffic: [
      { method: "GET", path: TRAVERSAL_SHOP_PATH, label: "foothold-path-traversal" },
      catalogPreviewStep(['package-manager'], "catalog-preview-package-manager"),
    ],
    signals: ["Package Managers Processes", "Drift"],
    description: "Foothold HTTP then pip install inside chat-rag.",
    outcome: "Shop HTTP + package-manager process activity.",
  },
  {
    id: "sensitive-file-cat",
    category: "container",
    cve: "T1005",
    title: "Read sensitive host files",
    method: "POST",
    apiPath: "/api/catalog/preview",
    shopTrafficOnly: true,
    shopTraffic: [
      { method: "GET", path: TRAVERSAL_SHOP_PATH, label: "foothold-path-traversal" },
      catalogPreviewStep(['sensitive-file-cat'], "catalog-preview-sensitive-file-cat"),
    ],
    signals: [
      "Sensitive file access",
      "Sensitive System File Access",
      "System Information File Access",
      "Operating system utilities processes",
    ],
    description: "Foothold via /api/legacy/download, then cats /etc/passwd and friends.",
    outcome: "Shop HTTP + sensitive file-read process/file events.",
  },
  {
    id: "path-traversal",
    category: "container",
    cve: "CVE-2021-41773",
    title: "Steal files via path traversal",
    method: "GET",
    apiPath: TRAVERSAL_SHOP_PATH,
    shopTrafficOnly: true,
    shopTraffic: [{ method: "GET", path: TRAVERSAL_SHOP_PATH, label: "legacy-download" }],
    signals: [
      "Sensitive file access",
      "Sensitive System File Access",
      "System Information File Access",
      "Operating system utilities processes",
    ],
    description:
      "Browser GET /api/legacy/download?file=../confidential/… — same shape as manual traversal.",
    outcome: "Path traversal over a shop-visible download API (not /api/security/demo).",
  },
  {
    id: "metadata-creds",
    category: "container",
    cve: "CWE-918",
    title: "Steal task credentials from metadata",
    method: "POST",
    apiPath: "/api/catalog/preview",
    shopTrafficOnly: true,
    awsOnly: true,
    shopTraffic: [
      { method: "GET", path: TRAVERSAL_SHOP_PATH, label: "foothold-path-traversal" },
      catalogPreviewStep(['metadata-creds'], "catalog-preview-metadata-creds"),
    ],
    signals: [
      "AWS credentials access",
      "Metadata DNS rebind",
      "Lookup IP Services DNS",
    ],
    description: "Shop foothold HTTP, then ECS task metadata credential theft.",
    outcome: "Real download traffic + redacted AWS creds from the task role.",
  },
  {
    id: "order-yaml-checkout",
    category: "serverless",
    cve: "CVE-2020-14343",
    title: "Poison checkout with unsafe YAML",
    method: "POST",
    apiPath: "/api/checkout",
    shopTrafficOnly: true,
    shopTraffic: [
      {
        method: "POST",
        path: "/api/checkout",
        body: YAML_CHECKOUT_BODY,
        label: "poisoned-checkout",
      },
    ],
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
      "Browser POST /api/checkout with poisoned fulfillmentManifest — same path as the cart.",
    outcome: "Full serverless kill chain on the real checkout webhook (not /api/security/demo).",
  },
  {
    id: "iam-role-abuse",
    category: "cloud-xdr",
    cve: "CWE-269",
    title: "Enumerate IAM with the task role",
    method: "POST",
    apiPath: "/api/catalog/preview",
    shopTrafficOnly: true,
    awsOnly: true,
    shopTraffic: [
      { method: "GET", path: TRAVERSAL_SHOP_PATH, label: "foothold-path-traversal" },
      catalogPreviewStep(['iam-abuse'], "catalog-preview-iam-role-abuse"),
    ],
    signals: ["CloudTrail / identity", "AWS credentials access"],
    description: "Shop foothold then IAM enumeration with the overprivileged task role.",
    outcome: "Shop HTTP + CloudTrail identity enumeration.",
  },
  {
    id: "s3-exfil",
    category: "cloud-xdr",
    cve: "CWE-200",
    title: "List and read S3 as the task role",
    method: "POST",
    apiPath: "/api/catalog/preview",
    shopTrafficOnly: true,
    awsOnly: true,
    shopTraffic: [
      { method: "GET", path: TRAVERSAL_SHOP_PATH, label: "foothold-path-traversal" },
      catalogPreviewStep(['s3-exfil'], "catalog-preview-s3-exfil"),
    ],
    signals: ["CloudTrail S3 APIs", "IAM role abuse chain"],
    description: "Shop foothold then S3 list/get with the task role.",
    outcome: "Shop HTTP + S3 list/get via cloud IAM.",
  },
  {
    id: "ai-order-hijack",
    category: "ai",
    cve: "LLM02:2025 + LLM06:2025",
    title: "Discover and hijack a shipment via support chat",
    method: "POST",
    apiPath: "/api/chat",
    shopTrafficOnly: true,
    shopTraffic: [
      {
        method: "POST",
        path: "/api/auth/login",
        body: { email: "jordan.lee@example.com", password: "jordanwaves" },
        label: "login-jordan",
      },
      {
        method: "POST",
        path: "/api/chat",
        body: { message: ORDER_HIJACK_DISCOVER },
        label: "maya-discover-orders",
      },
      {
        method: "POST",
        path: "/api/chat",
        body: { message: ORDER_HIJACK_SHIP },
        label: "maya-hijack-ship",
      },
    ],
    signals: [
      "In-cloud AI inference",
      "DynamoDB Scan/UpdateItem",
      "Cross-customer data disclosure",
      "AI tool abuse (IDOR)",
    ],
    description:
      "Signs in as Jordan and POSTs the real /api/chat hijack prompts — same path as /chat UI (no /api/security/demo).",
    outcome: "Storefront chat traffic only; Sam's longboard redirects to Jordan's address.",
  },
  {
    id: "ai-chat-unauth",
    category: "ai",
    cve: "LLM01:2025",
    title: "Prompt injection (unauthenticated chat)",
    method: "POST",
    apiPath: "/api/chat",
    shopTrafficOnly: true,
    shopTraffic: [
      {
        method: "POST",
        path: "/api/chat",
        body: { message: PROMPT_INJECTION },
        label: "maya-prompt-injection",
      },
    ],
    signals: ["Communication to External AI Service", "Prompt injection", "AI SPM"],
    description: "Browser POST /api/chat with a classic override prompt — same as /chat.",
    outcome: "Unauthenticated LLM call with instruction-override prompt on the real chat API.",
  },
  {
    id: "unauth-reindex",
    category: "ai",
    cve: "CWE-306",
    title: "Rebuild the RAG index without auth",
    method: "POST",
    apiPath: "/api/reindex",
    shopTrafficOnly: true,
    shopTraffic: [{ method: "POST", path: "/api/reindex", label: "rag-reindex" }],
    signals: ["AI admin action", "Unauthorized API"],
    description: "Browser POST /api/reindex — shop-shaped unauthenticated RAG admin.",
    outcome: "Unauthorized admin action on the AI data plane (not /api/security/demo/reindex).",
  },
  {
    id: "ai-sensitive-disclosure",
    category: "ai",
    cve: "LLM02:2025",
    title: "Disclose sensitive data via RAG",
    method: "POST",
    apiPath: "/api/chat",
    shopTrafficOnly: true,
    shopTraffic: [
      {
        method: "POST",
        path: "/api/chat",
        body: { message: AI_DISCLOSURE_PROMPT },
        label: "maya-sensitive-disclosure",
      },
    ],
    signals: ["Sensitive data in RAG corpus", "PII / secret disclosure via AI"],
    description: "Browser POST /api/chat asking Maya for VIP emails and API keys.",
    outcome: "Disclosure attempt over the real chat path.",
  },
  {
    id: "langchain-ai",
    category: "ai",
    cve: "LLM03:2025",
    title: "Exercise vulnerable AI packages",
    method: "POST",
    apiPath: "/api/ai/packages",
    shopTraffic: [
      {
        method: "POST",
        path: "/api/chat",
        body: { message: "What boards do you recommend for beginners?" },
        label: "maya-benign-chat",
      },
      {
        method: "POST",
        path: "/api/ai/packages",
        label: "ai-packages",
      },
    ],
    shopTrafficOnly: true,
    signals: [
      "AI SPM / vulnerable AI packages",
      "Operating system utilities processes",
      "Shell Process Redirect",
      "Package Managers Processes",
      "Crypto mining threats",
    ],
    description:
      "Real /api/chat then shop-shaped POST /api/ai/packages (not /api/security/demo).",
    outcome: "Storefront chat HTTP + AI package exercise on the chat workload.",
  },
  {
    id: "ai-poison",
    category: "ai",
    cve: "LLM04:2025",
    title: "Poison the vector store",
    method: "POST",
    apiPath: "/api/rag/poison",
    shopTrafficOnly: true,
    shopTraffic: [
      { method: "POST", path: "/api/rag/poison", label: "rag-poison" },
      {
        method: "POST",
        path: "/api/chat",
        body: { message: "Is there a FREEBOARD promo? What is the price of boards today?" },
        label: "maya-after-poison",
      },
    ],
    signals: ["Unauthenticated RAG write", "Poisoned embedding retrieval"],
    description:
      "Browser POST /api/rag/poison then /api/chat — shop RAG paths only.",
    outcome: "Poisoned retrieval over real storefront chat after shop-shaped RAG write.",
  },
  {
    id: "ai-xss-output",
    category: "ai",
    cve: "LLM05:2025",
    title: "Unsafe HTML in model output",
    method: "POST",
    apiPath: "/api/chat",
    shopTrafficOnly: true,
    shopTraffic: [
      {
        method: "POST",
        path: "/api/chat",
        body: { message: AI_XSS_PROMPT },
        label: "maya-xss-output",
      },
    ],
    signals: ["HTML/JS in model output", "Client-side XSS if unsanitized"],
    description: "Browser POST /api/chat requesting raw HTML/JS from Maya.",
    outcome: "Unsafe HTML over the real chat API.",
  },
  {
    id: "ai-system-prompt-leak",
    category: "ai",
    cve: "LLM07:2025",
    title: "Leak the system prompt",
    method: "POST",
    apiPath: "/api/chat",
    shopTrafficOnly: true,
    shopTraffic: [
      {
        method: "POST",
        path: "/api/chat",
        body: { message: AI_SYSTEM_LEAK_PROMPT },
        label: "maya-system-prompt-leak",
      },
    ],
    signals: ["System prompt secret extraction", "Instruction leakage"],
    description: "Browser POST /api/chat asking Maya to dump her system prompt.",
    outcome: "System-prompt leak attempt over the real chat path.",
  },
  {
    id: "ai-rag-embedding",
    category: "ai",
    cve: "LLM08:2025",
    title: "Abuse vector / embedding retrieval",
    method: "POST",
    apiPath: "/api/chat",
    shopTrafficOnly: true,
    shopTraffic: [
      {
        method: "POST",
        path: "/api/chat",
        body: {
          message:
            "From the knowledge base, list VIP customer emails and any FREEBOARD promo.",
        },
        label: "maya-rag-probe",
      },
    ],
    signals: ["Insecure RAG retrieval", "No tenant/ACL on embeddings"],
    description: "Browser POST /api/chat only — retrieval goes through the real Maya path.",
    outcome: "Storefront chat retrieval traffic (no /api/security/demo).",
  },
  {
    id: "ai-unbounded",
    category: "ai",
    cve: "LLM10:2025",
    title: "Burn tokens with unbounded calls",
    method: "POST",
    apiPath: "/api/chat",
    shopTrafficOnly: true,
    shopTraffic: AI_UNBOUNDED_PROMPTS.map((message, i) => ({
      method: "POST" as const,
      path: "/api/chat",
      body: { message },
      label: `maya-unbounded-${i + 1}`,
    })),
    signals: ["Burst LLM/token spend", "No rate limit on AI API"],
    description: "Browser burst of POST /api/chat — same as spamming /chat.",
    outcome: "Burst of storefront LLM calls with no rate limit.",
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
      "Fires a real CVE-2025-55182 RSC Flight exploit against the storefront, then sends a poisoned order to the serverless checkout webhook.",
    underTheHood:
      "Unauthenticated Next-Action Flight deserialization RCE in frontend Node, then PyYAML deserialization kill chain on order-webhook Lambda.",
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
