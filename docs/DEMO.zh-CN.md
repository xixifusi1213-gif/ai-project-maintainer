# 演示：从 AI 写出的项目到生产审查报告

这个演示使用仓库里的真实项目：`examples/demo-ai-app`。不需要付费账号，也不需要外部 API。

演示素材：

- [90 秒 GIF 故事板](../assets/demo-90s.gif)
- [90 秒浏览器演示页](demo-output/90-second-demo.html)
- [before/after 案例](demo-output/before-after-case.md)

## 1. 跑健康态项目

```powershell
npm test --prefix .\examples\demo-ai-app
npm run build --prefix .\examples\demo-ai-app
```

这个项目很小：它负责订单报价和订单释放判断。测试覆盖的是不能被 AI 修改坏的核心业务行为。

## 2. 生成坏掉的 before 状态

```powershell
node .\examples\demo-ai-app\scripts\create-before-state.mjs
```

命令会输出一个临时目录。进入那个复制出来的项目后运行：

```powershell
npm test
```

你会看到业务测试失败。这代表“AI 写出来看起来完整，但关键行为已经坏了”的阶段。坏代码只存在于系统临时目录，仓库不会提交假 secret 或故意脆弱的源码。

## 3. 跑可复现的 demo gate

```powershell
node .\examples\demo-ai-app\scripts\run-demo-gate.mjs
```

这个脚本会运行真实的 AI Project Maintainer gate，但会临时创建扫描器 mock，所以即使本机还没安装 Gitleaks、Trivy、Semgrep、OSV-Scanner、Syft、Grype、actionlint、zizmor、Scorecard，也能稳定生成示例报告。

预期结果：

```text
Local Security Gate: PASS_WITH_GAPS
Blocking Checks: None
Coverage Gaps:
- Production release approval
- Error monitoring
- Production logs
- Production metrics
- Production alerts
```

示例报告见：[sample report](demo-output/security-report.md)。

## 4. 跑真实 gate

安装扫描器 CLI 后，可以用真实项目同款命令：

```powershell
npx ai-project-maintainer gate .\examples\demo-ai-app --production --strict --release --output reports/security-report.json
```

这个工具不是为了假装项目完美，而是把已经检查失败的项和缺少的生产证据在发布前明确展示出来。

## 5. 让 Codex 修阻断项

可以这样要求 Codex：

```text
$ai-project-maintainer run the production gate for this project, fix blockers, and rerun until it passes.
```

Codex 适合处理确定性的阻断项。维护者仍然负责业务决策、风险接受和生产证据确认。
