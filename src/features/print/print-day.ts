import type { PrintRequest } from "@/features/print/print-documents";

/**
 * Print action of the staff mode (07 § 1, PLAN § 3.8): the documents and the print module load by import() at the
 * click, outside the initial path and the /collegue chunk (S3). Never rejects: a chunk that fails to load (site
 * updated meanwhile, network down) leaves the page as it was, with the error in the console; no text of the spec
 * covers that case.
 */
export async function printDay(request: Omit<PrintRequest, "printedAt">): Promise<void> {
  const printedAt = Date.now();
  try {
    const module = await import("@/features/print/print-documents");
    await module.printDocumentOfDay({ ...request, printedAt });
  } catch (error) {
    console.error(error);
  }
}
