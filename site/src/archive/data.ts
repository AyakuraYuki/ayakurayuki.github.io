import { archiveLanes, makeCatalog, type ArchivePost } from "./catalog";
const payload = document.getElementById("blog-archive-data");
if (!payload) throw new Error("Missing static article catalog");
const posts = JSON.parse(payload.textContent ?? "[]") as ArchivePost[];
export const { records, columnFiles, fileLocation } = makeCatalog(posts);
export const archiveColumns = archiveLanes.map((l) => l.title);
export const categories = ["全部档案", ...archiveColumns];
