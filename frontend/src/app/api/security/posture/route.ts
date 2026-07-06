import { NextResponse } from "next/server";
import { proxyChat } from "@/lib/demoLab";

const BASE = {
  application: "jays-surf-shop",
  environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.ENVIRONMENT || "local",
  deployment_id: process.env.DEPLOYMENT_ID || "local",
  compute: process.env.AWS_EXECUTION_ENV ? "aws-ecs-fargate" : "container",
  attack_surface: {
    public: [
      { path: "/", note: "Shop catalog" },
      { path: "/chat", note: "Shop Crew UI" },
      { path: "/design", note: "Create-A-Board UI" },
      { path: "/api/chat", note: "Unauthenticated → OpenAI" },
      { path: "/api/board", note: "Unauthenticated → image gen" },
      { path: "/api/security/posture", note: "Posture metadata" },
      { path: "/api/security/demo/*", note: "PoC proxy" },
    ],
    private: [
      { path: "chat-rag:8001/chat", note: "RAG + GPT-4o-mini" },
      { path: "chat-rag:8001/demo/exploit/*", note: "Exploit lab" },
      { path: "chat-rag:8001/reindex", note: "Unauthenticated admin (local compose)" },
      { path: "board-generator:8002/generate", note: "DALL·E / gpt-image" },
    ],
    external: ["openai-api"],
    secrets: ["openai-api-key (Secrets Manager on AWS)"],
  },
};

interface DemoStatus {
  aws_runtime?: boolean;
  pillow_installed?: string | null;
}

function buildFindings(env: string, demo: DemoStatus) {
  const aws = demo.aws_runtime === true;
  const local = env === "local" || env === "demo-local";
  const pillow = demo.pillow_installed ?? null;

  return {
    exploit_lab_enabled: true,
    aws_runtime: aws,
    is_local: local,
    cspm_misconfigurations: [
      {
        id: "public-s3",
        finding: "Public S3 bucket with synthetic customer export",
        severity: "Critical",
        active: aws,
        trigger: "Terraform (always deployed)",
      },
      {
        id: "iam-wildcard",
        finding: "ECS task role: s3:*, iam:*, secretsmanager:* on *",
        severity: "Critical",
        active: aws,
        trigger: "Terraform (always deployed)",
      },
      {
        id: "ssh-sg",
        finding: "SSH (22) open to 0.0.0.0/0 on ECS security group",
        severity: "High",
        active: aws,
        trigger: "Terraform (always deployed)",
      },
      {
        id: "chat-rag-exposed",
        finding: "chat-rag published on host port 8001",
        severity: "Medium",
        active: local,
        trigger: "docker-compose port mapping",
      },
    ],
    active_cves: pillow
      ? [
          {
            cve: "CVE-2023-50447",
            package: `pillow ${pillow}`,
            severity: "HIGH",
            service: "chat-rag",
            active: true,
            exploitable: true,
          },
        ]
      : [],
    iam_misconfigurations: [
      {
        role: "jays-surf-shop-demo-ecs-task",
        finding: "demo-overprivileged policy attached",
        details: "s3:*, secretsmanager:*, iam:* on Resource *",
        severity: "Critical",
        active: aws,
        trigger: "Terraform (always deployed)",
      },
    ],
  };
}

export async function GET() {
  let demo: DemoStatus = {};
  try {
    const res = await proxyChat("/demo/exploit/status");
    if (res.ok) demo = await res.json();
  } catch {
    /* chat-rag unreachable */
  }

  const findings = buildFindings(BASE.environment, demo);

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      event_type: "security_posture_check",
      service: "frontend",
      environment: BASE.environment,
      exploit_lab: true,
    })
  );

  return NextResponse.json({
    ...BASE,
    findings,
  });
}
