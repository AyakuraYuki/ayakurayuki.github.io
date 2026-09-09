# 发布与回退

本文件是维护说明，不会打包进公开站点。当前工作只完成发布准备，不代表已经替换线上博客。

## 1. 构建模式

| 命令 | 产物 | 收录策略 | 是否部署 |
| --- | --- | --- | --- |
| `npm run verify` / `npm run build` | `site/dist/` | `noindex, nofollow`；robots 禁止抓取 | 否 |
| `npm run verify:release` / `npm run build:release` | `site/dist-release/` | 普通页 `index, follow`；robots 允许抓取并列出 sitemap | 否 |

只有显式设置 `SITE_BUILD=production` 的包装命令才生成正式包。`NODE_ENV=production`、Vite build 或推送代码都不会自动打开收录或部署。

- 404 页始终 `noindex, follow`，不输出错误 canonical。
- `/migration/` 页面已移除；它不是内容链接，不做首页软404重定向。
- 根目录 CNAME 不改写，正式构建只验证它与 canonical 主机一致，再复制到产物。
- `release-info.json` 记录 Git 提交、是否有已跟踪改动、上游提交及文件大小/SHA-256。CI 正式包拒绝修改中的 checkout。
- RSS 从实际生成的正文 HTML 提取，保留全文、代码与图片，并转换为绝对 URL；订阅地址继续为 `/index.xml`。
- sitemap 包含首页、普通索引及当前已发布文章，不列调试页、404、附件或构建记录。
- 不打包文档、脚本、Blender 工程、上游源码和音效试听文件。必要运行资源及许可继续保留。

## 2. 发布前本地检查

在 `site/` 执行：

```sh
npm ci
npm run verify
npm run verify:release
# 当前首次切换还须核对原内容没有意外改写：
npm run check:baseline
# 完整默认画质，本机独立 Chrome：
SITE_BUILD=production PLAYWRIGHT_CHANNEL=chrome npm run test:browser
npm run preview:release
```

正式包本地查看地址为 `http://127.0.0.1:4331/`。浏览器回归自行占用4328，运行前先停止手工的4328预览。

两种模式都执行文章、附件、代码、旧锚点、站内资源和产物清单检查。发布检查另验证 canonical、robots、RSS、sitemap、CNAME，以及没有迁移说明或开发文件泄漏到站点。

`migration/content-baseline.json` 保留首次迁移的内容与旧配置快照，用于首次切换/内容同步审计。普通 verify 与正式构建不再把这份历史哈希当作日常写作锁；新增/修订文章会做语义、资源和输出验证，而无需改基线。需要完整历史审计时运行 `npm run verify:baseline`；不要自动刷新旧基线掩盖差异。算法测试使用固定不等长分类夹具，不再把当前文章数量硬编码成发布要求。

## 3. GitHub 工作流

### 普通检查

`.github/workflows/rhine-preview.yml` 的界面名称为 **Blog checks (no deployment)**。仅构建、校验并保存测试/正式两种产物，没有 Pages 写权限和部署步骤。

托管机器没有本机GPU的能力：CI显式设置 `ARCHIVE_TEST_RENDERING=software`，运行独立的真实WebGL冒烟用例，并完整运行静态阅读/发布检查。冒烟用例在测试会话中显式选择减少动画、低分辨率、无阴影/AO/景深，核对模型确实渲染、真实数据切列和静态正文可达。只影响自动化浏览器；生产默认画质与手机默认值不变。

完整三维运动/触摸/查看器回归继续由不设置该变量的本机GPU配置执行。曾将完整运动回归强制放在纯软件渲染下，出现物理帧进度不足导致的超时；不能把这类超时包装成画面正确，因此将两种验证职责明确分开，不删除完整回归。CI冒烟通过不等于实机光影/性能通过。

### 手动发布

`.github/workflows/blog-release.yml` 只接受 `workflow_dispatch`，没有 push 自动发布。

输入：

1. `expected_commit`：当前选中分支/标签的完整40位提交SHA，必须与实际checkout一致。
2. `publish`：默认 **false**。此模式仅生成通过检查的正式artifact，不部署。
3. `confirmation`：只有确实发布时，填入 `blog.ayakurayuki.cc`，并勾选 `publish`。

构建任务只有读权限，正式包构建后执行浏览器回归。通过后保存 `blog-release-<SHA>` artifact，并仅在显式发布时上传 Pages artifact。部署任务才获得 `pages: write` 与 `id-token: write`，使用 `github-pages` environment 和现有 `pages` 并发锁。

部署前只读检查 Pages 已设置为 Actions 来源、现有域名确实是 `blog.ayakurayuki.cc`；不符则停止，不自动开启 Pages、修改域名或变更环境保护规则。

**首次切换前仍需单独确认：**

- 此工作流须先存在于默认分支，GitHub 才能正常显示手动触发入口；因此需明确批准代码合并/发布分支选择，不能把推送迁移分支等同于上线。
- 通过登录态核实 Pages 来源、域名/HTTPS、`github-pages` 环境的允许分支及审批规则。公开 API 未能获取这些配置，本次没有替用户设置。
- 保存旧线上可部署产物，并记录其 Git SHA、构建环境、域名和原发布入口。本地旧 Hugo `public/` 可能带 localhost 链接，不能直接视为生产回退包。
- 旧 Hugo 工作流仍原样保留。正式切换后应另行确认禁用旧自动入口，避免两套工作流互相覆盖；本次不擅自删除它。
- 当前迁入的是38篇文章及其资源。旧 `/about/`、`/links/`、分类/标签/年份归档等辅助页面还未迁入；是否需要恢复这些旧站入口，应在首次切换前确认。它们不在 sitemap 中，当前返回404，不伪装为已完成全站迁移。

## 4. 回退

- 首次切换前：线上没有变化，只需继续使用旧博客。
- 后续版本：保留上一个已验证的正式artifact与SHA。可以从对应提交重新运行手动流程，先 `publish=false` 验证，再明确确认发布；或者走已验证的原产物重部署流程。
- 不使用 `reset --hard`、强推或删除文章回退。
- 不清空读者收藏/偏好；三维状态存储命名空间保持不变。
- Actions artifact有保留期限。长期回退请另行备份上一版正式包；保留90天不等于永久存档。

## 5. 本次清理边界

移除的是面向读者的迁移说明、进度页面和非正式标记；不是删除文章“预览”功能，也不是删除技术来源记录。三维效果、镜头、模型、声音默认值和文章源文件不改动。内部 `migration/` / 上游锁定记录继续服务版本审查，不作为访客导航。
