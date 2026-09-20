import { AgentChat } from "@/app/_components/agent-chat";
import { PageTransition } from "@/app/_components/page-transition";

export default async function SessionPage({
  params,
}: {
  readonly params: Promise<{ readonly sessionId: string }>;
}) {
  const { sessionId } = await params;
  return (
    <PageTransition key={sessionId} name="chat-page">
      <AgentChat sessionId={sessionId} />
    </PageTransition>
  );
}
