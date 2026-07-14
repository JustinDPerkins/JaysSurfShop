export type PocCategory = "container" | "serverless" | "cloud-xdr" | "ai";

export interface PocStory {
  id: string;
  category: PocCategory;
  /** Attack-chain slot (1 or 2) — keep chains on different workloads when possible. */
  storyIndex: 1 | 2;
  /** Workload this chain targets (chat-rag vs frontend, etc.). */
  targetResource: string;
  title: string;
  blurb: string;
  /** Plain-language explanation of what the chain does under the hood. */
  underTheHood: string;
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
    label: "Chain 1 · chat-rag",
    blurb:
      "RCE → tooling on the chat-rag container: traversal, CVE RCE, shell/downloaders, secrets, crypto sim, pip, bundled recipe.",
  },
  {
    id: "serverless",
    label: "Chain 2 · frontend / serverless",
    blurb:
      "React2Shell on frontend plus the order-webhook serverless kill chain (separate hosts from Chain 1).",
  },
  {
    id: "cloud-xdr",
    label: "Extras · Cloud identity",
    blurb:
      "Post-compromise identity and data-plane abuse (credentials, buckets, secrets) after a container chain.",
  },
  {
    id: "ai",
    label: "Extras · AI",
    blurb:
      "Unauthenticated AI endpoints and vulnerable AI packages — good for SCA and egress signals.",
  },
];


