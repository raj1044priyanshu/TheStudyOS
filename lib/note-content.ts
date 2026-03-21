export type NoteBlockTag =
  | "TITLE"
  | "SUBJECT_TAG"
  | "DATE_TAG"
  | "HEADING1"
  | "HEADING2"
  | "HEADING3"
  | "STICKY_YELLOW"
  | "STICKY_PINK"
  | "STICKY_BLUE"
  | "STAR_POINT"
  | "ARROW_POINT"
  | "CHECK_POINT"
  | "BULLET_POINT"
  | "FORMULA_BOX"
  | "DEFINITION_BOX"
  | "EXAMPLE_BOX"
  | "MEMORY_BOX"
  | "DIAGRAM_PLACEHOLDER"
  | "MARGIN_NOTE"
  | "DIVIDER";

export type ParsedNoteBlockTag = NoteBlockTag | "PARAGRAPH";

export interface NoteBlock {
  tag: ParsedNoteBlockTag;
  value?: string;
}

export interface NoteDiagramPlaceholder {
  key: string;
  description: string;
  index: number;
}

type AnalysisMode = "save" | "viewer";
type NonDividerBlockTag = Exclude<NoteBlockTag, "DIVIDER">;

export interface NoteContentMetrics {
  totalBlocks: number;
  taggedBlockCount: number;
  paragraphCount: number;
  titleCount: number;
  subjectCount: number;
  dateCount: number;
  headingCount: number;
  diagramCount: number;
  contentPointCount: number;
  featureBlockCount: number;
  recognizedRatio: number;
}

export interface NoteContentAnalysis {
  blocks: NoteBlock[];
  metrics: NoteContentMetrics;
  issues: string[];
  status: "pass" | "review" | "fail";
}

export const NOTE_BLOCK_TAGS: NoteBlockTag[] = [
  "TITLE",
  "SUBJECT_TAG",
  "DATE_TAG",
  "HEADING1",
  "HEADING2",
  "HEADING3",
  "STICKY_YELLOW",
  "STICKY_PINK",
  "STICKY_BLUE",
  "STAR_POINT",
  "ARROW_POINT",
  "CHECK_POINT",
  "BULLET_POINT",
  "FORMULA_BOX",
  "DEFINITION_BOX",
  "EXAMPLE_BOX",
  "MEMORY_BOX",
  "DIAGRAM_PLACEHOLDER",
  "MARGIN_NOTE",
  "DIVIDER"
];

const NOTE_TAGS = new Set<NoteBlockTag>(NOTE_BLOCK_TAGS);
const BLOCK_GROUP = NOTE_BLOCK_TAGS.join("|");
const BLOCK_MARKER_REGEX = new RegExp(`\\[\\s*\\/?\\s*(?:${BLOCK_GROUP})\\s*\\]`, "gi");
const CLOSED_BLOCK_REGEX = new RegExp(`\\[\\s*(${BLOCK_GROUP})\\s*\\]([\\s\\S]*?)\\[\\s*\\/\\s*\\1\\s*\\]`, "gi");
const TAG_PRIORITY: NonDividerBlockTag[] = [
  "TITLE",
  "SUBJECT_TAG",
  "DATE_TAG",
  "HEADING1",
  "HEADING2",
  "HEADING3",
  "STICKY_YELLOW",
  "STICKY_PINK",
  "STICKY_BLUE",
  "FORMULA_BOX",
  "DEFINITION_BOX",
  "EXAMPLE_BOX",
  "MEMORY_BOX",
  "DIAGRAM_PLACEHOLDER",
  "MARGIN_NOTE",
  "STAR_POINT",
  "ARROW_POINT",
  "CHECK_POINT",
  "BULLET_POINT"
];

