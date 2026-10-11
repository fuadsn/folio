import { requireChatGPTUser } from "./chatgpt-auth";
import DraftExplorer from "./draft-explorer";
export const dynamic = "force-dynamic";
export default async function Home() {
  await requireChatGPTUser("/");
  return <DraftExplorer />;
}
