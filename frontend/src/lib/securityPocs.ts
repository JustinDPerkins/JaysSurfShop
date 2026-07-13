export type PocCategory = "container" | "serverless" | "cloud-xdr" | "ai";

export interface PocStory {
  id: string;
  category: PocCategory;
  title: string;
  blurb: string;
  /** Plain-language explanation of what the chain does under the hood. */
  underTheHood: string;
  upwindFocus: string;
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
      "Upwind Threat Stories on the container workload (chat-rag / frontend). Strongest Story correlation on GKE sensor.",
  },
  {
    id: "serverless",
    label: "Serverless",
    blurb:
      "Threat Stories on order-webhook Lambda — API/CloudTrail correlated checkout kill chain.",
  },
  {
    id: "cloud-xdr",
    label: "Cloud XDR",
    blurb:
      "Identity / data-exfil Stories after container compromise (task role → S3).",
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
    title: "CVE-named id redirect (Pillow RCE)",
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
    title: "Shell pipe / tee redirect",
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
    title: "Threat Story recipe — CVE Exploitation Probing",
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
      "One-click Jul-7 Upwind Threat Story cluster on chat-rag: Pillow CVE id file, shell pipe/tee, exec -a xmrig + mining DNS, pip list. Matches Suspicious CVE Exploitation Probing.",
    outcome:
      "Upwind Threat Story on GKE (sensor). On ECS/ACA expect crypto Detection + Process Events.",
  },
  {
    id: "cryptominer-sim",
    category: "container",
    cve: "CWE-400",
    title: "Cryptocurrency mining process",
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
    title: "Suspicious file download (curl | sh)",
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
    title: "Renamed downloader (process masquerade)",
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
    title: "Package manager enumeration",
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
    title: "Private key or password search",
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
    title: "Sensitive file access (path traversal)",
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
    title: "Suspicious CVE Exploitation Probing in Container",
    blurb:
      "The Jul-7 Upwind Threat Story on chat-rag. Run these Story events in order — same timeline Upwind correlated.",
    underTheHood:
      "Event 1: Pillow RCE writes id to /tmp/jss-cve-2023-50447-id.txt. Event 2: id|tee shell pipe. Event 3: exec -a xmrig sleep 3 + mining-pool DNS. Event 4: pip list. That is the Story timeline (Drift detections + crypto). Close the existing Open Story in Upwind if you need a fresh row.",
    upwindFocus: "Threats → Stories → Suspicious CVE Exploitation Probing · resource chat-rag",
    pocIds: ["pillow-rce", "shell-pipe", "cryptominer-sim", "package-manager"],
  },
  {
    id: "crypto-mining-story",
    category: "container",
    title: "Cryptocurrency mining process",
    blurb:
      "The Detection you usually see first — miner-named process plus mining-pool DNS.",
    underTheHood:
      "Spawns sh -c 'exec -a xmrig sleep 3', optional /tmp/xmrig binary chain, and DNS to pool.supportxmr.com / minergate. Promotes to Detection more reliably than other process signals.",
    upwindFocus: "Threats → Detections → cryptocurrency mining process",
    pocIds: ["cryptominer-sim"],
  },
  {
    id: "cred-search-story",
    category: "container",
    title: "Private key or password search",
    blurb:
      "Sensitive file reads that show up as Process events for key/password searching.",
    underTheHood:
      "Cats /etc/passwd, /etc/hosts, /proc info and reads traversed credential files — same class of signal as “searched for a Private key or Password”.",
    upwindFocus: "Threats → Events → Private key or Password · chat-rag / frontend",
    pocIds: ["sensitive-file-cat", "path-traversal"],
  },
  {
    id: "download-masquerade-story",
    category: "container",
    title: "Suspicious file downloads & process masquerade",
    blurb:
      "Supply-chain fetch shape and renamed binary — download / out-of-baseline process events.",
    underTheHood:
      "curl|sh against a local harmless script, then cp curl → /tmp/.wget and run it. Matches suspicious download and renamed-tool Drift events.",
    upwindFocus: "Threats → Events → suspicious file downloads / Out Of Baseline",
    pocIds: ["curl-pipe-sh", "renamed-downloader"],
  },
  {
    id: "react2shell-pivot",
    category: "container",
    title: "Unauthenticated RCE → cloud credential theft",
    blurb:
      "React2Shell on the frontend, then steal the runtime identity from metadata.",
    underTheHood:
      "Frontend process toolkit after controlled React2Shell harness, then Fargate IMDS credential theft. Continue in Cloud XDR for data access.",
    upwindFocus: "Events on frontend → metadata/credentials → Cloud XDR Story",
    pocIds: ["react2shell", "metadata-creds"],
    continueIn: {
      tab: "cloud-xdr",
      storyId: "identity-to-data",
      label: "Continue → Task role to S3 Story",
    },
  },
  {
    id: "serverless-checkout-chain",
    category: "serverless",
    title: "Poisoned serverless checkout (PyYAML kill chain)",
    blurb:
      "Public checkout deserializes malicious YAML and runs the post-exploit toolkit on Lambda.",
    underTheHood:
      "One poisoned /checkout: PyYAML → toolkit → STS/S3 → miner → EICAR.",
    upwindFocus: "API custom rules + CloudTrail (Lambda often has no process tracer)",
    pocIds: ["order-yaml-checkout"],
  },
  {
    id: "identity-to-data",
    category: "cloud-xdr",
    title: "Task role → S3 data exfiltration",
    blurb:
      "Abuse the overprivileged ECS task role and pull demo S3 objects.",
    underTheHood:
      "IAM/S3 probes after metadata theft — CloudTrail identity Story shape, not container RCE.",
    upwindFocus: "CloudTrail · S3 APIs · IAM role abuse",
    pocIds: ["iam-role-abuse", "s3-exfil"],
  },
  {
    id: "ai-data-plane",
    category: "ai",
    title: "Unauthenticated AI service abuse",
    blurb:
      "Open chat + unauth RAG reindex — external AI egress and admin without identity.",
    underTheHood:
      "Prompt-injection style /api/chat then wipe/rebuild embeddings with no login.",
    upwindFocus: "Communication to External AI Service · AI SPM",
    pocIds: ["ai-chat-unauth", "unauth-reindex"],
  },
  {
    id: "ai-supply-chain",
    category: "ai",
    title: "AI supply-chain CVE → post-compromise toolkit",
    blurb:
      "LangChain/Chroma Criticals plus process toolkit on chat-rag as if unsafe deserialize succeeded.",
    underTheHood:
      "Pinned CVE packages for SCA; harness runs id/tee/pip/xmrig inside the AI workload (no live pickle gadget).",
    upwindFocus: "AI SPM package CVEs · Process events on chat-rag",
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
