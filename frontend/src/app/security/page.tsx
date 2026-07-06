"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface PostureData {
  application: string;
  environment: string;
  deployment_id: string;
  compute: string;
  attack_surface: {
    public: Array<{ path: string; note: string }>;
    private: Array<{ path: string; note: string }>;
    external: string[];
    secrets: string[];
  };
  findings: {
    exploit_lab_enabled: boolean;
    aws_runtime: boolean;
    is_local: boolean;
    cspm_misconfigurations: Array<{
      id: string;
      finding: string;
      severity: string;
      active: boolean;
      trigger: string;
    }>;
    active_cves: Array<{
      cve: string;
      package: string;
      severity: string;
      service: string;
      active: boolean;
      exploitable: boolean;
    }>;
    iam_misconfigurations: Array<{
      role: string;
      finding: string;
      details: string;
      severity: string;
      active: boolean;
      trigger: string;
    }>;
  };
}

interface PoC {
  id: string;
  cve: string;
  title: string;
  method: "POST" | "GET";
  apiPath: string;
  description: string;
  outcome: string;
  requiresPillow?: boolean;
  awsOnly?: boolean;
}

const POCS: PoC[] = [
  {
    id: "pillow-rce",
    cve: "CVE-2023-50447",
    title: "Pillow RCE",
    method: "POST",
    apiPath: "/api/security/demo/pillow",
    requiresPillow: true,
    description:
      "Exploits a known bug in Pillow 10.0.1 (ImageMath.eval). An attacker who can trigger image processing runs arbitrary shell commands inside the chat-rag container.",
    outcome:
      "Runs `id` in the container and writes a marker file. Proves a scanner finding is actually exploitable at runtime — what eBPF/runtime protection tools would detect.",
  },
  {
    id: "iam-role-abuse",
    cve: "CWE-269",
    title: "IAM role abuse",
    method: "POST",
    apiPath: "/api/security/demo/iam-abuse",
    awsOnly: true,
    description:
      "Simulates an attacker who already has code execution in chat-rag using the attached ECS task IAM role. The role has wildcard s3:*, iam:*, and secretsmanager:* permissions.",
    outcome:
      "Calls ListBuckets, ListRoles, and ListSecrets via the task role. Each allowed call appears in CloudTrail — the Cloud XDR / identity abuse story after container compromise.",
  },
  {
    id: "path-traversal",
    cve: "CVE-2021-41773",
    title: "Path traversal",
    method: "GET",
    apiPath: "/api/security/demo/traversal",
    description:
      "A legacy `/legacy/download` handler joins user input to a file path without checking for `../`. Same pattern as Apache path traversal CVEs — intended to serve public assets only.",
    outcome:
      "Reads `confidential/api-credentials.txt` outside the public directory and returns synthetic API keys. Shows credential leak from a simple missing path validation.",
  },
  {
    id: "unauth-reindex",
    cve: "CWE-306",
    title: "Unauth reindex",
    method: "POST",
    apiPath: "/api/security/demo/reindex",
    description:
      "chat-rag exposes `POST /reindex` with no authentication. Locally, the service is bound to port 8001 — an admin action reachable from the host without going through the frontend.",
    outcome:
      "Wipes and rebuilds the RAG knowledge base (ChromaDB). Returns chunk count. Shows unauthorized admin access from network exposure + missing auth.",
  },
];

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
        active ? "bg-coral-100 text-coral-800" : "bg-teal-100 text-teal-800"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function Severity({ level }: { level: string }) {
  const colors: Record<string, string> = {
    Critical: "text-coral-700",
    High: "text-amber-700",
    Medium: "text-yellow-700",
    Info: "text-ocean-500",
  };
  return <span className={`text-xs font-medium ${colors[level] || "text-ocean-600"}`}>{level}</span>;
}

