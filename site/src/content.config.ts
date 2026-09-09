import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { legacyPostLoader } from "./lib/post-loader";

export const collections = {
  posts: defineCollection({
    loader: legacyPostLoader(),
    schema: z.object({
      id: z.string(),
      slug: z.string(),
      title: z.string(),
      description: z.string(),
      date: z.string(),
      dateLabel: z.string(),
      lastmod: z.string().optional(),
      categories: z.array(z.string()),
      tags: z.array(z.string()),
      image: z.string().optional(),
      href: z.string(),
      language: z.string(),
      readingMinutes: z.number(),
      source: z.string(),
      format: z.enum(["yaml", "toml"]),
    }),
  }),
};
