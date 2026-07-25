import { useState } from "react";
import JobForm from "./components/JobForm/JobForm";
import JobList from "./components/JobList/JobList";
import JobDetails from "./components/JobDetails/JobDetails";
import "./App.scss";
import { FaLink } from "react-icons/fa";

function App() {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  return (
    <div className="app">
      <header className="app-header">
        <div className="container">
          <div className="app-header-content">
            <div className="app-logo">
              <FaLink />
            </div>
            <div>
              <h1>URL Checker Service</h1>
              <p>Асинхронная проверка доступности URL · 3205.Team</p>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          <div className="app-grid">
            <div className="app-left">
              <JobForm onJobCreated={setActiveJobId} />
              <JobList activeJobId={activeJobId} onSelectJob={setActiveJobId} />
            </div>
            <div className="app-right">
              {activeJobId ? (
                <JobDetails jobId={activeJobId} />
              ) : (
                <div className="empty-state card">
                  <div className="empty-state-icon"></div>
                  <h3>Выберите задание</h3>
                  <p>Выберите задание из списка слева или создайте новое</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
