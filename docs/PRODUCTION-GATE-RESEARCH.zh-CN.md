# v1.5.0 Production Accident / Data Exposure Gate 调研

本文是 `v1.5.0` 的技术调研和设计输入。目标不是承诺“绝对安全”，而是把 AI-coded 产品的常见生产事故前置成可检查、可报告、可修复或必须由维护者确认的门禁项。

## 结论

`v1.5.0` 应该做一个专门的 **Production Accident / Data Exposure Gate**。

它要达到的工程标准是：

> 对于没有专业攻击团队、0day、恶意内部人、复杂定向供应链攻击的场景，被工具维护过的 AI-coded 产品，应该能抵抗常见误用、低技术攻击、配置错误、数据误暴露、数据库误操作和普通生产事故。没有证据的安全假设不能算通过。

当前 `v1.4.4` 已经是强 release readiness gate，但还没有系统性建模以下事故：

- 用户 A 看到用户 B 的数据。
- 普通用户调用管理员接口。
- API 返回不该返回的敏感字段。
- 日志、错误上报、AI repair-pack 泄露 token、邮箱、地址、订单号、报销信息。
- webhook、cron、queue、支付、订单、库存等流程重复执行。
- 数据库 migration、并发写、缺少事务或唯一约束导致数据错乱。
- AI 为了通过检查删除鉴权、跳过校验、吞掉异常、扩大权限、删除测试。

所以 v1.5.0 的重点不是新增 connector 或 scanner，而是新增一层结构化的业务安全模型和生产事故门禁。

## 一手标准依据