const META_DISALLOWED_PATTERNS = [
  /as an automated system/i,
  /i(?: am|'m) not sure/i,
  /consult (?:your|a) (?:teacher|textbook)/i,
  /double-?check/i,
  /may vary by source/i,
  /cannot verify/i
];

const PLACEHOLDER_PATTERNS = [/lorem ipsum/i, /\btbd\b/i, /\bplaceholder\b/i, /\[insert/i];

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function placeholderKeyFromDescription(description: string, index: number) {
  const base = description
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return base ? `${base}-${index + 1}` : `diagram-${index + 1}`;
}

function sanitizeBlockValue(tag: NoteBlockTag, rawValue: string) {
  let value = rawValue.replace(BLOCK_MARKER_REGEX, " ");
  value = normalizeText(value);
  value = value.replace(/[▮□■▪]/g, " ");
  value = value.replace(/^\s*\u2702\s*/, "");
  value = normalizeText(value);

  if (tag === "STAR_POINT" || tag === "ARROW_POINT" || tag === "CHECK_POINT" || tag === "BULLET_POINT") {
    value = value.replace(/^[\u2605\u2713\u2022\u2192\u219D\-\s]+/, "");
  }

  return value;
}

function pickPrimaryTag(tags: NoteBlockTag[]) {
  const uniqueTags = Array.from(new Set(tags.filter((tag): tag is NonDividerBlockTag => tag !== "DIVIDER")));
  if (!uniqueTags.length) {
    return null;
  }

  for (const prioritized of TAG_PRIORITY) {
    if (uniqueTags.includes(prioritized)) {
      return prioritized;
    }
  }

  return uniqueTags[uniqueTags.length - 1] ?? null;
}

function inferTagFromSymbols(line: string): NoteBlockTag | null {
  const clean = line.trim();
  if (!clean) {
    return null;
  }

  if (/^[\u2605\u2B50]/.test(clean)) return "STAR_POINT";
  if (/^[\u219D\u2192]/.test(clean)) return "ARROW_POINT";
  if (/^[\u2713\u2714]/.test(clean)) return "CHECK_POINT";
  if (/^[\u2022\-]/.test(clean)) return "BULLET_POINT";
  return null;
}

function parseLooseChunk(chunk: string, blocks: NoteBlock[]) {
  let pendingTag: NoteBlockTag | null = null;
  const lines = chunk.split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      pendingTag = null;
      continue;
    }

    const dividerMatches = Array.from(line.matchAll(/\[\s*DIVIDER\s*\]/gi));
    if (dividerMatches.length) {
      dividerMatches.forEach(() => blocks.push({ tag: "DIVIDER" }));
    }

    const tagsFromLine = Array.from(line.matchAll(new RegExp(`\\[\\s*(${BLOCK_GROUP})\\s*\\]`, "gi")))
      .map((match) => (match[1] ?? "").toUpperCase() as NoteBlockTag)
      .filter((tag): tag is NoteBlockTag => NOTE_TAGS.has(tag))
      .filter((tag) => tag !== "DIVIDER");

    const cleanText = normalizeText(line.replace(BLOCK_MARKER_REGEX, " "));
    const selectedTag = pickPrimaryTag(tagsFromLine);

    if (selectedTag) {
      if (cleanText) {
        const cleaned = sanitizeBlockValue(selectedTag, cleanText);
        if (cleaned) {
          blocks.push({ tag: selectedTag, value: cleaned });
        }
        pendingTag = null;
      } else {
        pendingTag = selectedTag;
      }
      continue;
    }

    if (pendingTag && cleanText) {
      const cleaned = sanitizeBlockValue(pendingTag, cleanText);
      if (cleaned) {
        blocks.push({ tag: pendingTag, value: cleaned });
      }
      continue;
    }

    const inferred = inferTagFromSymbols(line);
    if (inferred) {
      const cleaned = sanitizeBlockValue(inferred, cleanText || line);
      if (cleaned) {
        blocks.push({ tag: inferred, value: cleaned });
      }
      continue;
    }

    if (cleanText) {
      blocks.push({ tag: "PARAGRAPH", value: cleanText });
    }
  }
}

