# Security Review

Use this reference for application, network, cloud, IaC, dependency, container, and secret security checks.

## AI-Coding Risk Hotspots

AI-generated code commonly introduces plausible-looking but unsafe shortcuts. Prioritize:

- Auth bypasses, missing authorization checks, tenant isolation mistakes, and IDOR.
- Overbroad CORS, public debug endpoints, permissive admin routes, and missing CSRF protections.
- SSRF through user-controlled URLs, webhooks, image fetchers, importers, or proxy endpoints.
- SQL/NoSQL injection from string-built queries or unsafe ORM escape hatches.
- Unsafe file upload, path traversal, zip extraction, and untrusted document parsing.
- Disabled TLS verification, weak JWT validation, hardcoded secrets, and secret logging.
- Excessive IAM permissions, public buckets, open security groups, and unauthenticated internal services.
- Docker/Kubernetes privileged mode, hostPath mounts, root containers, and exposed dashboards.

## Check Sequence

1. Secrets: run Gitleaks or Trivy secret scan first; never display secret values.
2. Dependencies and images: run Trivy or equivalent package audit and separate production/runtime findings from dev-only noise.
3. Static analysis: run Semgrep auto rules, CodeQL if configured, and any repo-native lint/security tests.
4. IaC and cloud config: run Checkov, Trivy config, Conftest/OPA, or Kubescape depending on files present.
5. Targeted manual review: inspect auth boundaries, request validation, dataflow into dangerous sinks, and changed deploy/network files.
6. DAST: use ZAP or Nuclei only for an explicitly scoped local/staging target.

## Network and Cloud Review

For Terraform, Helm, Kubernetes, Docker Compose, or cloud config, identify:

- Internet-exposed ingress/load balancers and whether auth/TLS/WAF is present.
- Security group or firewall rules with `0.0.0.0/0` or overly broad ports.
- IAM wildcard actions/resources and cross-account trust.
- Lack of Kubernetes NetworkPolicy in multi-tenant or internet-facing namespaces.
- Secret material in manifests, env vars, logs, or image layers.
- Missing resource limits, health checks, pod disruption budgets, or rollout safety.

## Finding Standard

Report only actionable findings. Each security finding needs:

- Asset or code path affected.
- Attack path or failure mode.
- Exploit preconditions.
- Concrete fix.
- Verification command, test, or policy.

Mark speculative concerns as coverage gaps, not findings.
