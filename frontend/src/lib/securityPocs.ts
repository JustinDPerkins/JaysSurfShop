export type PocCategory = "container" | "serverless" | "cloud-xdr" | "ai";

export interface PocStory {
  id: string;
  category: PocCategory;
  title: string;
  /** Short attacker-facing summary — what this chain does. */
  blurb: string;
  /** Plain explanation of what runs under the hood (no product jargon). */
  underTheHood: string;
  /** Optional tip for where to look in the monitoring console. */
  detectionTip: string;
  pocIds: string[];
  continueIn?: { tab: PocCategory; storyId: string; label: string };
}
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
  upwindPolicies: string[];
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
    label: "Container",
    blurb:
      "Attack chains on ECS frontend + chat-rag: initial access, toolkit, then Fargate metadata pivot.",
  },
  {
    id: "serverless",
    label: "Serverless",
    blurb:
      "Attack chain on order-webhook Lambda — PyYAML MITRE checkout. Pair with API rules + CloudTrail.",
  },
  {
    id: "cloud-xdr",
    label: "Cloud XDR",
    blurb:
      "Continue after container compromise — task role abuse and S3 exfiltration via CloudTrail.",
  },
  {
    id: "ai",
    label: "AI",
    blurb: "Unauthenticated AI admin actions, prompt abuse, and AI package supply-chain harnesses.",
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
    upwindPolicies: [
      "Operating system utilities processes",
      "Shell Process Redirect",
      "Crypto mining threats",
      "Sensitive file access",
    ],
    description:
      "React2Shell (CVE-2025-55182 / CVE-2025-66478) on Next.js App Router — workshop harness runs the post-RCE toolkit inside the frontend Node process (id, shell pipe, renamed downloader, sensitive cat, miner).",
    outcome:
      "Process events from the frontend container. SCA shows Critical on next@15.1.0 / react@19.0.0. Continue with metadata → Cloud XDR.",
  },
  {
    id: "pillow-rce",
    category: "container",
    cve: "CVE-2023-50447",
    title: "Pillow RCE",
    method: "POST",
    apiPath: "/api/security/demo/pillow",
    requiresPillow: true,
    upwindPolicies: [
      "Operating system utilities processes",
      "Shell Process Redirect",
      "Out Of Baseline",
    ],
    description: "Exploits Pillow 10.0.1 ImageMath.eval for container-local code execution in chat-rag.",
    outcome: "Runs `id -a` after RCE — tracer-friendly Process events on ECS/Fargate.",
  },
  {
    id: "shell-pipe",
    category: "container",
    cve: "CWE-78",
    title: "Shell pipe redirect",
    method: "POST",
    apiPath: "/api/security/demo/runtime/shell-pipe",
    upwindPolicies: [
      "Interactive shell process stream redirected to a pipe",
      "Shell Process Redirect",
      "Operating system utilities processes",
    ],
    description: "Runs real `id` + `tee` binaries, then `sh -i` with stdio on pipes.",
    outcome: "Discrete Process events on ECS tracers plus syscall pattern for sh -i.",
  },
  {
    id: "cve-probe-story",
    category: "container",
    cve: "CVE-2023-50447",
    title: "CVE probe → Threat Story bait",
    method: "POST",
    apiPath: "/api/security/demo/runtime/cve-probe-story",
    requiresPillow: false,
    upwindPolicies: [
      "Suspicious CVE Exploitation Probing",
      "Crypto mining threats",
      "Shell Process Redirect",
      "Package Managers Processes",
      "Drift",
    ],
    description:
      "One-click replay of the Jul-7 Threat Story sequence on chat-rag: CVE-named id redirect, shell pipe, exec -a xmrig, pip list, renamed miner. Detections first; Story may lag minutes.",
    outcome:
      "Same Process cluster as ‘Suspicious CVE Exploitation Probing in Container’ — best on GKE sensor, then ECS/ACA tracer.",
  },
  {
    id: "cryptominer-sim",
    category: "container",
    cve: "CWE-400",
    title: "Crypto miner simulation",
    method: "POST",
    apiPath: "/api/security/demo/runtime/cryptominer-sim",
    upwindPolicies: ["Crypto mining threats", "CryptoMiners Services DNS"],
    description:
      "Harmless simulation: cp/chmod/run `/tmp/xmrig` + DNS lookups for known mining pools.",
    outcome: "cp/chmod/xmrig exec chain + pool DNS lookups — discrete Process events on tracers.",
  },
  {
    id: "curl-pipe-sh",
    category: "container",
    cve: "T1059 / T1105",
    title: "curl | sh supply chain",
    method: "POST",
    apiPath: "/api/security/demo/runtime/curl-pipe-sh",
    upwindPolicies: ["Operating system utilities processes", "Out Of Baseline"],
    description:
      "Runs `curl -fsSL file:///tmp/jss-supply-chain.sh | sh` against a harmless local script.",
    outcome: "Real `sh` + `curl` exec chain with pipe-shaped argv and `/tmp` marker output.",
  },
  {
    id: "renamed-downloader",
    category: "container",
    cve: "T1036 / T1105",
    title: "Renamed downloader",
    method: "POST",
    apiPath: "/api/security/demo/runtime/renamed-downloader",
    upwindPolicies: ["Operating system utilities processes", "Out Of Baseline"],
    description:
      "Copies `curl` to `/tmp/.wget`, chmods it, then executes the hidden-path downloader.",
    outcome: "cp/chmod/run chain from `/tmp/.wget` — tracer-friendly process drift signal.",
  },
  {
    id: "package-manager",
    category: "container",
    cve: "CWE-494",
    title: "Package manager in container",
    method: "POST",
    apiPath: "/api/security/demo/runtime/package-manager",
    upwindPolicies: ["Package Managers Processes", "Drift"],
    description: "Runs `pip install pytz` inside the running chat-rag container.",
    outcome: "Package manager install process — Package Managers Processes built-in on tracers.",
  },
  {
    id: "sensitive-file-cat",
    category: "container",
    cve: "T1005",
    title: "Sensitive file via cat",
    method: "POST",
    apiPath: "/api/security/demo/runtime/sensitive-file-cat",
    upwindPolicies: [
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
    title: "Path traversal",
    method: "GET",
    apiPath: "/api/security/demo/traversal",
    upwindPolicies: [
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
    upwindPolicies: [
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
    upwindPolicies: [
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
      "10-step securityDemo.chain. Lambda has no tracer — use API rules + CloudTrail; Process steps in CloudWatch.",
  },
  {
    id: "iam-role-abuse",
    category: "cloud-xdr",
    cve: "CWE-269",
    title: "IAM role abuse",
    method: "POST",
    apiPath: "/api/security/demo/iam-abuse",
    awsOnly: true,
    upwindPolicies: ["CloudTrail / identity", "AWS credentials access"],
    description:
      "Abuses the overprivileged ECS task role from chat-rag — ListBuckets, ListRoles, ListSecrets.",
    outcome: "Real CloudTrail events for Cloud XDR correlation after container compromise.",
  },
  {
    id: "s3-exfil",
    category: "cloud-xdr",
    cve: "CWE-200",
    title: "S3 data exfiltration",
    method: "POST",
    apiPath: "/api/security/demo/runtime/s3-exfil",
    awsOnly: true,
    upwindPolicies: ["CloudTrail S3 APIs", "IAM role abuse chain"],
    description:
      "Enumerates S3 buckets and probes objects using the task role — post-compromise data theft.",
    outcome: "Lists workshop buckets and samples a public demo object via IAM.",
  },
  {
    id: "ai-chat-unauth",
    category: "ai",
    cve: "CWE-306",
    title: "Unauthenticated AI chat",
    method: "POST",
    apiPath: "/api/security/demo/ai-chat",
    upwindPolicies: ["Communication to External AI Service", "AI SPM"],
    description:
      "Sends a prompt-injection style request through unauthenticated /api/chat → OpenAI.",
    outcome: "AI inference audit logs in CloudWatch — AI SPM without user identity.",
  },
  {
    id: "unauth-reindex",
    category: "ai",
    cve: "CWE-306",
    title: "Unauth RAG reindex",
    method: "POST",
    apiPath: "/api/security/demo/reindex",
    upwindPolicies: ["AI admin action", "Unauthorized API"],
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
    upwindPolicies: [
      "AI SPM / vulnerable AI packages",
      "Operating system utilities processes",
      "Shell Process Redirect",
      "Package Managers Processes",
      "Crypto mining threats",
    ],
    description:
      "Pinned langchain-community (CVE-2024-5998 FAISS pickle) + chromadb 0.5.x (CVE-2026-45831). Workshop harness runs post-deserialize toolkit in chat-rag — no pickle gadget shipped.",
    outcome:
      "SCA Criticals on chat-rag plus Process events (id redirect, tee, pip list, xmrig) from the AI workload.",
  },
];

export const POC_STORIES: PocStory[] = [
  {
    id: "cve-probing-story",
    category: "container",
    title: "Chain 0 — CVE probe process cluster",
    blurb:
      "On chat-rag, run a tight burst of suspicious processes that look like post-CVE exploitation.",
    underTheHood:
      "One API call makes chat-rag spawn real binaries in order: write a CVE-looking id output file, open a shell with piped stdio, start a short-lived process named like xmrig, then run pip. Nothing is remotely exploited — the app intentionally executes that process tree inside the container.",
    detectionTip:
      "Correlated process/drift/crypto signals on a single workload — may show as a Threat Story after clustering catches up.",
    pocIds: ["cve-probe-story"],
  },
  {
    id: "react2shell-pivot",
    category: "container",
    title: "Chain 1 — React2Shell to cloud pivot",
    blurb:
      "RCE on the public Next.js frontend, run a post-exploit toolkit, then steal AWS credentials from Fargate metadata.",
    underTheHood:
      "Step 1 hits a controlled React2Shell harness on the frontend (pinned vulnerable Next/React). Inside the Node process it runs id, shell redirect, a renamed binary, sensitive file reads, and a miner-shaped process. Step 2 queries the Fargate IMDS for temporary IAM credentials — the cloud pivot used by the next chain.",
    detectionTip: "Process activity on the frontend task, then metadata/credential access.",
    pocIds: ["react2shell", "metadata-creds"],
    continueIn: {
      tab: "cloud-xdr",
      storyId: "identity-to-data",
      label: "Continue in Cloud XDR → Chain 1 (Task role to S3 exfiltration)",
    },
  },
  {
    id: "container-compromise",
    category: "container",
    title: "Chain 2 — Pillow RCE to host recon",
    blurb:
      "Different entry point on chat-rag: Pillow code execution, path traversal, secret file reads, then metadata.",
    underTheHood:
      "chat-rag loads vulnerable Pillow and evaluates ImageMath to get code execution in the Python process. Next it reads off-path files and cats sensitive paths, then hits IMDS for temporary credentials. Same ending as Chain 1 (cloud identity), different service and CVE.",
    detectionTip: "Process + sensitive-file activity on chat-rag, then credential/metadata access.",
    pocIds: ["pillow-rce", "path-traversal", "sensitive-file-cat", "metadata-creds"],
    continueIn: {
      tab: "cloud-xdr",
      storyId: "identity-to-data",
      label: "Continue in Cloud XDR → Chain 1",
    },
  },
  {
    id: "post-exploit-toolkit",
    category: "container",
    title: "Chain 3 — Attacker toolkit & impact",
    blurb:
      "Assume the box is already owned — fetch via curl|sh, spoof a binary name, run a fake miner, then package-manager drift.",
    underTheHood:
      "These steps do not exploit a CVE. Each one runs a concrete post-compromise behavior: pipe a download into a shell, copy a binary and exec it under a fake argv0, run a short xmrig-named sleep process, and invoke a package manager. Useful for walking MITRE execution → defense evasion → impact.",
    detectionTip: "Crypto-mining shaped detections are usually loudest; package-manager activity often shows as quieter events.",
    pocIds: ["curl-pipe-sh", "renamed-downloader", "cryptominer-sim", "package-manager"],
  },
  {
    id: "syscall-deep-dive",
    category: "container",
    title: "Chain 4 — Shell mechanics (optional)",
    blurb:
      "Spawn real id/tee processes and an interactive-shaped shell with redirected pipes.",
    underTheHood:
      "chat-rag shells out to real /usr/bin/id and tee, then starts sh -i with stdin/stdout on pipes. This is about shell and syscall patterns after compromise — not a new vulnerability.",
    detectionTip: "Look for shell process redirect / OS utility process events on the ECS tracer.",
    pocIds: ["shell-pipe"],
  },
  {
    id: "serverless-checkout-chain",
    category: "serverless",
    title: "Chain 1 — Poisoned checkout (Lambda)",
    blurb:
      "Public checkout accepts malicious YAML → code execution shape → STS/S3 probing → fake miner + EICAR.",
    underTheHood:
      "API Gateway forwards the checkout body to order-webhook Lambda. The handler unsafely loads YAML (PyYAML), which drives an intentional post-exploit sequence inside the function: local toolkit steps, STS/S3 API calls with the function role, then miner- and malware-file shaped artifacts.",
    detectionTip: "API/CloudTrail identity and data access (Lambda often has no process tracer).",
    pocIds: ["order-yaml-checkout"],
  },
  {
    id: "identity-to-data",
    category: "cloud-xdr",
    title: "Chain 1 — Task role to S3 exfiltration",
    blurb:
      "With stolen/overprivileged IAM, abuse the ECS task role and pull data from S3.",
    underTheHood:
      "No container RCE here. Using the workload identity (or an equivalent overprivileged session), the app calls broad IAM-allowed APIs and lists/gets objects from a demo export bucket — classic post-compromise data access.",
    detectionTip: "CloudTrail: AssumeRole/GetCallerIdentity and S3 List/Get from the task role.",
    pocIds: ["iam-role-abuse", "s3-exfil"],
  },
  {
    id: "ai-data-plane",
    category: "ai",
    title: "Chain 1 — Unauthenticated AI abuse",
    blurb:
      "Abuse the open chat API, then wipe and rebuild the RAG index with no login.",
    underTheHood:
      "First call hits /api/chat with a prompt-injection style message so the backend calls OpenAI. Second call hits the unauthenticated reindex endpoint, which deletes and rebuilds embeddings. Shows missing auth on AI control/data plane — not a package CVE.",
    detectionTip: "External AI egress and unauthorized admin-style AI actions.",
    pocIds: ["ai-chat-unauth", "unauth-reindex"],
  },
  {
    id: "ai-supply-chain",
    category: "ai",
    title: "Chain 2 — AI supply-chain CVEs",
    blurb:
      "Vulnerable LangChain/Chroma packages are installed; then run post-compromise toolkit as if unsafe deserialize succeeded.",
    underTheHood:
      "chat-rag pins langchain-community (CVE-2024-5998) and chromadb (CVE-2026-45831) so scanners flag Criticals. The demo endpoint then runs the process toolkit inside that AI service — it does not ship a live pickle RCE gadget.",
    detectionTip: "Package Criticals on chat-rag plus process toolkit events from the AI workload.",
    pocIds: ["langchain-ai"],
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
