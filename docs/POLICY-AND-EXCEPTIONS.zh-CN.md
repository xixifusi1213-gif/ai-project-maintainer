# Policy 和 Exceptions

## Policy

通用门禁策略文件：

```text
.ai-maintainer/policy.yml
```

默认策略面向开源项目和 AI coding 项目维护：

```yaml
profile: auto
mode: strict
checks:
  gitleaks: block
  trivy: block
  semgrep: block
  osv-scanner: warn
  syft: warn
  grype: warn
  actionlint: block
  zizmor: warn
  checkov: warn
  trivy-config: warn
  scorecard: warn
  megalinter: warn
  pre-commit: warn
fail_on:
  tests: true
  secrets: true
  dependency_high_or_critical: true
  semgrep_blocking: true
  trivy_unavailable: true
  electron_dangerous_settings: true
  ci_security_high: true
warn_on:
  missing_optional_tools: true
```

`checks` 支持三个级别：

- `block`：失败会阻断门禁。
- `warn`：失败或缺失只进入警告和维护分，不阻断。
- `off`：关闭该检查。

## 生产审查策略

生产画像策略文件：

```text
.ai-maintainer/risk-policy.yml
```

默认情况下，生产证据缺口只标为 `GAP`，不阻断：

```yaml
production:
  block_on_coverage_gaps: false
  block_on_user_decisions: false
  require_intake: false

production_evidence:
  block_on_missing_release_approval: false
  block_on_missing_error_monitoring: false
  block_on_missing_alerting: false
  block_on_missing_database_governance: false
  block_on_missing_deployment_evidence: false
  block_on_connector_auth_failure: false
```

接近正式上线时，可以逐步开启更严格策略：

```yaml
production:
  block_on_coverage_gaps: true

production_evidence:
  block_on_missing_release_approval: true
  block_on_missing_error_monitoring: true
  block_on_missing_deployment_evidence: true
```

建议先让报告稳定，再把缺口变成硬阻断。

## Exceptions

例外文件：

```text
.ai-maintainer/exceptions.yml
```

格式：

```yaml
exceptions:
  - id: "example-dev-only-vuln"
    check: "package-audit"
    reason: "dev-only transitive dependency, not shipped"
    expires: "2026-09-01"
    owner: "repo-owner"
```

必须包含：

- `id`
- `check`
- `reason`
- `expires`
- `owner`

## 规则

- 过期例外视为失败。
- 缺字段例外视为失败。
- 例外只能降级指定 finding，不能关闭整个工具。
- `check` 推荐填写稳定的 `checkId`，例如 `package-audit`、`semgrep`、`gitleaks`。
- 例外使用情况会写入 JSON 和 Markdown 报告。

## 建议

适合例外：

- dev-only 传递依赖漏洞，确认不随产品发布。
- 明确误报，并有理由和负责人。
- 上游暂未修复，但有临时缓解措施和短过期时间。

不适合例外：

- 真实 secret 泄露。
- 生产依赖高危漏洞且没有缓解措施。
- 测试或构建失败。
- Electron 危险 IPC 或危险 webPreferences。
- 严格模式下 Trivy 数据库不可用。
