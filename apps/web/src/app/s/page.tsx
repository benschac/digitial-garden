import { AgentChat } from "@/app/_components/agent-chat";
import { PageTransition } from "@/app/_components/page-transition";

const NewSessionPage = () => (
  <PageTransition>
    <AgentChat sessionless />
  </PageTransition>
);

export default NewSessionPage;
