import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

const products = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/products" }),
  schema: z.object({
    title: z.string(),
    category: z.string(),
    slug: z.string(),
    uwert: z.string().optional(),
    description: z.string(),
    highlights: z.array(z.string()),
    image: z.string(),
    features: z.array(z.string()).optional(),
  }),
});

const legal = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/legal" }),
  schema: z.object({
    page: z.string(),
    pubDate: z.date(),
  }),
});

export const collections = {
  products,
  legal,
};