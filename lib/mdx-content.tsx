import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { mdxComponents } from "@/components/content/mdx-components";
import type { FaqItem } from "@/lib/structured-data";

export type ContentCollection = "blog" | "resources";

interface ContentFrontmatter {
  title: string;
  description: string;
  excerpt: string;
  publishedAt: string;
  updatedAt?: string;
  readingTime: string;
  author?: string;
  tags: string[];
  faqs: FaqItem[];
}

export interface ContentEntryMeta extends ContentFrontmatter {
  slug: string;
  collection: ContentCollection;
  path: string;
}

export interface ContentEntry extends ContentEntryMeta {
  content: string;
}

const CONTENT_ROOT = path.join(process.cwd(), "content");

function getCollectionDirectory(collection: ContentCollection) {
  return path.join(CONTENT_ROOT, collection);
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item).trim()).filter(Boolean);
}

function normalizeFaqs(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const question = "question" in item ? String(item.question ?? "").trim() : "";
      const answer = "answer" in item ? String(item.answer ?? "").trim() : "";
      if (!question || !answer) {
        return null;
      }

      return {
        question,
        answer
      };
    })
    .filter((item): item is FaqItem => Boolean(item));
}

function normalizeFrontmatter(collection: ContentCollection, slug: string, data: Record<string, unknown>): ContentEntryMeta {
  const title = String(data.title ?? slug).trim();
  const description = String(data.description ?? "").trim();
  const excerpt = String(data.excerpt ?? description).trim();
  const publishedAt = String(data.publishedAt ?? new Date().toISOString()).trim();
  const updatedAt = data.updatedAt ? String(data.updatedAt).trim() : undefined;
  const readingTime = String(data.readingTime ?? "5 min read").trim();
  const author = data.author ? String(data.author).trim() : undefined;

  return {
    slug,
    collection,
    path: `/${collection}/${slug}`,
    title,
    description,
    excerpt,
    publishedAt,
    updatedAt,
    readingTime,
    author,
    tags: normalizeStringArray(data.tags),
    faqs: normalizeFaqs(data.faqs)
  };
}

async function readCollectionFile(collection: ContentCollection, slug: string) {
  const filePath = path.join(getCollectionDirectory(collection), `${slug}.mdx`);
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = matter(raw);

  return {
    frontmatter: normalizeFrontmatter(collection, slug, parsed.data),
    content: parsed.content
  };
}

export async function getContentEntries(collection: ContentCollection) {
  const directory = getCollectionDirectory(collection);
  const files = (await fs.readdir(directory)).filter((file) => file.endsWith(".mdx"));
  const entries = await Promise.all(
    files.map(async (file) => {
      const slug = file.replace(/\.mdx$/, "");
      const { frontmatter } = await readCollectionFile(collection, slug);
      return frontmatter;
    })
  );

  return entries.sort((left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime());
}

export async function getContentEntry(collection: ContentCollection, slug: string) {
  try {
    const { frontmatter, content } = await readCollectionFile(collection, slug);
    return {
      ...frontmatter,
      content
    } satisfies ContentEntry;
  } catch {
    return null;
  }
}

export function renderMdxContent(content: string) {
  return <MDXRemote source={content} options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }} components={mdxComponents} />;
}
