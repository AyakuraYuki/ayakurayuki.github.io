import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { addLegacyAnchors } from "../src/lib/post-loader.ts";
import {
  parsePost,
  normalizeDate,
  readPosts,
  bundleAssets,
} from "../src/lib/posts.ts";
const yaml = (extra = "", slug = "test-post") =>
  `---\ntitle: 测试文章\ndate: 2024-01-17 10:44:50\nslug: ${slug}\ncategories:\n  - guide\n${extra}---\n\n## 正文\n\n内容与 ![图片](cover.png)\n`;

test("YAML and TOML preserve the same timestamp and metadata", () => {
  const a = parsePost(yaml(), "fixture", "/tmp/test-post");
  const b = parsePost(
    `+++\ntitle = '测试文章'\ndate = 2024-01-17T10:44:50+08:00\nslug = 'test-post'\ncategories = ['guide']\n+++\n\n## 正文\n`,
    "fixture",
    "/tmp/test-post",
  );
  assert.equal(a.date, b.date);
  assert.equal(a.date, "2024-01-17T02:44:50.000Z");
  assert.equal(a.href, "/p/test-post/");
  assert.equal(a.id, "post:test-post");
  assert.equal(a.dateLabel, "2024-01-17");
  assert.equal(a.format, "yaml");
  assert.equal(b.format, "toml");
  assert.deepEqual(a.tags, []);
});
test("TOML local dates explicitly use Shanghai, not the runner timezone", () => {
  for (const tz of ["UTC", "America/Los_Angeles", "Asia/Shanghai"]) {
    const output = execFileSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "--input-type=module",
        "-e",
        `import {parsePost} from './src/lib/posts.ts';console.log(parsePost("+++\\ntitle='x'\\ndate=2024-01-17T10:44:50\\nslug='x'\\ncategories=['guide']\\n+++\\ntext",'x','/tmp/x').date)`,
      ],
      { env: { ...process.env, TZ: tz }, encoding: "utf8" },
    ).trim();
    assert.equal(output, "2024-01-17T02:44:50.000Z");
  }
});
test("bad metadata fails explicitly rather than corrupting routes", () => {
  assert.throws(() => normalizeDate("2024-02-30"), /invalid/);
  assert.throws(() => normalizeDate("2024-01-17 25:00:00"), /invalid/);
  assert.throws(
    () => parsePost(yaml("", "../escape"), "fixture", "/tmp/x"),
    /slug/,
  );
  assert.throws(
    () => parsePost(yaml("draft: yes\n"), "fixture", "/tmp/x"),
    /boolean/,
  );
  assert.throws(
    () => parsePost(yaml("image: javascript:alert(1)\n"), "fixture", "/tmp/x"),
    /protocol/,
  );
  assert.throws(
    () => parsePost(yaml() + "{{< video >}}", "fixture", "/tmp/x"),
    /shortcodes/,
  );
});
test("existing corpus: all formats, stable routes and every bundled attachment", async () => {
  const baseline = JSON.parse(
    await readFile("../migration/content-baseline.json", "utf8"),
  );
  const originalSources = new Set(
    baseline.files.map((f: { path: string }) => f.path),
  );
  const posts = (
    await readPosts(undefined, new Date("2026-09-09T00:00:00Z"))
  ).filter((p) => originalSources.has(p.source));
  assert.equal(posts.length, 38);
  assert.equal(posts.filter((p) => p.format === "yaml").length, 31);
  assert.equal(posts.filter((p) => p.format === "toml").length, 7);
  assert.equal(posts.filter((p) => p.categories.includes("guide")).length, 29);
  assert.equal((await bundleAssets(posts)).length, 25);
  assert.equal(posts[0].slug, "2025-12-01-high-concurrency-overselling-issue");
  assert.ok(
    posts.every(
      (p) => !p.body.startsWith("+++") && !p.body.startsWith("---\ntitle:"),
    ),
  );
});
test("new posts need no code edits; unpublished posts and their attachments stay out", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "rhine-posts-"));
  try {
    for (const [slug, extra] of [
      ["new-post", ""],
      ["draft-post", "draft: true\n"],
      ["future-post", "publishDate: 2099-01-01\n"],
    ]) {
      await mkdir(path.join(root, slug));
      await writeFile(
        path.join(root, slug, "index.zh-cn.md"),
        yaml(extra, slug),
      );
      await writeFile(path.join(root, slug, "cover.png"), "fixture");
    }
    const posts = await readPosts(root, new Date("2026-09-09T00:00:00Z"));
    assert.deepEqual(
      posts.map((p) => p.slug),
      ["new-post"],
    );
    assert.deepEqual(
      (await bundleAssets(posts)).map((a) => a.route),
      ["/p/new-post/cover.png"],
    );
    await mkdir(path.join(root, "duplicate"));
    await writeFile(
      path.join(root, "duplicate/index.zh-cn.md"),
      yaml("", "new-post"),
    );
    await assert.rejects(readPosts(root), /Duplicate slug/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("legacy anchor aliases are escaped, deterministic and do not duplicate current headings", () => {
  const heading = { depth: 2, slug: "current", text: "中文标题" };
  const html = '<h2 id="current">中文标题</h2>';
  assert.match(
    addLegacyAnchors(html, [heading], [{ id: "old-id", text: "中文标题" }]),
    /id="old-id"/,
  );
  assert.equal(
    addLegacyAnchors(html, [heading], [{ id: "current", text: "中文标题" }]),
    html,
  );
  assert.ok(
    addLegacyAnchors(
      html,
      [heading],
      [{ id: 'x" onload="x', text: "中文标题" }],
    ).includes("&quot;"),
  );
});
