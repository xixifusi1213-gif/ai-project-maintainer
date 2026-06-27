# Policy 和 Exceptions

## Policy

每个项目可以有自己的门禁策略：

```text
.ai-maintainer/policy.yml
```

默认策略：

```yaml
mode: strict
fail_on:
  tests: true
  secrets: true
  dependency_high_or_critical: true
  semgrep_blocking: true
  trivy_unavailable: true
  electron_dangerous_settings: true
  ci_security_high: true
warn_on:
  dev_dependency_vulnerabilities: true
  missing_optional_tools: true
```

第一期策略重点是“行业里普遍认可的安全底线”：测试要过、secret 不能进仓库、生产依赖高危漏洞要处理、静态安全发现不能忽略、Trivy 数据库不可用不能假装通过、Electron 危险设置要阻断、CI 高风险配置要修。

## Exceptions

例外文件：

```text
.ai-maintainer/exceptions.yml
```

例外必须很窄，只能降低某一个 finding，不能关闭整个工具。

格式：

```yaml
exceptions:
  - id: "example-dev-only-vuln"
    check: "npm audit"
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
- 缺少 `reason`、`expires` 或 `owner` 的例外视为失败。
- 例外只匹配指定 check 名称或分组。
- 例外会出现在报告里，方便后续清理。

## 什么时候可以用例外

适合用例外：

- dev-only 传递依赖漏洞，确认不随产品发布。
- 工具误报，已经有文件和原因证明。
- 上游暂未修复，但项目已有隔离措施，并设置了很短过期时间。

不适合用例外：

- 真实 secret 泄露。
- 生产依赖高危漏洞且没有缓解措施。
- Electron 任意文件读取、危险 webPreferences。
- 测试或构建失败。
- Trivy 数据库不可用。

这些应该修复，而不是例外。
