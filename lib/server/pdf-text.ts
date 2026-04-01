import "server-only";

import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const PDFTOTEXT_MAX_BUFFER = 16 * 1024 * 1024;

function toMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error);
}

export async function extractPdfText(buffer: Buffer) {
  const tempDir = await mkdtemp(join(tmpdir(), "studyos-pdf-"));
  const pdfPath = join(tempDir, "document.pdf");

  try {
    await writeFile(pdfPath, buffer);
    const { stdout } = await execFileAsync(
      "pdftotext",
      ["-enc", "UTF-8", "-layout", "-nopgbrk", pdfPath, "-"],
      { maxBuffer: PDFTOTEXT_MAX_BUFFER }
    );

    return stdout.trim();
  } catch (error) {
    const message = toMessage(error);
    throw new Error(`Failed to extract PDF text: ${message}`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
