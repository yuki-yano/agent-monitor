import { SessionListView } from "./SessionList/SessionListView";
import { useSessionListVM } from "./SessionList/useSessionListVM";

export const SessionListPage = () => {
  const viewModel = useSessionListVM();
  return <SessionListView {...viewModel} />;
};