export const SECURITY_POCS: SecurityPoc[] = [
  {
    id: "react2shell",
    category: "container",
    cve: "CVE-2025-55182",
    title: "React2Shell → process toolkit",
    method: "POST",
    apiPath: "/api/security/demo/react2shell",
    signals: [
      "Operating system utilities processes",
      "Shell Process Redirect",
      "Crypto mining threats",
      "Sensitive file access",
    ],
    description:
      "React2Shell (CVE-2025-55182 / CVE-2025-66478) on Next.js App Router — runs the post-RCE toolkit inside the frontend Node process (id, shell pipe, renamed downloader, sensitive cat, miner).",
    outcome:
      "Process activity from the frontend container. SCA should flag next@15.1.0 / react@19.0.0. Follow with identity chains if you want cloud API noise.",
  },
  {
    id: "pillow-rce",
    category: "container",
    cve: "CVE-2023-50447",
    title: "CVE-named id redirect (Pillow RCE)",
    method: "POST",
    apiPath: "/api/security/demo/pillow",
    requiresPillow: true,
    signals: [
      "Operating system utilities processes",
      "Shell Process Redirect",
      "Out Of Baseline",
    ],
    description: "Exploits Pillow 10.0.1 ImageMath.eval for container-local code execution in chat-rag.",
    outcome: "Runs `id -a` after RCE — discrete process activity in the chat-rag container.",
  },
  {
    id: "shell-pipe",
    category: "container",
    cve: "CWE-78",
    title: "Shell pipe / tee redirect",
    method: "POST",
    apiPath: "/api/security/demo/runtime/shell-pipe",
    signals: [
      "Interactive shell process stream redirected to a pipe",
      "Shell Process Redirect",
      "Operating system utilities processes",
    ],
    description: "Runs real `id` + `tee` binaries, then `sh -i` with stdio on pipes.",
    outcome: "Discrete process activity plus interactive shell / pipe patterns.",
  },
  {
    id: "cve-probe-story",
    category: "container",
    cve: "CVE-2023-50447",
    title: "CVE exploitation probing (full recipe)",
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
      "One-click chat-rag sequence: Pillow CVE id file, shell pipe/tee, exec -a xmrig + mining DNS, pip list.",
    outcome:
      "Process + network activity typical of CVE probing and post-exploit tooling.",
  },
  {
    id: "cryptominer-sim",
    category: "container",
    cve: "CWE-400",
    title: "Cryptocurrency mining process",
    method: "POST",
    apiPath: "/api/security/demo/runtime/cryptominer-sim",
    signals: ["Crypto mining threats", "CryptoMiners Services DNS"],
    description:
      "Harmless simulation: cp/chmod/run `/tmp/xmrig` + DNS lookups for known mining pools.",
    outcome: "cp/chmod/xmrig exec chain + pool DNS lookups.",
  },
  {
    id: "curl-pipe-sh",
    category: "container",
    cve: "T1059 / T1105",
    title: "Suspicious file download (curl | sh)",
    method: "POST",
    apiPath: "/api/security/demo/runtime/curl-pipe-sh",
    signals: ["Operating system utilities processes", "Out Of Baseline"],
    description:
      "Runs `curl -fsSL file:///tmp/jss-supply-chain.sh | sh` against a harmless local script.",
    outcome: "Real `sh` + `curl` exec chain with pipe-shaped argv and `/tmp` marker output.",
  },
  {
    id: "renamed-downloader",
    category: "container",
    cve: "T1036 / T1105",
    title: "Renamed downloader (process masquerade)",
    method: "POST",
    apiPath: "/api/security/demo/runtime/renamed-downloader",
    signals: ["Operating system utilities processes", "Out Of Baseline"],
    description:
      "Copies `curl` to `/tmp/.wget`, chmods it, then executes the hidden-path downloader.",
    outcome: "cp/chmod/run chain from `/tmp/.wget` — renamed-binary / drift signal.",
  },
  {
    id: "package-manager",
    category: "container",
    cve: "CWE-494",
    title: "Package manager enumeration",
    method: "POST",
    apiPath: "/api/security/demo/runtime/package-manager",
    signals: ["Package Managers Processes", "Drift"],
    description: "Runs `pip install pytz` inside the running chat-rag container.",
    outcome: "Package manager install process (`pip`) inside a running container.",
  },
  {
    id: "sensitive-file-cat",
    category: "container",
    cve: "T1005",
    title: "Private key or password search",
    method: "POST",
    apiPath: "/api/security/demo/runtime/sensitive-file-cat",
    signals: [
      "Sensitive file access",
      "Sensitive System File Access",
      "System Information File Access",
      "Operating system utilities processes",
    ],
    description:
      "Runs discrete `cat` processes against `/etc/passwd`, `/etc/hosts`, and `/proc/*` files.",
    outcome: "Explicit Process/File events for sensitive file reads without relying on Python IO.",
  },
  {
    id: "path-traversal",
    category: "container",
    cve: "CVE-2021-41773",
    title: "Sensitive file access (path traversal)",
    method: "GET",
    apiPath: "/api/security/demo/traversal",
    signals: [
      "Sensitive file access",
      "Sensitive System File Access",
      "System Information File Access",
      "Operating system utilities processes",
    ],
    description:
      "Legacy download reads `../confidential/api-credentials.txt`, then cats `/etc/passwd` and `/proc/cpuinfo`.",
    outcome: "Traversal plus discrete cat on system paths for file/process built-ins.",
  },
  {
    id: "metadata-creds",
    category: "container",
    cve: "CWE-918",
    title: "Fargate metadata / AWS creds",
    method: "POST",
    apiPath: "/api/security/demo/runtime/metadata-creds",
    awsOnly: true,
    signals: [
      "AWS credentials access",
      "Metadata DNS rebind",
      "Lookup IP Services DNS",
    ],
    description:
      "Curls 169.254.170.2 for ECS task metadata and temporary IAM credentials (Fargate IMDS analogue).",
    outcome: "Redacted creds + task ARN + IP lookup DNS/curl — run after React2Shell/Pillow, before IAM abuse.",
  },
  {
    id: "order-yaml-checkout",
    category: "serverless",
    cve: "CVE-2020-14343",
    title: "Serverless MITRE kill chain (checkout)",
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
      "One poisoned POST /checkout on order-webhook Lambda: T1190 → T1203 PyYAML → T1059 shell → T1027 renamed curl → T1005 cat → T1552 STS → T1619 S3 → T1496 miner → T1565 EICAR.",
    outcome:
      "10-step kill chain on the order-webhook. Watch API logs, cloud audit, and process output in the function runtime.",
  },
  {
    id: "iam-role-abuse",
    category: "cloud-xdr",
    cve: "CWE-269",
    title: "IAM role abuse",
    method: "POST",
    apiPath: "/api/security/demo/iam-abuse",
    awsOnly: true,
    signals: ["CloudTrail / identity", "AWS credentials access"],
    description:
      "Abuses the overprivileged ECS task role from chat-rag — ListBuckets, ListRoles, ListSecrets.",
    outcome: "Cloud API audit events after container compromise (IAM enumeration).",
  },
  {
    id: "s3-exfil",
    category: "cloud-xdr",
    cve: "CWE-200",
    title: "S3 data exfiltration",
    method: "POST",
    apiPath: "/api/security/demo/runtime/s3-exfil",
    awsOnly: true,
    signals: ["CloudTrail S3 APIs", "IAM role abuse chain"],
    description:
      "Enumerates S3 buckets and probes objects using the task role — post-compromise data theft.",
    outcome: "Lists demo buckets and samples a public object via cloud IAM.",
  },
  {
    id: "ai-chat-unauth",
    category: "ai",
    cve: "CWE-306",
    title: "Unauthenticated AI chat",
    method: "POST",
    apiPath: "/api/security/demo/ai-chat",
    signals: ["Communication to External AI Service", "AI SPM"],
    description:
      "Sends a prompt-injection style request through unauthenticated /api/chat → OpenAI.",
    outcome: "Unauthenticated call out to an external AI API.",
  },
  {
    id: "unauth-reindex",
    category: "ai",
    cve: "CWE-306",
    title: "Unauth RAG reindex",
    method: "POST",
    apiPath: "/api/security/demo/reindex",
    signals: ["AI admin action", "Unauthorized API"],
    description: "Wipes and rebuilds the RAG knowledge base with no authentication.",
    outcome: "Unauthorized admin on AI data plane — rebuilds embeddings via OpenAI.",
  },
  {
    id: "langchain-ai",
    category: "ai",
    cve: "CVE-2024-5998",
    title: "LangChain / Chroma AI supply chain",
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
      "Pinned langchain-community (CVE-2024-5998 FAISS pickle) + chromadb 0.5.x (CVE-2026-45831). Runs post-compromise tooling in chat-rag — no pickle gadget shipped.",
    outcome:
      "Package CVEs on chat-rag plus process activity (id redirect, tee, pip list, xmrig) from the AI workload.",
  },
];

