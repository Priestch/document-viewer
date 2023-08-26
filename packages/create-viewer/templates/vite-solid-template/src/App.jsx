import "./App.css";
import DocumentViewer from "./components/DocumentViewer.jsx";

function App() {
  const options = {
    src: "compressed.tracemonkey-pldi-09.pdf",
    resourcePath: "document-viewer",
    disableCORSCheck: true,
  };
  return (
    <>
      <DocumentViewer options={options}></DocumentViewer>
    </>
  );
}

export default App;
