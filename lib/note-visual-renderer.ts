function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function toDisplayText(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function wrapText(value: string, maxChars: number) {
  const words = toDisplayText(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, 4);
}

function renderTextLines({
  lines,
  x,
  y,
  lineHeight,
  className,
  anchor = "start"
}: {
  lines: string[];
  x: number;
  y: number;
  lineHeight: number;
  className: string;
  anchor?: "start" | "middle" | "end";
}) {
  return `
    <text x="${x}" y="${y}" class="${className}" text-anchor="${anchor}">
      ${lines
        .map(
          (line, index) =>
            `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
        )
        .join("")}
    </text>
  `;
}

function box({
  x,
  y,
  width,
  height,
  tint = "#FFF8EF",
  stroke = "#E8D7C8"
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  tint?: string;
  stroke?: string;
}) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="30" fill="${tint}" stroke="${stroke}" stroke-width="2" />`;
}

function extractSegments(description: string, max = 4) {
  const cleaned = description
    .replace(/^\s*(a|an|the)\s+/i, "")
    .replace(
      /\b(flow\s?chart|comparison chart|timeline|process diagram|hierarchy diagram|formula layout|formula sheet|table|chart|diagram|cycle|mind map|map)\b/gi,
      " "
    )
    .replace(/\b(showing|illustrating|explaining|describing|outlining|covering|depicting)\b/gi, "|")
    .replace(/\b(vs\.?|versus|compared with|compared to|between|through|leading to|because of)\b/gi, "|")
    .replace(/\b(and then|then|and|from|to)\b/gi, "|")
    .replace(/[():]/g, "|");

  return uniqueStrings(
    cleaned
      .split(/[|,;/]+/)
      .map((part) => part.trim().replace(/\s+/g, " "))
      .filter((part) => part.length > 3)
      .map(toDisplayText)
  ).slice(0, max);
}

