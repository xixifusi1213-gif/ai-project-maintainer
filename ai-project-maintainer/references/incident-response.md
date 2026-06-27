# Incident Response

Use this reference when the user reports an outage, degraded service, suspicious production behavior, alert storm, data issue, or asks for SRE/root-cause help.

## Safety Rules

- Stay read-only unless the user explicitly asks for a mitigation and confirms the target environment.
- Preserve evidence before cleanup.
- Prefer reversible mitigations: rollback, traffic shift, feature flag disable, rate limit, queue pause, or read-only mode.
- Do not run destructive database, Kubernetes, or cloud commands as part of diagnosis.

## Triage Flow

1. Define the incident window, affected service, symptoms, and customer impact.
2. Build a timeline: deploys, config changes, database migrations, infra changes, traffic changes, alerts, and dependency events.
3. Check blast radius: which regions, tenants, endpoints, queues, jobs, or database tables are affected.
4. Correlate signals: logs, metrics, traces, Kubernetes events, rollout history, error budgets, and saturation metrics.
5. Identify likely trigger and immediate mitigation.
6. Record follow-up guardrails that would have caught the issue before production.

## Tool Routing

- Kubernetes: use `kubectl` read-only commands, k8sgpt, Kubescape, or HolmesGPT.
- Observability: query Prometheus/Grafana/Loki/ELK/Jaeger/Datadog/Sentry only when credentials or tools are already available.
- AI SRE: use HolmesGPT or OpenSRE to correlate logs, metrics, traces, and runbooks when configured.
- Database incidents: read `database.md` and look for recent migrations, locks, slow queries, deadlocks, replication lag, and connection pool exhaustion.
- Network incidents: read `security.md` and inspect ingress, DNS, certificates, firewall/security-group changes, service mesh, and egress policy.

## Useful Read-Only Commands

Adapt to the cluster and namespace:

```bash
kubectl get pods,deploy,svc,ingress -A
kubectl get events -A --sort-by=.lastTimestamp
kubectl rollout history deployment/<name> -n <namespace>
kubectl logs deployment/<name> -n <namespace> --since=30m
k8sgpt analyze
holmes ask "What changed before this alert and what is the most likely root cause?"
```

## Incident Output

Return:

- Current assessment and confidence.
- Timeline with concrete timestamps where available.
- Blast radius.
- Most likely trigger and competing hypotheses.
- Immediate mitigation options with rollback risk.
- Evidence still needed.
- Preventive guardrails for CI, deploy, monitoring, or database migration.
