# Hugo Stack 主题移除记录

日期：2026-09-10。分支：`codex/rhine-blog`。移除前主仓库提交：`f15eedb6557bfb33e7d574909a73b1b319a8f939`。

## 依赖检查

- 当前页面由 `site/src/pages` / `layouts` / `components` 生成，阅读样式来自 `site/src/styles`。
- 三维部分使用 `site/src/archive` 和固定 `site/vendor/rhine`，并不引用 Hugo Stack。
- 内容读取 `content/post`，静态附件读取根 `static/`，运行资源读取 `site/static/`。旧 Hugo `public/` 和主题目录不是 Astro 构建输入。
- 现行 `rhine-preview.yml` 与 `blog-release.yml` 均使用 `submodules: false`；package.json 不依赖 Hugo/Stack。
- 仍引用 Stack 的是旧 `hugo.yaml` 和旧 `hugo.yaml` 发布工作流。它们仅保留作历史参考；没有主题时不能直接重建旧博客。

## 已审批操作

1. `git rm -- themes/hugo-theme-stack`：移除主题工作目录及 Git gitlink，并更新 `.gitmodules`。
2. `git config --local --remove-section submodule.themes/hugo-theme-stack`：清理本机注册项。
3. `git rm -- .gitmodules`：因已有暂存变更被 Git 拒绝，没有删除文件。
4. `git rm -f -- .gitmodules`：重新独立审批后，删除确认已空的文件。

每条删除命令都独立提交审批。没有执行通配清理、删除文章或清空 `.git/modules`。

## 备份与保留

主题原提交：`3e123a30b79b5d52a3a8e88a9dd678fcfd28e418`（v4.0.3）。移除前无未提交主题源码，忽略文件为 `.hugo_build.lock`、`assets/jsconfig.json` 及两份 `resources/_gen/` 产物。

本地 `site/.cache/theme-removal-2026-09-10/` 保留：

- `hugo-theme-stack-working-tree.tar.gz`：含忽略文件的工作目录快照，SHA-256 `896ed70688e3e946c52f2fd890fe1577b4246db499120f6e135dd43b735d533e`。
- `hugo-theme-stack-history.bundle`：完整主题 Git 历史，已通过 `git bundle verify`，SHA-256 `7115e252c2e67bc1a36d2a07311c59861795110b1b637bdff4ea208fff246f84`。
- `manifest.json`：版本、原子模块配置、大小与校验值。

上述本地备份不会被打包到站点，也没有提交进仓库。`.git/modules/themes/hugo-theme-stack` 原始历史仍保留，便于恢复旧分支。备份分支、发布分支、CNAME、旧 Hugo 配置与工作流、文章与素材均未清理。

## 验证边界

移除本身不需要改动应用代码。验证结果：

- `node --experimental-strip-types --test tests/theme.test.ts`：通过，测试只读，不创建或删除夹具目录。
- `node node_modules/typescript/bin/tsc --noEmit`：通过。
- 原先不存在 `site/node_modules`，经审批按锁文件从本机缓存安装，并用 `--ignore-scripts` 禁用安装脚本。
- 正式构建前 `site/dist-release` 不存在；独立审批构建清理机制后，加“目录不存在才执行”保护运行一次构建。41个HTML页面、38篇文章生成成功；保留既有三维chunk体积提示。
- 正式输出校验：25个文章附件、172个代码块、256个旧锚点、1,168个站内引用通过；没有失败项。
- 上游72个导入文件与适配patch校验通过；应用源码、文章、资源、旧Hugo配置/工作流、CNAME及旧历史基线与任务起点无差异。

未运行包含临时目录删除的整套测试，也未重复构建现有产物；未触发远端CI或部署。

旧历史基线中的 `.gitmodules` 不被伪造更新，专项历史审计会报告该已审批移除项。常规构建独立运行。新增 `site/tests/theme.test.ts` 约束现行工作流不初始化旧主题。

## 恢复依据

恢复旧 Hugo 版本时，以原主仓库提交及以上主题提交配对恢复；仅下载最新主题不是等价回退。具体恢复需另行授权，不在本次删除流程里切换分支或重建主题。