function buildVisualTitle(description: string) {
  const stripped = description
    .replace(/^\s*(a|an|the)\s+/i, "")
    .replace(/\b(showing|illustrating|explaining|describing|outlining|covering|depicting)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return toDisplayText(stripped || "Study visual");
}

type DeterministicVisualKind = "comparison" | "flowchart" | "timeline" | "hierarchy" | "formula" | "labeled" | "generic";

function classifyDeterministicVisual(description: string): DeterministicVisualKind {
  if (/\b(labeled diagram|labelled diagram|annotated diagram|diagram of|schematic|cross[-\s]?section)\b/i.test(description)) {
    return "labeled";
  }
  if (/\b(compare|comparison|difference|contrast|versus|vs\.?)\b/i.test(description)) {
    return "comparison";
  }
  if (/\b(timeline|chronology|sequence)\b/i.test(description)) {
    return "timeline";
  }
  if (/\b(hierarchy|classification|tree|mind map|map)\b/i.test(description)) {
    return "hierarchy";
  }
  if (/\b(formula|equation|layout)\b/i.test(description)) {
    return "formula";
  }
  if (/\b(flow\s?chart|process|cycle|stages?|steps?)\b/i.test(description)) {
    return "flowchart";
  }
  return "generic";
}

export function shouldUseDeterministicNoteVisual(description: string) {
  return /\b(flow\s?chart|comparison|timeline|process|cycle|hierarchy|classification|formula|equation|table|chart|mind map|map|stages?|steps?|labeled diagram|labelled diagram|annotated diagram|diagram of|schematic|cross[-\s]?section)\b/i.test(
    description
  );
}

function renderComparisonVisual(title: string, segments: string[], subject: string, topic: string) {
  const [left = "First idea", right = "Second idea"] = segments;
  const footer = segments.slice(2, 4);

  return `
    ${box({ x: 72, y: 172, width: 540, height: 520, tint: "#FFF7EC" })}
    ${box({ x: 668, y: 172, width: 540, height: 520, tint: "#F6FBF8", stroke: "#D5E7DD" })}
    ${renderTextLines({ lines: wrapText(left, 18), x: 342, y: 290, lineHeight: 54, className: "card-title", anchor: "middle" })}
    ${renderTextLines({ lines: wrapText(right, 18), x: 938, y: 290, lineHeight: 54, className: "card-title", anchor: "middle" })}
    ${renderTextLines({
      lines: wrapText(title, 24),
      x: 640,
      y: 110,
      lineHeight: 54,
      className: "hero-title",
      anchor: "middle"
    })}
    ${footer.length ? renderTextLines({ lines: wrapText(footer.join(" • "), 40), x: 640, y: 760, lineHeight: 36, className: "caption", anchor: "middle" }) : ""}
    ${renderTextLines({ lines: wrapText(`${subject} • ${topic}`, 42), x: 640, y: 860, lineHeight: 30, className: "meta", anchor: "middle" })}
  `;
}

function renderFlowchartVisual(title: string, segments: string[], subject: string) {
  const steps = [...segments];
  while (steps.length < 4) {
    steps.push(["Key idea", "Core step", "Important link", "Outcome"][steps.length] || "Next step");
  }

  const positions = [
    { x: 350, y: 170, width: 580, height: 120, tint: "#FFF7EC" },
    { x: 350, y: 330, width: 580, height: 120, tint: "#F6FBF8", stroke: "#D5E7DD" },
    { x: 350, y: 490, width: 580, height: 120, tint: "#F8F4FF", stroke: "#DDD0F5" },
    { x: 350, y: 650, width: 580, height: 120, tint: "#FFF3F2", stroke: "#F0D1CD" }
  ];

  return `
    ${renderTextLines({ lines: wrapText(title, 26), x: 640, y: 96, lineHeight: 52, className: "hero-title", anchor: "middle" })}
    ${positions
      .map((position, index) => {
        const centerX = position.x + position.width / 2;
        return `
          ${box(position)}
          ${renderTextLines({
            lines: wrapText(steps[index], 24),
            x: centerX,
            y: position.y + 56,
            lineHeight: 42,
            className: "card-title",
            anchor: "middle"
          })}
          ${
            index < positions.length - 1
              ? `<line x1="${centerX}" y1="${position.y + position.height}" x2="${centerX}" y2="${positions[index + 1].y - 18}" stroke="#D48A79" stroke-width="8" stroke-linecap="round" />
                 <polygon points="${centerX - 14},${positions[index + 1].y - 28} ${centerX + 14},${positions[index + 1].y - 28} ${centerX},${positions[index + 1].y - 6}" fill="#D48A79" />`
              : ""
          }
        `;
      })
      .join("")}
    ${renderTextLines({ lines: wrapText(subject, 24), x: 640, y: 870, lineHeight: 30, className: "meta", anchor: "middle" })}
  `;
}

function renderTimelineVisual(title: string, segments: string[], subject: string) {
  const points = [...segments];
  while (points.length < 4) {
    points.push(["Start", "Build", "Shift", "Outcome"][points.length] || "Milestone");
  }

  const xPositions = [170, 420, 760, 1030];

  return `
    ${renderTextLines({ lines: wrapText(title, 28), x: 640, y: 120, lineHeight: 52, className: "hero-title", anchor: "middle" })}
    <line x1="170" y1="430" x2="1030" y2="430" stroke="#D48A79" stroke-width="8" stroke-linecap="round" />
    ${xPositions
      .map(
        (x, index) => `
          <circle cx="${x}" cy="430" r="26" fill="#FFF8EF" stroke="#D48A79" stroke-width="6" />
          ${box({ x: x - 110, y: 220 + (index % 2 === 0 ? 0 : 140), width: 220, height: 130, tint: index % 2 === 0 ? "#FFF7EC" : "#F6FBF8", stroke: index % 2 === 0 ? "#E8D7C8" : "#D5E7DD" })}
          ${renderTextLines({
            lines: wrapText(points[index], 16),
            x,
            y: 280 + (index % 2 === 0 ? 0 : 140),
            lineHeight: 34,
            className: "card-body",
            anchor: "middle"
          })}
        `
      )
      .join("")}
    ${renderTextLines({ lines: wrapText(subject, 22), x: 640, y: 860, lineHeight: 30, className: "meta", anchor: "middle" })}
  `;
}

function renderHierarchyVisual(title: string, segments: string[], subject: string) {
  const [root = title, ...branches] = segments;
  const children = [...branches];
  while (children.length < 3) {
    children.push(["Branch one", "Branch two", "Branch three"][children.length] || "Connected idea");
  }

  const childBoxes = [
    { x: 90, y: 520, width: 320, height: 180, tint: "#FFF7EC" },
    { x: 480, y: 520, width: 320, height: 180, tint: "#F6FBF8", stroke: "#D5E7DD" },
    { x: 870, y: 520, width: 320, height: 180, tint: "#F8F4FF", stroke: "#DDD0F5" }
  ];

  return `
    ${renderTextLines({ lines: wrapText(title, 26), x: 640, y: 96, lineHeight: 52, className: "hero-title", anchor: "middle" })}
    ${box({ x: 350, y: 190, width: 580, height: 170, tint: "#FFF3F2", stroke: "#F0D1CD" })}
    ${renderTextLines({ lines: wrapText(root, 24), x: 640, y: 270, lineHeight: 42, className: "card-title", anchor: "middle" })}
    <line x1="640" y1="360" x2="640" y2="450" stroke="#D48A79" stroke-width="8" stroke-linecap="round" />
    <line x1="250" y1="450" x2="1030" y2="450" stroke="#D48A79" stroke-width="8" stroke-linecap="round" />
    ${childBoxes
      .map(
        (item, index) => `
          <line x1="${item.x + item.width / 2}" y1="450" x2="${item.x + item.width / 2}" y2="${item.y}" stroke="#D48A79" stroke-width="8" stroke-linecap="round" />
          ${box(item)}
          ${renderTextLines({
            lines: wrapText(children[index], 18),
            x: item.x + item.width / 2,
            y: item.y + 70,
            lineHeight: 36,
            className: "card-body",
            anchor: "middle"
          })}
        `
      )
      .join("")}
    ${renderTextLines({ lines: wrapText(subject, 22), x: 640, y: 860, lineHeight: 30, className: "meta", anchor: "middle" })}
  `;
}

function renderFormulaVisual(title: string, segments: string[], subject: string, topic: string) {
  const cards = [...segments];
  while (cards.length < 3) {
    cards.push(["Key variables", "When to apply", "Quick reminder"][cards.length] || "Important note");
  }

  return `
    ${renderTextLines({ lines: wrapText(title, 26), x: 640, y: 110, lineHeight: 52, className: "hero-title", anchor: "middle" })}
    ${box({ x: 210, y: 180, width: 860, height: 220, tint: "#FFF8EF" })}
    ${renderTextLines({
      lines: wrapText("Formula layout", 20),
      x: 640,
      y: 270,
      lineHeight: 50,
      className: "formula-label",
      anchor: "middle"
    })}
    ${[140, 470, 800]
      .map(
        (x, index) => `
          ${box({ x, y: 500, width: 280, height: 190, tint: index === 1 ? "#F6FBF8" : index === 2 ? "#F8F4FF" : "#FFF7EC", stroke: index === 1 ? "#D5E7DD" : index === 2 ? "#DDD0F5" : "#E8D7C8" })}
          ${renderTextLines({
            lines: wrapText(cards[index], 16),
            x: x + 140,
            y: 580,
            lineHeight: 34,
            className: "card-body",
            anchor: "middle"
          })}
        `
      )
      .join("")}
    ${renderTextLines({ lines: wrapText(`${subject} • ${topic}`, 32), x: 640, y: 860, lineHeight: 30, className: "meta", anchor: "middle" })}
  `;
}

function buildDiagramFocus(description: string, fallback: string) {
  const focus = description
    .replace(/^\s*(a|an|the)\s+/i, "")
    .replace(/\b(?:labeled|labelled|annotated)\s+diagram\s+of\b/i, "")
    .replace(/\b(?:diagram|schematic|cross[-\s]?section)\s+of\b/i, "")
    .replace(/\b(?:showing|illustrating|explaining|describing|outlining|covering|depicting|highlighting|featuring)\b[\s\S]*$/i, "")
    .replace(/[.,;:\s]+$/g, "")
    .trim();

  return toDisplayText(focus || fallback || "Study system");
}

function extractDiagramLabels(description: string, max = 5) {
  const matched = description.match(
    /\b(?:showing|illustrating|explaining|describing|outlining|covering|depicting|highlighting|featuring)\b([\s\S]*)$/i
  );
  const raw = matched?.[1] ?? description;

  return uniqueStrings(
    raw
      .replace(/[():]/g, ",")
      .split(/[,;/]+/)
      .map((part) => part.trim().replace(/^(and|with)\s+/i, ""))
      .map((part) => part.replace(/\s+/g, " "))
      .filter((part) => part.length > 2)
      .map(toDisplayText)
  ).slice(0, max);
}

function renderLabeledDiagramVisual(description: string, subject: string, topic: string) {
  const focus = buildDiagramFocus(description, topic);
  const labels = extractDiagramLabels(description, 5);
  const focusLines = wrapText(focus, 20);
  const compactTitle = focusLines.length > 2;
  const titleY = compactTitle ? 80 : 90;
  const titleLineHeight = compactTitle ? 38 : 48;
  const subtitleY = titleY + Math.max(focusLines.length - 1, 0) * titleLineHeight + 38;
  const topBoxY = subtitleY + 22;
  const mainBoxY = topBoxY + 110;
  const mainBoxBottom = mainBoxY + 400;
  const bottomCalloutY = Math.min(mainBoxBottom + 64, 824);
  const metaY = 928;

  const slotLayouts = {
    top: { box: { x: 470, y: topBoxY, width: 340, height: 96, tint: "#FFF7EC" }, textX: 640, textY: topBoxY + 55, anchorX: 640, anchorY: mainBoxY },
    left: { box: { x: 72, y: mainBoxY + 110, width: 260, height: 110, tint: "#F6FBF8", stroke: "#D5E7DD" }, textX: 202, textY: mainBoxY + 172, anchorX: 390, anchorY: mainBoxY + 200 },
    right: { box: { x: 948, y: mainBoxY + 110, width: 260, height: 110, tint: "#F8F4FF", stroke: "#DDD0F5" }, textX: 1078, textY: mainBoxY + 172, anchorX: 890, anchorY: mainBoxY + 200 },
    "bottom-left": { box: { x: 144, y: bottomCalloutY, width: 300, height: 104, tint: "#FFF3F2", stroke: "#F0D1CD" }, textX: 294, textY: bottomCalloutY + 58, anchorX: 490, anchorY: mainBoxBottom - 2 },
    "bottom-right": { box: { x: 836, y: bottomCalloutY, width: 300, height: 104, tint: "#FFF8EF" }, textX: 986, textY: bottomCalloutY + 58, anchorX: 790, anchorY: mainBoxBottom - 2 }
  } as const;

  const slotOrder: Array<keyof typeof slotLayouts> = ["top", "left", "right", "bottom-left", "bottom-right"];
  const keywordSlots: Array<{ pattern: RegExp; slot: keyof typeof slotLayouts }> = [
    { pattern: /\b(salt bridge|bridge|separator)\b/i, slot: "top" },
    { pattern: /\b(anode|oxidation)\b/i, slot: "left" },
    { pattern: /\b(cathode|reduction)\b/i, slot: "right" },
    { pattern: /\b(external circuit|wire|power source|battery|supply)\b/i, slot: "bottom-left" },
    { pattern: /\b(electron|ion movement|current|flow|movement|direction)\b/i, slot: "bottom-right" }
  ];

  const usedSlots = new Set<keyof typeof slotLayouts>();
  const assignments: Array<{ label: string; slot: keyof typeof slotLayouts }> = [];

  for (const label of labels) {
    const matchedSlot = keywordSlots.find((entry) => entry.pattern.test(label) && !usedSlots.has(entry.slot))?.slot;
    const fallbackSlot = matchedSlot ?? slotOrder.find((slot) => !usedSlots.has(slot));
    if (!fallbackSlot) {
      break;
    }

    usedSlots.add(fallbackSlot);
    assignments.push({ label, slot: fallbackSlot });
  }

  return `
    ${renderTextLines({ lines: focusLines, x: 640, y: titleY, lineHeight: titleLineHeight, className: compactTitle ? "diagram-heading-compact" : "hero-title", anchor: "middle" })}
    <text x="640" y="${subtitleY}" class="caption" text-anchor="middle">Labeled study diagram</text>
    ${box({ x: 390, y: mainBoxY, width: 500, height: 400, tint: "#FFFDFC" })}
    ${box({ x: 470, y: mainBoxY + 40, width: 130, height: 240, tint: "#EAF2FF", stroke: "#BBD4F7" })}
    ${box({ x: 680, y: mainBoxY + 40, width: 130, height: 240, tint: "#FDEFE7", stroke: "#F4C8A9" })}
    ${box({ x: 560, y: mainBoxY + 6, width: 160, height: 54, tint: "#FFF3F2", stroke: "#F0D1CD" })}
    <line x1="535" y1="${mainBoxY + 60}" x2="535" y2="${mainBoxY + 5}" stroke="#C47F6C" stroke-width="6" stroke-linecap="round" />
    <line x1="745" y1="${mainBoxY + 60}" x2="745" y2="${mainBoxY + 5}" stroke="#C47F6C" stroke-width="6" stroke-linecap="round" />
    <line x1="470" y1="${mainBoxY + 330}" x2="810" y2="${mainBoxY + 330}" stroke="#C47F6C" stroke-width="6" stroke-linecap="round" />
    <line x1="470" y1="${mainBoxY + 330}" x2="470" y2="${mainBoxBottom - 12}" stroke="#C47F6C" stroke-width="6" stroke-linecap="round" />
    <line x1="810" y1="${mainBoxY + 330}" x2="810" y2="${mainBoxBottom - 12}" stroke="#C47F6C" stroke-width="6" stroke-linecap="round" />
    <line x1="470" y1="${mainBoxBottom - 12}" x2="810" y2="${mainBoxBottom - 12}" stroke="#C47F6C" stroke-width="6" stroke-linecap="round" />
    <polygon points="770,${mainBoxBottom - 28} 800,${mainBoxBottom - 12} 770,${mainBoxBottom + 4}" fill="#C47F6C" />
    <text x="640" y="${mainBoxY - 34}" class="meta" text-anchor="middle">StudyOS diagram</text>
    <text x="535" y="${mainBoxY + 168}" class="diagram-core" text-anchor="middle">Half-cell A</text>
    <text x="745" y="${mainBoxY + 168}" class="diagram-core" text-anchor="middle">Half-cell B</text>
    <text x="640" y="${mainBoxY + 36}" class="diagram-label" text-anchor="middle">Bridge</text>
    <text x="640" y="${mainBoxBottom + 24}" class="diagram-label" text-anchor="middle">Electron path</text>
    ${assignments
      .map(({ label, slot }) => {
        const layout = slotLayouts[slot];
        const boxCenterX = layout.box.x + layout.box.width / 2;
        const boxCenterY = layout.box.y + layout.box.height / 2;
        return `
          ${box(layout.box)}
          <line x1="${boxCenterX}" y1="${boxCenterY}" x2="${layout.anchorX}" y2="${layout.anchorY}" stroke="#D48A79" stroke-width="4" stroke-linecap="round" />
          <circle cx="${layout.anchorX}" cy="${layout.anchorY}" r="8" fill="#D48A79" />
          ${renderTextLines({
            lines: wrapText(label, slot === "top" ? 20 : 16),
            x: layout.textX,
            y: layout.textY,
            lineHeight: 32,
            className: "card-body",
            anchor: "middle"
          })}
        `;
      })
      .join("")}
    ${renderTextLines({ lines: wrapText(`${subject} • ${topic}`, 32), x: 640, y: metaY, lineHeight: 30, className: "meta", anchor: "middle" })}
  `;
}

function renderGenericVisual(title: string, description: string, subject: string, topic: string) {
  const titleLines = wrapText(title, 24);
  const descriptionLines = wrapText(description, 30);
  const titleY = titleLines.length > 2 ? 235 : 270;
  const descriptionY = titleY + Math.max(titleLines.length - 1, 0) * 52 + 96;

  return `
    ${box({ x: 120, y: 160, width: 1040, height: 600, tint: "#FFF8EF" })}
    ${renderTextLines({ lines: titleLines, x: 640, y: titleY, lineHeight: 52, className: "hero-title", anchor: "middle" })}
    ${renderTextLines({ lines: descriptionLines, x: 640, y: descriptionY, lineHeight: 42, className: "card-body", anchor: "middle" })}
    ${renderTextLines({ lines: wrapText(`${subject} • ${topic}`, 32), x: 640, y: 860, lineHeight: 30, className: "meta", anchor: "middle" })}
  `;
}

export function renderDeterministicNoteVisual({
  subject,
  title,
  description
}: {
  subject: string;
  title: string;
  description: string;
}) {
  const visualKind = classifyDeterministicVisual(description);
  const visualTitle = visualKind === "labeled" ? buildDiagramFocus(description, title) : buildVisualTitle(description);
  const segments = extractSegments(description, visualKind === "comparison" ? 4 : 5);

  const svgBody =
    visualKind === "comparison"
      ? renderComparisonVisual(visualTitle, segments, subject, title)
      : visualKind === "timeline"
        ? renderTimelineVisual(visualTitle, segments, subject)
        : visualKind === "hierarchy"
          ? renderHierarchyVisual(visualTitle, segments, subject)
          : visualKind === "formula"
            ? renderFormulaVisual(visualTitle, segments, subject, title)
            : visualKind === "labeled"
              ? renderLabeledDiagramVisual(description, subject, title)
            : visualKind === "flowchart"
              ? renderFlowchartVisual(visualTitle, segments, subject)
              : renderGenericVisual(visualTitle, description, subject, title);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="960" viewBox="0 0 1280 960" role="img" aria-label="${escapeXml(
      visualTitle
    )}">
      <defs>
        <linearGradient id="studyos-card" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFFDF8" />
          <stop offset="100%" stop-color="#FFF7EF" />
        </linearGradient>
      </defs>
      <style>
        .canvas { fill: url(#studyos-card); }
        .hero-title { fill: #2F2431; font-family: "Avenir Next", "Segoe UI", sans-serif; font-size: 44px; font-weight: 700; }
        .card-title { fill: #43323D; font-family: "Avenir Next", "Segoe UI", sans-serif; font-size: 34px; font-weight: 700; }
        .card-body { fill: #5F5460; font-family: "Avenir Next", "Segoe UI", sans-serif; font-size: 28px; font-weight: 500; }
        .caption { fill: #7B6F77; font-family: "Avenir Next", "Segoe UI", sans-serif; font-size: 24px; font-weight: 500; }
        .meta { fill: #8B4F48; font-family: "Avenir Next", "Segoe UI", sans-serif; font-size: 22px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
        .formula-label { fill: #8B4F48; font-family: "Avenir Next", "Segoe UI", sans-serif; font-size: 58px; font-weight: 700; }
        .diagram-label { fill: #6F5560; font-family: "Avenir Next", "Segoe UI", sans-serif; font-size: 22px; font-weight: 700; }
        .diagram-core { fill: #43323D; font-family: "Avenir Next", "Segoe UI", sans-serif; font-size: 26px; font-weight: 700; }
        .diagram-heading-compact { fill: #2F2431; font-family: "Avenir Next", "Segoe UI", sans-serif; font-size: 34px; font-weight: 700; }
      </style>
      <rect width="1280" height="960" class="canvas" />
      <circle cx="140" cy="120" r="110" fill="rgba(229, 139, 121, 0.12)" />
      <circle cx="1120" cy="820" r="140" fill="rgba(134, 178, 157, 0.14)" />
      ${svgBody}
    </svg>
  `;

  return {
    data: Buffer.from(svg).toString("base64"),
    mimeType: "image/svg+xml" as const,
    provider: "internal" as const,
    model: "deterministic-svg-v1"
  };
}
