import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { parse as parseToml } from "smol-toml";

// npm scripts always run from site/. This also works after Astro bundles server modules.
export const repositoryRoot = path.resolve(process.cwd(), "..");
export const postsRoot = path.join(repositoryRoot, "content/post");
export const timeZone = "Asia/Shanghai";
export const lanes = [
  { id: "guide", label: "技术笔记", en: "FIELD NOTES" },
  { id: "project", label: "项目档案", en: "PROJECT FILES" },
  { id: "infrastructure", label: "基础设施", en: "INFRASTRUCTURE" },
  { id: "life", label: "生活记录", en: "LIFE JOURNAL" },
  { id: "notification", label: "公告通知", en: "NOTICES" },
] as const;
export const categoryLabel = (category: string) =>
  lanes.find((l) => l.id === category)?.label ?? category;

export interface Post {
  id: string;
  slug: string;
  title: string;
  description: string;
  date: string;
  dateLabel: string;
  lastmod?: string;
  categories: string[];
  tags: string[];
  image?: string;
  href: string;
  language: string;
  readingMinutes: number;
  source: string;
  body: string;
  directory: string;
  format: "yaml" | "toml";
  draft: boolean;
  publishDate: string;
}
export interface BundleAsset {
  source: string;
  route: string;
}

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim())
    throw new Error(`${field}: expected non-empty text`);
  return value.trim();
}
function textArray(value: unknown, field: string, required = false): string[] {
  if (value === undefined && !required) return [];
  if (!Array.isArray(value) || (required && value.length === 0))
    throw new Error(`${field}: expected a non-empty string array`);
  return [...new Set(value.map((v) => text(v, field)))];
}

