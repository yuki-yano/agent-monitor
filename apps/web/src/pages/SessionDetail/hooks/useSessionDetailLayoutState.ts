import { useMediaQuery } from "@/lib/use-media-query";
import { useSidebarWidth } from "@/lib/use-sidebar-width";
import { useSplitRatio } from "@/lib/use-split-ratio";

export const useSessionDetailLayoutState = () => {
  const is2xlUp = useMediaQuery("(min-width: 1536px)");
  const isMobile = useMediaQuery("(max-width: 767px)");

  const { sidebarWidth, handlePointerDown: handleSidebarPointerDown } = useSidebarWidth();
  const {
    ratio: detailSplitRatio,
    containerRef: detailSplitRef,
    handlePointerDown: handleDetailSplitPointerDown,
  } = useSplitRatio({
    storageKey: "vde.detail.split",
    defaultRatio: 0.5,
    minRatio: 0.35,
    maxRatio: 0.65,
  });

  return {
    is2xlUp,
    isMobile,
    sidebarWidth,
    handleSidebarPointerDown,
    detailSplitRatio,
    detailSplitRef,
    handleDetailSplitPointerDown,
  };
};
