import { create } from "zustand";
import { BBox } from "../types/api";

interface ViewerState {
  open: boolean;
  documentId: string | null;
  filename: string;
  targetPage: number;
  targetBBoxes: BBox[];
  openViewer: (documentId: string, filename: string, targetPage?: number, targetBBoxes?: BBox[]) => void;
  closeViewer: () => void;
  setTarget: (page: number, bboxes?: BBox[]) => void;
}

export const useViewerStore = create<ViewerState>((set) => ({
  open: false,
  documentId: null,
  filename: "",
  targetPage: 1,
  targetBBoxes: [],
  openViewer: (documentId, filename, targetPage = 1, targetBBoxes = []) =>
    set({
      open: true,
      documentId,
      filename,
      targetPage,
      targetBBoxes,
    }),
  closeViewer: () =>
    set({
      open: false,
      documentId: null,
      targetBBoxes: [],
    }),
  setTarget: (targetPage, targetBBoxes = []) =>
    set({
      targetPage,
      targetBBoxes,
    }),
}));