| 来源 | 对 v1.5.0 的意义 |
| --- | --- |
| [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) | 作为应用安全验证需求骨架，强调可测试的技术控制。 |
| [OWASP API1:2023 Broken Object Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/) | 直接对应“用户 A 看到用户 B 数据”。所有接收对象 ID 并操作对象的 API 都需要对象级授权证据。 |
| [OWASP Authorization Testing Automation](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Testing_Automation_Cheat_Sheet.html) | 支持把角色、功能、数据范围整理成授权矩阵，并用集成测试验证。 |
| [OWASP API6:2023 Sensitive Business Flows](https://owasp.org/API-Security/editions/2023/en/0xa6-unrestricted-access-to-sensitive-business-flows/) | 覆盖低技术滥用：抢库存、刷评论、占预约、重复触发业务动作。 |
| [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) | 日志本身可能含个人和敏感数据，需要排除、遮蔽、清洗、哈希或加密。 |
| [OWASP Top 10:2025 Broken Access Control](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/) | Broken Access Control 仍是最高优先级，失败会导致未授权披露、修改、销毁数据或越权业务操作。 |
| [OWASP Top 10:2025 Security Logging and Alerting Failures](https://owasp.org/Top10/2025/A09_2025-Security_Logging_and_Alerting_Failures/) | 支持把告警用例、异常处理和敏感日志作为生产门禁。 |
| [NIST SSDF SP 800-218](https://csrc.nist.gov/pubs/sp/800/218/final) | 支持把安全实践放入 SDLC，减少漏洞、降低影响、修根因。 |
| [NIST Privacy Framework](https://www.nist.gov/privacy-framework) | 支持把个人数据和隐私风险作为产品风险建模对象。 |
| [NIST CSF 2.0](https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf) | 支持同时覆盖预防、检测、响应和恢复，不只做上线前扫描。 |
| [CISA Secure by Design](https://www.cisa.gov/resources-tools/resources/secure-by-design) | 支持把安全负担从用户转回产品和工具，不能期待 solo founder 自己推导所有门禁项。 |
| [SLSA](https://slsa.dev/) / [OpenSSF Scorecard](https://scorecard.dev/) | 继续覆盖供应链、构建完整性、repo hygiene，但不能替代业务数据和授权边界。 |
| [OWASP LLM Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/) / [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework) | 支持 AI repair safety：LLM 输出必须被验证，过度代理、敏感信息披露、供应链和过度信任都要被约束。 |

## 当前工具覆盖面

当前工具已经覆盖了很多基础能力：

- secret 扫描。
- 依赖审计和漏洞扫描。
- Semgrep 静态代码风险。
- Trivy / SBOM / supply-chain。
- CI workflow hardening。
- Electron、数据库 migration、backup、rollback gap。
- 监控、日志、告警、发布审批 gap。
- `quickstart` 低成本首次运行。
- `repair-pack` 把 blocker、warning、gap、user decision 转成 AI agent 任务。
- `risk-policy.yml` 可以让 production gaps / user decisions 阻塞完整 gate。

当前已经有的关键入口：

- `.ai-maintainer/project-profile.yml`
- `.ai-maintainer/evidence-sources.yml`
- `.ai-maintainer/business-flows.yml`
- `.ai-maintainer/risk-policy.yml`
- `init-audit --wizard`
- `audit-plan`
- `gate --production --strict --release`
- `repair-pack`

这些是 v1.5.0 的基础，不应该推倒重来。

## 关键缺口

当前最大的缺口不是“扫描器少”，而是缺少结构化业务安全证据。

| 风险 | 当前状态 | v1.5.0 应补齐 |
| --- | --- | --- |
| 用户数据泄露 | 只能问是否处理敏感数据 | 数据清单、敏感字段、存储位置、输出位置、日志规则 |
| 用户 A 看用户 B 数据 | 只能泛化为 auth/API 风险 | 对象级授权矩阵、租户隔离声明、测试证据 |
| 管理员接口被普通用户调用 | 有 admin_roles 问题，但不够结构化 | 角色 x 资源 x 动作矩阵，未覆盖组合阻塞 |
| API 返回敏感字段 | Semgrep 可能碰巧发现 | response field allowlist / denylist 证据 |
| 日志泄露 | 有 log redaction 问题，但不是 gate 核心 | 敏感字段 log redaction 检查与证据 |
| 支付/订单/webhook 重复执行 | 只有 critical flow tests | idempotency、重复提交、重放、side effect 证据 |
| 数据库并发/事务错误 | 有 migration/backups/rollback | 关键写事务、唯一约束、并发测试、恢复演练证据 |
| AI 修复破坏业务规则 | repair-pack 有提示 | repair invariants 和 diff gate，禁止删除鉴权、测试、校验、审计日志 |

## v1.5.0 设计

### 1. 新增生产安全模型

建议新增两个文件，并扩展一个现有文件：

```text
.ai-maintainer/data-boundaries.yml
.ai-maintainer/authz-matrix.yml
.ai-maintainer/business-flows.yml
```

`data-boundaries.yml` 示例：

```yaml
schema_version: 1
data_classes:
  - id: user-profile
    sensitivity: personal
    fields: [email, name, address]
    stored_in: [database]
    exposed_to: [self, admin]
    may_appear_in_logs: false
    tests:
      - tests/privacy/user-profile-redaction.test.ts
  - id: payment-record
    sensitivity: financial
    fields: [amount, paymentIntentId, receiptEmail]
    stored_in: [database, payment_provider]
    exposed_to: [owner, finance-admin]
    may_appear_in_logs: false
    tests:
      - tests/payments/payment-record-access.test.ts
```

`authz-matrix.yml` 示例：

```yaml
schema_version: 1
roles: [anonymous, user, admin]
resources:
  - id: order
    owner_field: userId
    tenant_field: tenantId
    actions:
      read:
        allowed_roles: [owner, admin]
        tests:
          - tests/authz/order-read.test.ts
      refund:
        allowed_roles: [admin]
        tests:
          - tests/authz/order-refund-admin.test.ts
```

扩展 `business-flows.yml`：

```yaml
schema_version: 1
business_flows:
  - id: checkout
    name: Checkout
    criticality: high
    side_effects: [payment, inventory, email]
    abuse_controls: [rate_limit, stock_reservation_limit]
    idempotency_required: true
    replay_safe: true
    tests:
      - tests/checkout/checkout-idempotency.test.ts
      - tests/checkout/checkout-abuse-limit.test.ts
```

### 2. 新增门禁组

| 门禁组 | 触发条件 | 缺证据时 |
| --- | --- | --- |
| `data-exposure` | 项目处理敏感/个人/财务/健康数据 | production strict 下 blocker；quickstart 下 gap |
| `auth-boundary` | 有登录、管理员、公共 API、对象 ID、租户字段 | production strict 下 blocker |
| `business-flow-safety` | 声明 high/critical flow，或检测支付、订单、webhook、cron、queue | 缺测试、幂等、滥用控制时 blocker |
| `database-safety` | 有数据库、migration、关键写入 | 缺 backup、rollback、事务/唯一约束/并发测试时 blocker 或 manual review |
| `operational-safety` | 生产/公开发布 | 缺 error monitoring、alerts、incident runbook、audit logs 时 blocker 或 gap |
| `ai-repair-safety` | 使用 repair-pack 或 AI agent 修复 | 删除测试/鉴权/校验/日志/策略时 blocker |

### 3. 保持 quickstart 低摩擦

`quickstart` 不应该因为没有这些文件直接失败。

建议行为：

- `quickstart`: 输出 `PASS_WITH_GAPS`，列出“生产前必须补”的数据/授权/业务流缺口。
- `gate --production --strict --release`: 缺少这些证据时阻塞。
- `repair-pack`: 把缺口转成 `needs_maintainer_decision` 或 `manual_review_required`，不允许 AI 伪造证据。

### 4. Codex Security 的正确位置

Codex Security 可以作为更强的攻击视角证据源，但不能替代门禁。

推荐集成方式：

```text
business/data/auth model
  -> ai-project-maintainer 生成 security-review-pack
  -> Codex Security 做 attack path / code review
  -> 输出 findings
  -> ai-project-maintainer 归类为 BLOCKER / WARNING / GAP / USER_DECISION
```

它应该重点审：

- 对象级授权绕过。
- 管理员/普通用户边界。
- 敏感字段泄露。
- 日志泄露。
- 业务流滥用路径。
- AI 修复是否削弱安全控制。

Codex Security 的缺失不应该让 quickstart 失败；但对 `handles_sensitive_data=true` 或 `handles_payments=true` 的生产 strict gate，可以作为可配置的强证据要求。

## 能否达到你的底线

如果按上面实现，v1.5.0 可以明显超过当前 v1.4.4，并基本达到你定义的工程底线：

- 能把“用户数据泄露”从泛泛风险变成数据清单、响应边界、日志边界和测试证据。
- 能把“权限边界”从口头确认变成授权矩阵和对象级测试。
- 能把“普通人低技术滥用”纳入业务流 abuse control 和 idempotency 检查。
- 能把“数据库生产事故”从 migration 风险扩展到并发、事务、唯一约束、恢复演练。
- 能把“AI 修复带来的二次事故”纳入 repair invariant，而不是只靠提示词。

但它仍然不能承诺：

- 抵御专业攻击团队、0day、恶意内部人、复杂定向供应链攻击。
- 自动证明真实云环境 IAM、数据库权限、对象存储权限都正确，除非接入对应只读证据。
- 替用户判断商业风险接受。
- 在用户业务描述错误或隐瞒关键流程时仍保证安全。

更准确的产品承诺应该是：

> AI Project Maintainer turns common AI-coded production accidents into explicit release blockers, evidence gaps, and AI repair tasks. It does not claim absolute safety, but it prevents missing evidence from being mistaken for production readiness.

## v1.5.0 验收标准

必须通过这些场景，才算达到本次升级目标：

1. 有登录和敏感数据的 Web/API 项目，如果没有 `data-boundaries.yml` 和 `authz-matrix.yml`，完整生产门禁必须 `FAIL`。
2. 同一个项目跑 `quickstart` 时不能吓退用户，应输出 `PASS_WITH_GAPS`，并明确生产前要补哪些文件。
3. 声明 `payment/order/webhook/cron/queue` 等高风险业务流时，缺 idempotency 或重复执行测试必须阻塞生产 strict gate。
4. 声明租户、owner、admin 角色后，缺对象级授权测试必须阻塞。
5. 敏感字段标记 `may_appear_in_logs: false` 后，报告必须要求日志脱敏证据。
6. 数据库项目不能只看 migration；关键写入缺事务/唯一约束/并发测试证据时必须至少成为 blocker 或 manual review。
7. repair-pack 对数据、权限、生产缺口必须生成 `needs_maintainer_decision` 或 `manual_review_required`，不能生成“AI 直接猜着修”的任务。
8. AI repair safety 检查应阻止删除鉴权、删除测试、删除校验、吞掉异常、扩大权限、关闭审计日志等“为了过门禁而破坏安全”的变更。
9. 报告必须清楚区分“发现漏洞”和“证据不完整”。
10. 所有报告和 repair-pack 继续做 secret / token / DSN 脱敏。

## 建议实现顺序

1. **v1.5.0-a: 模型和文档**
   - 新增 `data-boundaries.yml`、`authz-matrix.yml` 模板。
   - 扩展 `business-flows.yml` schema。
   - 更新 `init-audit --wizard`。

2. **v1.5.0-b: 门禁和报告**
   - 新增 `data-exposure`、`auth-boundary`、`business-flow-safety` 检查组。
   - 在 production strict release 下阻塞缺证据。
   - quickstart 保持非阻塞 gap。

3. **v1.5.0-c: repair-pack 和 AI 安全**
   - 把新门禁转成 AI handoff 任务。
   - 增加 repair invariant 文档和检查。
   - 明确 AI 不能伪造生产证据。

4. **v1.5.0-d: 真实项目验证**
   - 对一个 demo SaaS、一个 API、一个数据库项目、一个含 webhook/cron 的项目跑 smoke。
   - 记录误报、漏报和用户理解成本。

## 推荐定位

v1.5.0 后，产品定位可以升级为：

> Production maintenance gate for AI-coded products.

更具体一点：

> A release gate that converts project type, business flows, data boundaries, authorization rules, tests, scanners, and production evidence into blockers, gaps, and AI repair tasks.

这比“AI 写完代码后跑几个安全扫描”强很多，因为它把真正导致生产事故的业务边界也纳入了门禁。
