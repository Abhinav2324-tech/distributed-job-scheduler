import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute, PublicRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { OverviewPage } from "./pages/OverviewPage";
import { QueuesPage } from "./pages/QueuesPage";
import { JobsPage } from "./pages/JobsPage";
import { JobDetailPage } from "./pages/JobDetailPage";
import { WorkersPage } from "./pages/WorkersPage";
import { DeadLetterPage } from "./pages/DeadLetterPage";

function App() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/queues" element={<QueuesPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/jobs/:id" element={<JobDetailPage />} />
          <Route path="/workers" element={<WorkersPage />} />
          <Route path="/dead-letter" element={<DeadLetterPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
