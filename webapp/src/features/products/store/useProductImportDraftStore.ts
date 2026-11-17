import { create } from "zustand";
import type { ImportPreviewRow } from "../lib/product-import";

/**
 * Draft shared by the two import pages: the upload page validates the CSV and
 * hands the parsed rows to the review page, which edits and commits them.
 *
 * In-memory on purpose: a hard refresh with no draft sends the user back to the
 * upload step, which is the only source of a valid preview.
 */
interface ProductImportDraftState {
  fileName: string;
  rows: ImportPreviewRow[];
  load: (fileName: string, rows: ImportPreviewRow[]) => void;
  setRows: (updater: (rows: ImportPreviewRow[]) => ImportPreviewRow[]) => void;
  reset: () => void;
}

export const useProductImportDraftStore = create<ProductImportDraftState>(
  (set) => ({
    fileName: "",
    rows: [],
    load: (fileName, rows) => set({ fileName, rows }),
    setRows: (updater) => set((state) => ({ rows: updater(state.rows) })),
    reset: () => set({ fileName: "", rows: [] }),
  }),
);