export function parseNoteBlocks(rawContent: string): NoteBlock[] {
  const normalized = rawContent.replace(/\r/g, "");
  const blocks: NoteBlock[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null = null;

  CLOSED_BLOCK_REGEX.lastIndex = 0;
  while ((match = CLOSED_BLOCK_REGEX.exec(normalized)) !== null) {
    parseLooseChunk(normalized.slice(cursor, match.index), blocks);

    const upperTag = (match[1] ?? "").toUpperCase() as NoteBlockTag;
    if (upperTag === "DIVIDER") {
      blocks.push({ tag: "DIVIDER" });
    } else if (NOTE_TAGS.has(upperTag)) {
      const cleaned = sanitizeBlockValue(upperTag, match[2] ?? "");
      if (cleaned) {
        blocks.push({ tag: upperTag, value: cleaned });
      }
    } else {
      parseLooseChunk(match[0], blocks);
    }

    cursor = CLOSED_BLOCK_REGEX.lastIndex;
  }

  parseLooseChunk(normalized.slice(cursor), blocks);
  return blocks.filter((block) => (typeof block.value === "string" ? block.value.trim().length > 0 : true));
}

function countBlocks(blocks: NoteBlock[], tag: ParsedNoteBlockTag) {
  return blocks.filter((block) => block.tag === tag).length;
}

function collectMetrics(blocks: NoteBlock[]): NoteContentMetrics {
  const taggedBlockCount = blocks.filter((block) => block.tag !== "PARAGRAPH").length;
  const paragraphCount = countBlocks(blocks, "PARAGRAPH");
  const totalBlocks = blocks.length;

  return {
    totalBlocks,
    taggedBlockCount,
    paragraphCount,
    titleCount: countBlocks(blocks, "TITLE"),
    subjectCount: countBlocks(blocks, "SUBJECT_TAG"),
    dateCount: countBlocks(blocks, "DATE_TAG"),
    headingCount: countBlocks(blocks, "HEADING1") + countBlocks(blocks, "HEADING2") + countBlocks(blocks, "HEADING3"),
    diagramCount: countBlocks(blocks, "DIAGRAM_PLACEHOLDER"),
    contentPointCount:
      countBlocks(blocks, "STAR_POINT") +
      countBlocks(blocks, "ARROW_POINT") +
      countBlocks(blocks, "CHECK_POINT") +
      countBlocks(blocks, "BULLET_POINT") +
      paragraphCount,
    featureBlockCount:
      countBlocks(blocks, "STICKY_YELLOW") +
      countBlocks(blocks, "STICKY_PINK") +
      countBlocks(blocks, "STICKY_BLUE") +
      countBlocks(blocks, "FORMULA_BOX") +
      countBlocks(blocks, "DEFINITION_BOX") +
      countBlocks(blocks, "EXAMPLE_BOX") +
      countBlocks(blocks, "MEMORY_BOX"),
    recognizedRatio: totalBlocks === 0 ? 0 : taggedBlockCount / totalBlocks
  };
}

function collectIssues(rawContent: string, metrics: NoteContentMetrics, mode: AnalysisMode) {
  const issues: string[] = [];

  if (metrics.totalBlocks < 4) {
    issues.push("Too little structured content was produced.");
  }
  if (metrics.titleCount === 0) {
    issues.push("Missing [TITLE] block.");
  }
  if (metrics.subjectCount === 0) {
    issues.push("Missing [SUBJECT_TAG] block.");
  }
  if (metrics.dateCount === 0) {
    issues.push("Missing [DATE_TAG] block.");
  }
  if (metrics.headingCount < 2) {
    issues.push("At least two headings are required.");
  }
  if (metrics.contentPointCount < 6) {
    issues.push("The note body needs more study points.");
  }
  if (metrics.featureBlockCount < 1) {
    issues.push("Add at least one definition, example, memory, formula, or sticky note block.");
  }
  if (metrics.diagramCount < 2) {
    issues.push("At least two diagram placeholders are required.");
  }
  if (metrics.recognizedRatio < (mode === "save" ? 0.7 : 0.35)) {
    issues.push("Too much of the note fell outside the tagged structure.");
  }
  if (metrics.paragraphCount > (mode === "save" ? 2 : 4)) {
    issues.push("Too many loose paragraphs were rendered outside tagged blocks.");
  }
  if (META_DISALLOWED_PATTERNS.some((pattern) => pattern.test(rawContent))) {
    issues.push("The note contains low-confidence or meta system phrasing.");
  }
  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(rawContent))) {
    issues.push("The note contains placeholder or unfinished text.");
  }

  return issues;
}

export function analyzeNoteContent(rawContent: string, mode: AnalysisMode = "viewer"): NoteContentAnalysis {
  const blocks = parseNoteBlocks(rawContent);
  const metrics = collectMetrics(blocks);
  const issues = collectIssues(rawContent, metrics, mode);

  if (mode === "save") {
    return {
      blocks,
      metrics,
      issues,
      status: issues.length === 0 ? "pass" : "fail"
    };
  }

  let status: NoteContentAnalysis["status"] = "pass";
  if (metrics.totalBlocks < 4 || metrics.recognizedRatio < 0.35) {
    status = "fail";
  } else if (issues.length > 0) {
    status = "review";
  }

  return {
    blocks,
    metrics,
    issues,
    status
  };
}

export function extractNoteDiagramPlaceholders(rawContent: string): NoteDiagramPlaceholder[] {
  return parseNoteBlocks(rawContent)
    .map((block, index) => ({ block, index }))
    .filter((entry): entry is { block: NoteBlock & { tag: "DIAGRAM_PLACEHOLDER"; value: string }; index: number } => {
      return entry.block.tag === "DIAGRAM_PLACEHOLDER" && typeof entry.block.value === "string" && entry.block.value.trim().length > 0;
    })
    .map(({ block, index }, order) => ({
      key: placeholderKeyFromDescription(block.value, order),
      description: block.value,
      index
    }));
}
