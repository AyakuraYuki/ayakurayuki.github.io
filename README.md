# Ayakura Yuki 的小窝

个人文章档案。首页使用 RhineLabUI 的五列三维阵列浏览文章，抽取档案可查看摘要、目录和相关内容；完整正文使用独立静态阅读页。

- 首页：`/`
- 普通文章索引：`/posts/`
- 文章：`/p/<slug>/`
- 全文 RSS：`/index.xml`
- 站点地图：`/sitemap.xml`

## 写作

文章继续放在 `content/post/<目录>/index.zh-cn.md`，支持 YAML 和 TOML front matter。图片与正文放在一起，原文章地址由 `slug` 决定。新程序在 `site/`，无需 Hugo 或主题子模块即可构建。

三维展示编号不作为文章身份；收藏与分类选择记忆使用稳定文章 ID。原内容和上游素材的技术记录保留在 `migration/`，不进入公开站点。

## 本地运行

使用 `site/.node-version` 指定的 Node.js 以及 `site/package.json` 指定的 npm 版本。

```sh
cd site
npm ci
npm run verify
npm run preview
```

浏览器访问 `http://127.0.0.1:4328/`。开发模式使用 `npm run dev`。

## 发布构建

```sh
cd site
npm run verify:release
npm run preview:release
```

正式产物为 `site/dist-release/`，不会覆盖普通测试产物 `site/dist/`。这两个命令都不部署。

发布步骤、手动确认与回退说明见 [RELEASE.md](RELEASE.md)。GitHub 普通 CI 没有部署权限，只有明确触发并确认的手动发布工作流才能部署。

## 实现与来源

- Astro、TypeScript、Three.js，依赖固定版本。
- 三维运行时固定为 RhineLabUI 的已验证提交，源快照与博客适配分开维护。
- 原片与素材权利不因代码公开而改变；保留原作者代码许可、字体说明、模型源文件与生成脚本。
- 不加载背景视频替代交互场景，未启用博客 PWA。
- 可直接访问文章，正文不依赖 WebGL。三维加载失败时可转入普通索引。

## 分支与目录边界

- `codex/rhine-blog`：新版博客的日常开发分支。
- `rhine-blog`：用户建立的备份／主线变更保存分支；不自动覆盖或同步。
- `hugo`：完整旧版历史备份，只读，不向它合并或推送新版改动。

当前只使用 `site/` 中的构建与发布流程，工作分支已移除旧 Hugo 的配置、模板、播放器和外部 CDN 接入代码。`content/`、`static/`、头像等自有素材及固定 RhineLabUI 源码保留；未展示的历史页面内容不因代码整理而删除。

清理清单及验证见 `migration/LEGACY-CLEANUP.md`。旧目录中本机生成的缓存、IDE 文件和备份不属于本次代码清理范围。所有删除继续逐条审批。
