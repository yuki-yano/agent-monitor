import { Route, Routes } from "react-router-dom";

import { SessionDetailPage } from "@/pages/SessionDetail";
import { SessionListPage } from "@/pages/SessionList";
import { SessionProvider } from "@/state/session-context";

const App = () => {
  return (
    <SessionProvider>
      <Routes>
        <Route path="/" element={<SessionListPage />} />
        <Route path="/sessions/:paneId" element={<SessionDetailPage />} />
      </Routes>
    </SessionProvider>
  );
};

export default App;
