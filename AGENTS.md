# Blog: controlled RhineLabUI integration

- 当前在 `codex/rhine-blog` 分支准备发布；没有授权切换线上站点。页面不再展示迁移进度等内部说明。
- 日常文章源继续为根目录 `content/post/<bundle>/index.zh-cn.md` 及随文附件。兼容 YAML / TOML；不得为了适配新框架批量改写源文件或重编号。
- Astro 应用只位于 `site/`，静态输出为 `site/dist/`。不得把 Hugo 的根目录 `public/` 当作新站静态输入。
- 保留原 Hugo 配置、工作流、CNAME 与主题引用。未经单独确认，不合并迁移到发布分支，不修改默认分支、域名、Pages 设置，不触发生产发布。
- 不使用第三方博客主题或前端 / 动效 Skill；保留原生 TypeScript 和既有三维实现方向。阅读层与三维场景分离。
- RhineLabUI 的上游版本与文件校验值由 `migration/rhine-upstream.lock.json` 记录。普通博客构建不得拉取上游 main 或依赖另一个正在变化的工作目录。
- 已接入固定版本运行时、模型、声音与字体；PWA 仍未启用。vendor/rhine 保持原样，博客适配在 site/src/archive，派生文件差异由 migration/rhine-adapter.patch 校验。模型资源及源脚本一起锁定，不将第三方资产自动视为 MIT。
- 美术修改继续通过 Blender MCP，保留源文件和可复现脚本。不在博客迁移时改动上游已确认的模型、灯光和运动规则。
- 依赖固定版本并提交 lockfile，使用 `npm ci`；内容发布与依赖升级分开。普通 CI 只构建、检查和保存产物，不部署；手动发布工作流必须明确提交SHA、publish开关和域名确认，实际执行仍需用户单独授权。
- 修改后在 `site/` 运行 `npm run verify`。浏览器验证为 `npm run test:browser`；本地可设置 `PLAYWRIGHT_CHANNEL=chrome` 使用系统 Chrome 的独立无头实例。不得把 Chromium 手机尺寸模拟说成 iPhone / Safari 实机验证。
- `check:baseline` / `verify:baseline` 保留首次切换时的历史源文件审计，不阻止日常文章修订。普通 verify 检查当前内容语义与输出；不能让构建自动重建旧基线掩盖变化。
- 一、二阶段已获用户验收。发布准备与真正上线分开，真实Pages配置未核实时不能假定可部署。操作见 RELEASE.md。
