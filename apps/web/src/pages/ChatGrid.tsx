import { APP_DISPLAY_NAME } from "@/lib/brand";
import { useMediaQuery } from "@/lib/use-media-query";

import { ChatGridView } from "./ChatGrid/ChatGridView";
import { useChatGridVM } from "./ChatGrid/useChatGridVM";

export const ChatGridPage = () => {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const viewModel = useChatGridVM();
  if (isMobile) {
    return <title>{APP_DISPLAY_NAME}</title>;
  }

  return (
    <>
      <title>{`Chat Grid - ${APP_DISPLAY_NAME}`}</title>
      <ChatGridView {...viewModel} />
    </>
  );
};
