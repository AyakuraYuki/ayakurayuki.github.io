# Blog: controlled RhineLabUI integration

## 当前协作状态（2026-09-10）

- `hugo` 分支是用户指定的完整历史备份，只读。不得提交、合并、重置、变基、强推、删除或更新该分支的指针；本项目清理仅在 `codex/rhine-blog` 进行，不操作其他项目。

- 后续直接在 `/Users/ayakurayuki/Codes/github/AyakuraYuki/ayakurayuki.github.io` 的 `codex/rhine-blog` 分支开发。用户已移除独立迁移 worktree；不要继续使用旧的 `ayakurayuki.github.io-rhine-blog` 路径，也不要自行重建该 worktree。
- 用户创建了 `rhine-blog` 分支，用于备份工作分支、保存主线变更。日常开发仍在 `codex/rhine-blog`；此记录不代表可以自动覆盖、重置或同步备份分支。
- 用户已授权首次发布，并于 2026-09-10 告知已手动执行发布工作流。当前记录为“用户已触发发布”；本次未核验运行结果，不将触发等同于成功上线，不重复触发。后续发布仍按明确授权执行。
- 一、二阶段及界面清理已获用户验收；页面不再展示迁移进度等内部说明。

## 实现与维护约定
- 日常文章源继续为根目录 `content/post/<bundle>/index.zh-cn.md` 及随文附件。兼容 YAML / TOML；不得为了适配新框架批量改写源文件或重编号。
- Astro 应用只位于 `site/`，静态输出为 `site/dist/`。不得把 Hugo 的根目录 `public/` 当作新站静态输入。
- 当前工作分支已移除旧 Hugo 配置、模板、播放器/CDN 接入及旧发布工作流，使用现行 Astro / RhineLabUI 实现。恢复旧 Hugo 只能读取历史分支或另行授权的隔离副本；禁止向历史分支合并或提交清理。
- 不使用第三方博客主题或前端 / 动效 Skill；保留原生 TypeScript 和既有三维实现方向。阅读层与三维场景分离。
- RhineLabUI 的上游版本与文件校验值由 `migration/rhine-upstream.lock.json` 记录。普通博客构建不得拉取上游 main 或依赖另一个正在变化的工作目录。
- 已接入固定版本运行时、模型、声音与字体；PWA 仍未启用。vendor/rhine 保持原样，博客适配在 site/src/archive，派生文件差异由 migration/rhine-adapter.patch 校验。模型资源及源脚本一起锁定，不将第三方资产自动视为 MIT。
- 美术修改继续通过 Blender MCP，保留源文件和可复现脚本。不在博客迁移时改动上游已确认的模型、灯光和运动规则。
- 依赖固定版本并提交 lockfile，使用 `npm ci`；内容发布与依赖升级分开。普通 CI 只构建、检查和保存产物，不部署；手动发布工作流必须明确提交SHA、publish开关和域名确认，实际执行仍需用户单独授权。
- 修改后在 `site/` 运行 `npm run verify`。浏览器验证为 `npm run test:browser`；本地可设置 `PLAYWRIGHT_CHANNEL=chrome` 使用系统 Chrome 的独立无头实例。不得把 Chromium 手机尺寸模拟说成 iPhone / Safari 实机验证。
- `check:baseline` / `verify:baseline` 保留首次切换时的历史源文件审计，不阻止日常文章修订。普通 verify 检查当前内容语义与输出；不能让构建自动重建旧基线掩盖变化。已审批删除的旧文件单独记录于 migration/retired-legacy-files.json；历史审计逐项检查原始哈希、预期缺失与保留文件，不再把有记录的清理误报为内容丢失。
- 首次发布前已在 Edge 核对 Pages 使用 GitHub Actions、域名为 `blog.ayakurayuki.cc`、HTTPS 已开启，`github-pages` 环境允许 `hugo` / `master`。这是当时的配置快照，不是部署成功证明；执行新发布前仍核对实际状态。操作见 RELEASE.md。

## 删除审批约束

- 用户明确要求：每一条删除命令都须单独审批。执行前列明命令目标与影响，逐条请求，不合并多个删除命令，不使用脚本、通配批量清理、构建清理或测试清理绕过。
- `git rm`、`rm`、删除本地配置节、移除 Git 元数据均适用；某条被拒绝/执行失败后，变更参数重试也须重新审批。非删除的备份与检查不构成删除授权。
- 本次保留 `.git/modules/themes/hugo-theme-stack` 及 `site/.cache/theme-removal-2026-09-10/` 的完整备份，不自行进一步清除。详见 `migration/THEME-REMOVAL.md`。

## 上游网页同步（2026-09-11）

- 博客上游更新到 RhineLabUI main `3274778cbb8bb05ca2472d706c5879fa002ecd93`，替代 `e313777` 基线。锁定源码/资源和适配差异一起更新；不复制上游dist覆盖博客。
- 同步自由平面拖动、持续惯性、悬停轻抬、滚轮选档、自适应候选与裁剪、暗色、正常开场铺屏、点击声音解锁、滚动时钟和超级性能模式。博客实际列数仍为五类，文章数量不受八篇限制；动态物理实例数不等同于文章数量。
- MiSans采用上游固定 `misans-webfont@4.3.1` 同源分包，四个旧整包经逐条审批移除。字体来源/许可与生成脚本保留；阅读页使用相同分包并共享配色偏好。
- 默认声音继续尊重博客已有静音选择。开启声音/音乐且为首次常规进入时等待手势；外链预览、历史返回与参考参数沿博客原规则直接定位。
- PWA不启用；Wallpaper Engine工作台、宿主媒体、小游戏、HUD、自定义壁纸和卸载入口不在博客初始化。只使用网页通用功能，仍须保证正文直达不加载Three.js。
- 全套浏览器测试和构建会清理各自结果目录，仍须单独审批；不因升级自动发布或改写历史hugo分支。验证见 migration/UPSTREAM-2026-09-11.md。
