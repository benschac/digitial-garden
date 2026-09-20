import { AgentChat } from "@/app/_components/agent-chat";
import { PageTransition } from "@/app/_components/page-transition";

export default function NewSessionPage() {
  return (
    <PageTransition>
      <AgentChat sessionless />
    </PageTransition>
  );
}