/** Explicit Shanghai default: never let a CI runner's local timezone interpret a post. */
export function normalizeDate(value: unknown, field = "date"): string {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime()))
      throw new Error(`${field}: invalid date`);
    return value.toISOString();
  }
  if (typeof value !== "string")
    throw new Error(`${field}: expected date string`);
  const match =
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2})(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})?)?$/.exec(
      value.trim(),
    );
  if (!match) throw new Error(`${field}: unsupported date ${value}`);
  const [
    ,
    y,
    m,
    d,
    hour = "00",
    min = "00",
    sec = "00",
    fraction = "",
    zone = "+08:00",
  ] = match;
  const probe = new Date(Date.UTC(+y, +m - 1, +d));
  if (
    probe.getUTCFullYear() !== +y ||
    probe.getUTCMonth() !== +m - 1 ||
    probe.getUTCDate() !== +d ||
    +hour > 23 ||
    +min > 59 ||
    +sec > 59
  )
    throw new Error(`${field}: invalid calendar date ${value}`);
  const result = new Date(
    `${y}-${m}-${d}T${hour}:${min}:${sec}${fraction}${zone}`,
  );
  if (!Number.isFinite(result.getTime()))
    throw new Error(`${field}: invalid date ${value}`);
  return result.toISOString();
}
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}
export function plainSummary(body: string): string {
  return body
    .replace(/```[^]*?```/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^[#>\s*-]+/gm, "")
    .replace(/[`*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

export function parsePost(
  input: string,
  source: string,
  directory: string,
): Post {
  const normalized = input.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const delimiter = normalized.split("\n", 1)[0];
  if (!["---", "+++"].includes(delimiter))
    throw new Error(`${source}: missing YAML/TOML front matter`);
  const boundary = normalized.indexOf(`\n${delimiter}\n`, delimiter.length);
  if (boundary < 0) throw new Error(`${source}: unclosed front matter`);
  const raw = normalized.slice(delimiter.length + 1, boundary);
  const body = normalized.slice(boundary + delimiter.length + 2);
  const data = (
    delimiter === "---"
      ? parseYaml(raw, { schema: "core", uniqueKeys: true })
      : parseToml(raw)
  ) as Record<string, unknown>;
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new Error(`${source}: invalid front matter`);
  // Retain date spelling for TOML local date-times too; smol-toml otherwise gives Date objects.
  const rawDate = (field: string) => {
    if (delimiter === "+++") {
      const line = raw
        .match(new RegExp(`^${field}\\s*=\\s*([^\\n#]+)`, "m"))?.[1]
        .trim();
      if (line) return line.replace(/^['"]|['"]$/g, "");
    }
    return data[field];
  };
  const title = text(data.title, `${source}.title`);
  const slug = text(data.slug, `${source}.slug`);
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(slug))
    throw new Error(`${source}.slug: expected a safe, lowercase URL segment`);
  if (data.draft !== undefined && typeof data.draft !== "boolean")
    throw new Error(`${source}.draft: expected boolean`);
  const date = normalizeDate(rawDate("date"), `${source}.date`);
  const image =
    data.image === undefined || data.image === ""
      ? undefined
      : text(data.image, `${source}.image`);
  if (
    image &&
    /^[a-z][a-z0-9+.-]*:/i.test(image) &&
    !/^https?:\/\//i.test(image)
  )
    throw new Error(`${source}.image: unsupported URL protocol`);
  if (/\{\{[<%]/.test(body))
    throw new Error(
      `${source}: Hugo shortcodes require an explicit compatibility adapter`,
    );
  return {
    id:
      data.id === undefined
        ? `post:${path.basename(directory)}`
        : text(data.id, `${source}.id`),
    slug,
    title,
    date,
    dateLabel: formatDate(date),
    description:
      data.description === undefined || data.description === ""
        ? plainSummary(body)
        : text(data.description, `${source}.description`),
    lastmod:
      data.lastmod === undefined
        ? undefined
        : normalizeDate(rawDate("lastmod"), `${source}.lastmod`),
    categories: textArray(data.categories, `${source}.categories`, true),
    tags: textArray(data.tags, `${source}.tags`),
    image: image
      ? /^(?:https?:)?\/\//i.test(image)
        ? image
        : new URL(image, `https://blog.invalid/p/${slug}/`).pathname
      : undefined,
    href: `/p/${slug}/`,
    language: "zh-CN",
    readingMinutes: Math.max(
      1,
      Math.ceil(body.replace(/```[^]*?```/g, "").length / 550),
    ),
    source,
    body,
    directory,
    format: delimiter === "---" ? "yaml" : "toml",
    draft: data.draft === true,
    publishDate:
      data.publishDate === undefined
        ? date
        : normalizeDate(rawDate("publishDate"), `${source}.publishDate`),
  };
}

/** No symlink traversal: only authored files inside the selected content tree are inputs. */
export async function walkFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const target = path.join(root, entry.name);
    if (entry.isSymbolicLink())
      throw new Error(`Symlinks are not supported in content: ${target}`);
    if (entry.isDirectory()) files.push(...(await walkFiles(target)));
    else if (entry.isFile()) files.push(target);
  }
  return files.sort();
}
export async function readPosts(
  root = postsRoot,
  now = new Date(),
  includeUnpublished = false,
): Promise<Post[]> {
  const files = await walkFiles(root);
  const posts = await Promise.all(
    files
      .filter((file) => path.basename(file) === "index.zh-cn.md")
      .map(async (file) =>
        parsePost(
          await readFile(file, "utf8"),
          path.relative(repositoryRoot, file).split(path.sep).join("/"),
          path.dirname(file),
        ),
      ),
  );
  for (const key of ["slug", "id"] as const) {
    const seen = new Set<string>();
    for (const post of posts) {
      if (seen.has(post[key]))
        throw new Error(`Duplicate ${key}: ${post[key]}`);
      seen.add(post[key]);
    }
  }
  return posts
    .filter(
      (p) =>
        includeUnpublished ||
        (!p.draft && Date.parse(p.publishDate) <= now.getTime()),
    )
    .sort(
      (a, b) =>
        Date.parse(b.date) - Date.parse(a.date) ||
        a.slug.localeCompare(b.slug, "en"),
    );
}
export async function bundleAssets(posts: Post[]): Promise<BundleAsset[]> {
  const assets: BundleAsset[] = [];
  for (const post of posts) {
    for (const source of await walkFiles(post.directory)) {
      if (/\.(md|mdx)$/i.test(source)) continue;
      const relative = path
        .relative(post.directory, source)
        .split(path.sep)
        .map(encodeURIComponent)
        .join("/");
      if (relative === "index.html")
        throw new Error(`Attachment collides with article: ${source}`);
      assets.push({ source, route: `${post.href}${relative}` });
    }
  }
  return assets;
}
export function publicPost(post: Post) {
  const {
    body: _body,
    directory: _directory,
    draft: _draft,
    publishDate: _publish,
    ...metadata
  } = post;
  return metadata;
}