export const POC_STORIES: PocStory[] = [
  {
    id: "story-1-cve-probing",
    category: "container",
    storyIndex: 1,
    targetResource: "chat-rag",
    title: "Chain 1 — CVE exploitation probing",
    blurb:
      "Full post-exploit toolkit on chat-rag (~8s gaps): traversal → RCE → shell/downloaders → secrets cat → miner → pip → bundled recipe.",
    underTheHood:
      "Path traversal, Pillow RCE, shell pipe, curl|sh, renamed downloader, sensitive cat, xmrig sim, pip, then the one-shot CVE-probing bundle.",
    lookFor:
      "Process · shell redirect · renamed binary · sensitive files · crypto DNS · package manager on chat-rag",
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
  },
  {
    id: "story-2-frontend-rce",
    category: "serverless",
    storyIndex: 2,
    targetResource: "frontend + order-webhook",
    title: "Chain 2 — Frontend RCE + serverless kill chain",
    blurb:
      "React2Shell toolkit on the frontend, then the order-webhook YAML / MITRE kill chain on serverless.",
    underTheHood:
      "Frontend Node post-RCE toolkit, then poisoned checkout → PyYAML deserialization chain on the order webhook.",
    lookFor:
      "Process on frontend · serverless process/API · unsafe YAML deserialize · crypto-shaped follow-on",
    stepGapSeconds: 8,
    pocIds: ["react2shell", "order-yaml-checkout"],
  },
  {
    id: "identity-to-data",
    category: "cloud-xdr",
    storyIndex: 2,
    targetResource: "chat-rag + AWS APIs",
    title: "Follow-on — Task role → S3",
    blurb:
      "Optional follow-on after Chain 1: steal task creds, abuse IAM, poke S3.",
    underTheHood:
      "Fargate metadata creds → IAM enumeration → S3 list/get. Cloud audit trail of post-compromise identity abuse.",
    lookFor: "CloudTrail · IMDS/creds · S3 APIs",
    stepGapSeconds: 8,
    pocIds: ["metadata-creds", "iam-role-abuse", "s3-exfil"],
  },
  {
    id: "ai-data-plane",
    category: "ai",
    storyIndex: 2,
    targetResource: "chat-rag",
    title: "Extra — Unauthenticated AI abuse",
    blurb:
      "Unauth AI chat + RAG reindex + LangChain/Chroma supply-chain toolkit on chat-rag.",
    underTheHood:
      "POST /api/chat, /reindex, then langchain-community / chromadb CVE-shaped tooling.",
    lookFor: "External AI egress · unauthenticated admin API · AI package CVEs · process toolkit",
    stepGapSeconds: 8,
    pocIds: ["ai-chat-unauth", "unauth-reindex", "langchain-ai"],
  },
];

export function getStoriesForCategory(category: PocCategory): PocStory[] {
  return POC_STORIES.filter((story) => story.category === category);
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
