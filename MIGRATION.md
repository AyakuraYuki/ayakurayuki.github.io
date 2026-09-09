> 历史实施记录，不作为当前访客说明。当前运行方式见 README.md，正式构建与发布操作见 RELEASE.md。一、二阶段已获用户验收。

# Rhine 博客迁移 · 第二阶段

本分支将旧博客的文章组织方式与 Hugo 分开：继续使用原 Markdown 目录，新增一个不依赖 Hugo 或 Stack 的 Astro 静态阅读入口。**这是迁移预览，不是正式博客切换。第一阶段已验收，第二阶段接入三维浏览与文章预览。**

## 本地运行

使用 `site/.node-version` 指定的 Node.js 24.20.0 和 npm 11.19.0。

```sh
cd site
npm ci
npm run verify
npm run preview
```

预览仅监听 `http://127.0.0.1:4328/`，关闭终端进程即可停止。浏览器直接访问文章的 `/p/<slug>/`，不需要 WebGL 或 JavaScript 才能读正文。

开发模式：`npm run dev`。它直接读取上层 `content/post/` 并监听变更；预览模式读取静态构建结果，文章修改后须重新构建。Astro CLI 在代理环境可能后台运行开发服务，可用 `npx --no-install astro dev status` / `stop` 管理本项目服务。`preview` 使用独立本地静态服务，不依赖 CLI 的后台进程检测。

浏览器回归：

```sh
# 安装专用 Chromium（CI 使用此方式）
npx --no-install playwright install chromium
npm run test:browser

# 或使用本机已安装的 Google Chrome，独立无头实例
PLAYWRIGHT_CHANNEL=chrome npm run test:browser
```

测试自行管理 4328 端口上的静态服务；运行浏览器测试前先停止手工预览。

## 已提供

- 五列三维首页、抽取后的文章预览、独立模型查看器、收藏与按文章 ID 的往返恢复。
- `/posts/` 为普通索引，`/` 为三维入口；第一次可看开场，减少动态效果或返回时直接恢复。
- 38 篇旧文章的静态阅读页；31 篇 YAML、7 篇 TOML front matter。
- 保留 `content/post/<bundle>/index.zh-cn.md` 与 `/p/:slug/`。
- 日期无时区时明确解释为 Asia/Shanghai，不依赖 CI 时区。
- 基础同风格阅读排版、分类筛选、标题/摘要/标签搜索、目录、代码复制和相邻文章。
- 原目录内 25 个附件以及根 `static/` 的旧资源继续可以通过原路径访问。
- 正文图片暂采用无损透传，不转换 GIF，也不重写原图；体积优化留待阅读体验阶段。
- 旧输出观察到的章节锚点兼容；明确记录六个已删除小节到原父章节的映射。
- 禁用 JS 后仍有文章与导航；没有 React、Vue、Hugo、第三方博客主题或 Service Worker 运行依赖。
- 固定依赖版本、只检查不部署的 CI、旧源文件保护和 RhineLabUI 上游基线记录。

## 还没有做

- 完整阅读进出过渡、精确滚动/摄像机往返恢复及实机性能校准。
- 全文检索、分类/标签独立页面、年份归档、RSS、sitemap、关于/链接页面迁移。
- 新站 PWA、缓存升级策略、手机实机性能校准。
- 生产切换与真正的上游升级演练。

首页是实时 Three.js 场景，不使用视频代替三维；普通索引仍可随时进入。第二阶段的边界、实现与限制见 `migration/STAGE-2.md`。

## 文件职责

| 位置 | 职责 |
| --- | --- |
| `content/`、`static/` | 旧文章、页面和素材，迁移阶段原样保留 |
| `site/` | 新应用、构建与测试；不影响旧 Hugo 的根目录工作流 |
| `migration/content-baseline.json` | 旧文章、素材、配置等 110 个文件的不可变起点 |
| `migration/rhine-upstream.lock.json` | 上游提交和源码/模型/脚本/资源哈希；不自动取最新 |
| `migration/legacy-headings.json` | 从现有本地旧输出观察到的锚点，不宣称是线上快照 |
| `migration/legacy-anchor-redirects.json` | 已删小节的显式兼容决策 |
| `migration/INTEGRATION.md` | 上游接入边界和升级规则 |
| `migration/VERIFICATION.md` | 第一阶段验收及限制 |
| `migration/STAGE-2.md` | 三维接入边界与第二阶段验证 |

## 继续写作

迁移期间旧 `hugo` 写作分支仍是权威源，不在两个分支维护两份文章。新增/修改文章先在原分支完成，再审查内容差异并同步到迁移分支；涉及旧源文件修改时需明确更新基线。新增文章不要求改代码、凑满八篇、填写三维编号或人工维护 JSON。

当前语言契约是 `index.zh-cn.md`。现有分类可以直接使用；新增分类会在普通索引中自动出现；三维分区按配置顺序匹配，未匹配分类暂归入技术笔记，后续可调整映射配置。`description`、封面、标签可缺省；`title`、`date`、`slug`、非空 `categories` 必填。`draft: true` 或未来 `publishDate` 会同时排除文章页面和文章附件。

文章路径和收藏身份不共用排序序号：初始 ID 为 `post:<bundle-folder>`，可显式填写 `id`；正文地址由 `slug` 决定。改变目录或 slug 应作为有链接迁移影响的变更处理。

Markdown 来自受信任的仓库作者，保留旧文章内联 HTML；这不是允许匿名用户提交 HTML 的 CMS。Hugo shortcode 遇到时明确报错，不能悄悄显示错误语法。现有 38 篇未使用 shortcode。

## 发布边界

`rhine-preview.yml` 只有 `contents: read`，没有 Pages 写权限、OIDC 权限、部署步骤或生产 environment；推送迁移分支只构建并上传预览 artifact。站点还包含 `noindex, nofollow` 与禁止抓取的 `robots.txt`。这些仅防误收录，不是访问控制。

不删除/改写旧工作流，不自动合并到 `hugo` 或 `master`，不动 CNAME。正式切换前必须单独完成发布来源审计、域名与回退演练，并主动解除预览的 noindex 配置。
