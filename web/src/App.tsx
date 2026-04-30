import { ReactFlowProvider } from "@xyflow/react";
import { AIPanel } from "./components/AIPanel";
import { DiagramCanvas } from "./components/DiagramCanvas";
import { Sidebar } from "./components/Sidebar";
import { Toolbar } from "./components/Toolbar";

function App() {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Yu Gothic', 'Meiryo', sans-serif",
      }}
    >
      <Toolbar />
      <ReactFlowProvider>
        <div style={{ flex: 1, display: "flex", position: "relative" }}>
          <DiagramCanvas />
          <Sidebar />
          <AIPanel />
        </div>
      </ReactFlowProvider>
    </div>
  );
}

export default App;