export default function SecurityPage() {
  const [posture, setPosture] = useState<PostureData | null>(null);
  const [results, setResults] = useState<Record<string, { ok: boolean; data: unknown }>>({});
  const [running, setRunning] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/security/posture");
    if (res.ok) setPosture(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function runPoC(poc: PoC) {
    setRunning(poc.id);
    try {
      const res = await fetch(poc.apiPath, { method: poc.method });
      const data = await res.json();
      setResults((prev) => ({ ...prev, [poc.id]: { ok: res.ok, data } }));
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [poc.id]: { ok: false, data: { error: err instanceof Error ? err.message : "Failed" } },
      }));
    } finally {
      setRunning(null);
    }
  }

  if (!posture) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-ocean-500">
        Loading posture…
      </div>
    );
  }

  const { findings } = posture;
  const activeCspm = findings.cspm_misconfigurations.filter((m) => m.active);
  const activeIam = findings.iam_misconfigurations.filter((m) => m.active && m.severity !== "Info");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-ocean-900">
          Security Posture &amp; Monitoring Demo
        </h1>
        <p className="mt-2 text-ocean-600">
          Reference deployment for CSPM, Cloud XDR, AI SPM, and container runtime workshops.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          {[
            { label: "Application", value: posture.application },
            { label: "Environment", value: posture.environment },
            { label: "Deployment", value: posture.deployment_id },
            { label: "Compute", value: posture.compute },
          ].map((m) => (
            <span key={m.label} className="rounded-lg bg-ocean-50 px-3 py-1.5 text-ocean-700">
              <span className="text-ocean-500">{m.label}: </span>
              <span className="font-medium">{m.value}</span>
            </span>
          ))}
        </div>
      </div>

      {/* CSPM */}
      <section className="card p-5 mb-6">
        <h2 className="font-display text-lg font-bold text-ocean-900 mb-1">CSPM Misconfigurations</h2>
        <p className="text-xs text-ocean-500 mb-4">
          {activeCspm.length} active in this environment
        </p>
        <div className="space-y-2">
          {findings.cspm_misconfigurations.map((m) => (
            <div key={m.id} className="flex items-start justify-between gap-3 py-2 border-b border-ocean-50 last:border-0">
              <div>
                <p className="text-sm text-ocean-900">{m.finding}</p>
                <p className="text-xs text-ocean-500 mt-0.5">{m.trigger}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Severity level={m.severity} />
                <StatusBadge active={m.active} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Attack surface */}
      <section className="card p-5 mb-6">
        <h2 className="font-display text-lg font-bold text-ocean-900 mb-4">Attack Surface Paths</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ocean-500 mb-2">Public</h3>
            <ul className="space-y-1">
              {posture.attack_surface.public.map((ep) => (
                <li key={ep.path} className="text-sm">
                  <code className="font-mono text-ocean-800">{ep.path}</code>
                  <span className="text-ocean-500 text-xs ml-1">— {ep.note}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ocean-500 mb-2">Private / internal</h3>
            <ul className="space-y-1">
              {posture.attack_surface.private.map((ep) => (
                <li key={ep.path} className="text-sm">
                  <code className="font-mono text-ocean-800">{ep.path}</code>
                  <span className="text-ocean-500 text-xs ml-1">— {ep.note}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-ocean-500 mt-3">
              External: {posture.attack_surface.external.join(", ")}
            </p>
            <p className="text-xs text-ocean-500">
              Secrets: {posture.attack_surface.secrets.join(", ")}
            </p>
          </div>
        </div>
      </section>

      {/* CVEs */}
      <section className="card p-5 mb-6">
        <h2 className="font-display text-lg font-bold text-ocean-900 mb-1">Active CVEs</h2>
        <p className="text-xs text-ocean-500 mb-4">
          Built into chat-rag image (pillow 10.0.1)
        </p>
        {findings.active_cves.length === 0 ? (
          <p className="text-sm text-ocean-600">None detected — rebuild chat-rag if pillow should be present</p>
        ) : (
          findings.active_cves.map((c) => (
            <div key={c.cve} className="flex items-center justify-between gap-3 py-2">
              <div>
                <p className="text-sm font-mono text-ocean-900">{c.cve}</p>
                <p className="text-xs text-ocean-500">
                  {c.package} · {c.service}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Severity level={c.severity} />
                <StatusBadge active={c.active} />
              </div>
            </div>
          ))
        )}
      </section>

      {/* IAM */}
      <section className="card p-5 mb-8">
        <h2 className="font-display text-lg font-bold text-ocean-900 mb-1">IAM Misconfigurations</h2>
        <p className="text-xs text-ocean-500 mb-4">
          {activeIam.length} active overprivileged role{activeIam.length !== 1 && "s"}
        </p>
        <div className="space-y-3">
          {findings.iam_misconfigurations.map((m, i) => (
            <div key={`${m.role}-${i}`} className="flex items-start justify-between gap-3 py-2 border-b border-ocean-50 last:border-0">
              <div>
                <p className="text-sm font-mono text-ocean-800">{m.role}</p>
                <p className="text-sm text-ocean-900">{m.finding}</p>
                <p className="text-xs text-ocean-500">{m.details}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Severity level={m.severity} />
                <StatusBadge active={m.active} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PoC section */}
      <section className="mb-8">
        <h2 className="font-display text-xl font-bold text-ocean-900 mb-1">PoC Attacks</h2>
        <p className="text-sm text-ocean-600 mb-4">
          Run controlled exploits against active findings. Synthetic data only.
        </p>

        <div className="space-y-3">
          {POCS.map((poc) => {
            const result = results[poc.id];
            const blocked =
              (poc.requiresPillow && findings.active_cves.length === 0) ||
              (poc.awsOnly && !findings.aws_runtime);

            return (
              <div key={poc.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ocean-900">{poc.title}</p>
                    <p className="text-xs font-mono text-ocean-500">{poc.cve}</p>
                    <p className="text-sm text-ocean-700 mt-2">{poc.description}</p>
                    <p className="text-xs text-ocean-500 mt-1">
                      <span className="font-medium text-ocean-600">Outcome: </span>
                      {poc.outcome}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={blocked || running === poc.id}
                    onClick={() => runPoC(poc)}
                    className="btn-primary text-xs px-4 py-2 disabled:opacity-40"
                  >
                    {running === poc.id ? "Running…" : "Run PoC"}
                  </button>
                </div>
                {result && (
                  <pre className="mt-3 text-xs font-mono bg-ocean-50 rounded-lg p-3 overflow-x-auto max-h-48 overflow-y-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="text-center">
        <Link href="/" className="btn-secondary text-sm">
          Back to Shop
        </Link>
      </div>
    </div>
  );
}
