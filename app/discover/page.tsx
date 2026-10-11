import { Box, ArrowLeft } from "lucide-react";
import WorldDirectory from "../world-directory";

export default function DiscoverPage() {
  return (
    <main className="discovery-page">
      <header className="discovery-header">
        <a className="brand" href="/">
          <Box size={22} /> worldfolio{" "}
          <span className="studio-badge">WORLDS</span>
        </a>
        <a className="button" href="/editor">
          <ArrowLeft size={15} /> My studio
        </a>
      </header>
      <WorldDirectory />
    </main>
  );
}
