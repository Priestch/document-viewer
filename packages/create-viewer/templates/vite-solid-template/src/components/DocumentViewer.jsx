import { createViewerApp } from "@document-kits/viewer";
import "@document-kits/viewer/viewer.css";

function DocumentView(props) {
  function createViewer(el) {
    createViewerApp({ parent: el, ...props.options });
  }

  const style = {
    height: "100%",
  };
  return (
    <>
      <div class="document-viewer" ref={createViewer} style={style}></div>
    </>
  );
}

export default DocumentView;
