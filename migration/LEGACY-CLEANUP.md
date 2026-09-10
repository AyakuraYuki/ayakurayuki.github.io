# 新版博客遗留代码清理

日期：2026-09-10。唯一修改仓库：`ayakurayuki.github.io`。唯一工作分支：`codex/rhine-blog`。

## 分支约束

用户指定 `hugo` 是完整历史备份，只读。本次未切换、合并、提交、重置、推送或修改其指针；清理前后均为 `10a1baf436663ca4915e88da495fbc517cdbc9ed`。`rhine-blog` 备份分支也未同步。清理起点为 `55cfce48be87f7f129e337929dd6c94a07d055a0`。

## 删除范围与依据

以下13个文件逐条通过删除审批，每条命令只包含一个具体文件，没有递归通配清理：

| 文件 | 已停止使用的旧功能 | 新版对应实现 |
| --- | --- | --- |
| `.github/workflows/hugo.yaml` | Hugo安装、构建和Pages发布 | 现行Astro检查／手动发布工作流 |
| `hugo.yaml` | Stack站点、页面、播放器等配置 | `site/astro.config.mjs`、`site/build-settings.mjs` |
| `archetypes/default.md` | Hugo CLI文章骨架 | 保留原Markdown编排，不运行Hugo命令 |
| `layouts/partials/aplayer.html` | Meting网易云播放列表 | 既有Web Audio音效和配乐 |
| `layouts/partials/head/custom.html` | APlayer/Meting的CDN脚本与CSS注入 | Astro页面头部，不依赖这些脚本 |
| `layouts/partials/footer/custom.html` | 旧播放器和Mermaid脚本注入 | Astro正文渲染；现有文章未使用Mermaid围栏 |
| `layouts/_markup/render-codeblock-mermaid.html` | Hugo模板渲染钩子 | Astro不调用Hugo模板 |
| `assets/css/APlayer.min.css` | 旧播放器样式 | 无运行时引用，不在公开目录 |
| `data/external.yaml` | Stack的Vibrant/PhotoSwipe/KaTeX/Cactus CDN配置 | 当前应用不读取该配置 |
| `robots.txt`（根目录） | 旧爬虫规则注释模板 | `site/src/pages/robots.txt.ts` |
| `simple-instruction.txt` | 旧Hugo建站命令说明 | README.md、RELEASE.md |
| `.hugo_build.lock` | 零字节Hugo锁 | Astro不使用 |
| `.github/dependabot.yml` | 指向无package.json的根目录npm更新配置 | 删除无效配置，不新增自动升级策略 |

没有改变当前依赖版本、CSS、JS、三维模型、镜头、声音、阅读器或正式发布工作流。没有增加新的产品功能或替代旧播放器。

## 明确保留

- `content/post/` 文章目录、front matter、附件和原链接。
- `content/page/`、`content/_index*`：属于作者内容，未展示不等于可丢弃代码。
- `static/`、`assets/img/avatar.png`：文章可引用的资源、自有素材和许可。
- `site/vendor/rhine/`、模型源文件和生成脚本：上游复现与升级核对来源，不能按“当前import未使用”任意裁剪。
- 当前实际使用的旧标题锚点映射、上游锁文件与迁移验证记录。
- 根目录本机生成的 `public/`、`resources/`、`assets/jsconfig.json`、IDE配置、Git元数据与已存备份：未获本次删除许可，保持原状。
- `CNAME`、当前构建配置、发布环境和所有远端设置。

历史阶段文档只保留作记录，不应再按其中过期步骤向只读 `hugo` 分支同步代码。README / RELEASE / AGENTS中增加了当前约束。

## 历史审计

保留原 `migration/content-baseline.json` 字节不变；单独新增 `retired-legacy-files.json` 记录原路径、大小、哈希与删除理由。包括本次13项以及此前获批移除的 `.gitmodules`，共14项。

`check:baseline` 继续校验保留内容；对已批准移除项同时要求原始哈希匹配且文件确实不存在，重新出现、越权删除、改写哈希或读取权限错误都会失败。结果为101个原文件未变，9个原基线项已批准移除；其他5个清理项原本不在历史基线中，仍要求它们不存在。

新增 `site/tests/legacy.test.ts` 使用内存夹具，无创建／清理临时目录。

## 验证结果

1. 14项只读逻辑测试通过（循环阵列、发布保护、无主题依赖、遗留移除与基线审计）。没有执行包含临时文件删除的帖子夹具测试。
2. `tsc --noEmit`通过；72个上游导入文件及适配patch校验通过。
3. 单独审批Astro对 `site/dist-release/` 的清理重建后，正式构建通过；保留既有三维chunk体积提示。
4. 全部38篇文章、25个文章附件、172个代码块、256个旧锚点、1,168个站内引用验证通过。
5. 清理前后201个受保护输入文件的SHA-256相同。
6. 清理前后135个公开文件的路径、字节数和SHA-256全部相同；无新增或减少公开文件。仅 `release-info.json` 作为提交状态/构建审计元数据不参与字节等价比较。
7. 所有记录的分支指针未变。未推送、未部署、未触发会自动清理产物的远端CI。

此次没有产品代码改动且公开产物逐字节等价，因此没有额外运行会清理测试目录的浏览器回归。它不是新一轮实机视觉验收。

## 本地备份

`site/.cache/legacy-cleanup-2026-09-10/` 包含：

- `legacy-files.tar.gz`：本次13项原文件快照；同时已只读确认它们均存在于历史 `hugo` 分支。
- `before.json`：删除目标、分支指针、201个受保护输入和135个输出文件的校验值。
- `after.json`：比较结果，无意外差异。

备份未提交或公开。不得在后续构建/整理时顺手删除，任何删除仍须逐条审批。
