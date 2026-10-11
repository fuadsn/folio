import { requireChatGPTUser } from "../chatgpt-auth";
import Studio from "../studio";
export const dynamic = "force-dynamic";
export default async function Editor() {
  await requireChatGPTUser("/editor");
  return <Studio />;
}
