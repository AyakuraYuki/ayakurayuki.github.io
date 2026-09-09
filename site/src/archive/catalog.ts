/** Pure blog ↔ scene contract. Never use display numbers as article identity. */
export interface ArchivePost {
  id: string;
  slug: string;
  title: string;
  description: string;
  dateLabel: string;
  categories: string[];
  tags: string[];
  href: string;
  readingMinutes: number;
  headings: { depth: number; slug: string; text: string }[];
}
export const archiveLanes = [
  { id: "guide", title: "技术笔记", en: "FIELD NOTES" },
  { id: "project", title: "项目档案", en: "PROJECT FILES" },
  { id: "infrastructure", title: "基础设施", en: "INFRASTRUCTURE" },
  { id: "life", title: "生活记录", en: "LIFE JOURNAL" },
  { id: "notification", title: "公告通知", en: "NOTICES" },
];
export type ArchiveRecord = ArchivePost & {
  code: string;
  en: string;
  department: string;
  category: string;
  date: string;
  lead: string;
  clearance: string;
  abstract: string;
  findings: string[];
  source: string;
  lane: number;
  empty: boolean;
};
export function makeCatalog(posts: ArchivePost[]) {
  const records: ArchiveRecord[] = posts.map((p, i) => {
    // Additional taxonomy categories remain in article metadata; unknown groups
    // fall back to Field Notes rather than growing the physical five-column scene.
    const lane = Math.max(
      0,
      archiveLanes.findIndex((l) => p.categories.includes(l.id)),
    );
    return {
      ...p,
      code: `X-${String(i + 1).padStart(3, "0")}`,
      en: archiveLanes[lane].en,
      department: archiveLanes[lane].title,
      category: archiveLanes[lane].title,
      date: p.dateLabel,
      lead: p.tags.join(" / ") || "—",
      clearance: "PUBLIC ARCHIVE",
      abstract: p.description,
      findings: p.headings.map((h) => h.text),
      source: p.href,
      lane,
      empty: false,
    };
  });
  // Empty lanes have one non-readable physical placeholder; never invent posts.
  archiveLanes.forEach((lane, index) => {
    if (!records.some((r) => r.lane === index))
      records.push({
        id: `empty:${lane.id}`,
        slug: "",
        title: "此分类尚无文章",
        description: "",
        dateLabel: "",
        categories: [lane.id],
        tags: [],
        href: "/posts/",
        readingMinutes: 0,
        headings: [],
        code: "X-000",
        en: lane.en,
        department: lane.title,
        category: lane.title,
        date: "—",
        lead: "—",
        clearance: "EMPTY COLLECTION",
        abstract: "此分类尚无已发布文章，可左右切换到其他分类。",
        findings: [],
        source: "/posts/",
        lane: index,
        empty: true,
      });
  });
  const columnFiles = (lane: number) =>
    records.flatMap((r, i) => (r.lane === lane ? [i] : []));
  const fileLocation = (index: number) => {
    const lane = records[index].lane;
    const row = 12 + columnFiles(lane).indexOf(index);
    // A legacy slot is only a cinematic-compatible anchor, not the content ID.
    return { lane, row, slot: lane * 32 + 12 };
  };
  return { records, columnFiles, fileLocation };
}
export function tickWindow(files: number[], selected: number) {
  const count = Math.min(8, files.length);
  const start =
    files.length <= count
      ? 0
      : Math.min(
          Math.max(0, files.indexOf(selected) - 3),
          files.length - count,
        );
  return files.slice(start, start + count);
}
