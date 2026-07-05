# 项目类型 Profile 规则包

Profile 的作用是让门禁更像“按项目类型审查”，而不是对所有项目套同一套重点。

默认建议使用 `--profile auto`：工具会根据本地文件、依赖和目录结构自动识别主规则包，并把识别结果写进报告。

## 支持的 Profile

| Profile | 适合项目 | 额外关注点 |
| --- | --- | --- |
| `electron-desktop` | Electron 桌面应用 | IPC/preload、本地文件权限、shell/openExternal、自动更新、打包发布可信度 |
| `nextjs-web` | Next.js Web 应用 | auth middleware、API routes、Server Actions、环境变量边界、headers/CORS/upload、部署证据 |
| `node-api` | Node API 服务 | 认证鉴权、输入校验、rate limit、CORS、日志脱敏、接口测试 |
| `database-prisma` | Prisma/数据库项目 | schema、migrations、破坏性迁移、备份、回滚/forward-fix、事务和并发写入 |
| `oss-library` | npm 库或 CLI | package 元数据、license、README、CI、Scorecard、SBOM、provenance、SemVer、发布说明 |

旧值 `oss` 继续兼容，内部等价为 `oss-library`。

## 自动识别优先级

多个 profile 同时命中时，主 profile 按这个顺序选择：

```text
electron-desktop > database-prisma > nextjs-web > node-api > oss-library
```

报告会保留所有命中的 signals，方便维护者判断工具有没有选错重点。

## 覆盖优先级

配置合并顺序固定为：

```text
工具默认 policy < profile policy < .ai-maintainer/policy.yml < CLI --profile
```

日常使用：

```powershell
npx ai-project-maintainer init "E:\my-project" --profile auto --ci github
npx ai-project-maintainer audit-plan "E:\my-project" --profile auto
npx ai-project-maintainer gate "E:\my-project" --profile auto --production --agent-risk --strict --release
```

如果自动识别不符合你的真实项目，可以显式指定：

```powershell
npx ai-project-maintainer gate "E:\my-project" --profile database-prisma --production --strict --release
```

也可以写进 `.ai-maintainer/policy.yml`：

```yaml
profile: database-prisma
mode: strict
```

## Profile 改变什么

Profile 会影响：

- 默认检查等级
- audit-plan 审查重点
- wizard 追加问题
- 报告里的风险重点解释
- 建议下一步

Profile 不会替代维护者判断。业务正确性、风险接受、生产责任仍然由项目负责人确认。
