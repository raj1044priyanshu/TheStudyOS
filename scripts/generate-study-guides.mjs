import fs from "node:fs/promises";
import path from "node:path";

const sourcePath = path.join(process.cwd(), "content", "study-guides", "source", "approved-guides.json");
const outputPath = path.join(process.cwd(), "content", "study-guides", "generated-guides.json");

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ensureArray(value, fieldName) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Guide is missing required array field: ${fieldName}`);
  }
  return value;
}

const source = JSON.parse(await fs.readFile(sourcePath, "utf8"));

const generated = source.map((guide) => {
  const subject = String(guide.subject ?? "").trim();
  const topic = String(guide.topic ?? "").trim();

  if (!subject || !topic) {
    throw new Error("Each guide must include subject and topic.");
  }

  ensureArray(guide.keyTakeaways, "keyTakeaways");
  ensureArray(guide.sections, "sections");
  ensureArray(guide.faqs, "faqs");
  ensureArray(guide.practiceChecklist, "practiceChecklist");

  const subjectSlug = slugify(subject);
  const topicSlug = slugify(topic);

  return {
    ...guide,
    subject,
    topic,
    subjectSlug,
    topicSlug,
    path: `/study-guides/${subjectSlug}/${topicSlug}`
  };
});

await fs.writeFile(outputPath, `${JSON.stringify(generated, null, 2)}\n`);
console.log(`Generated ${generated.length} study guides at ${outputPath}`);
