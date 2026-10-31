"use client";

import { Button } from "@personal-site/ui/components/button";
import { Typography } from "@personal-site/ui/components/typography";
import { cn } from "@personal-site/ui/lib/utils";
import type { UserContent } from "ai";
import type {
  ConversationState,
  EveAgentStoreSnapshot,
  SendTurnOptions,
} from "eve/client";
import { AlertCircleIcon, BrainIcon, PlusIcon, SquareIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { FormEvent } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ConversationTopFade,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputTextarea,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import type {
  PromptInputSubmissionContext,
  PromptInputSubmissionOutcome,
} from "@/components/ai-elements/prompt-input-attachments";
import { Shimmer } from "@/components/ai-elements/shimmer";

import { createAgentChatSubmission } from "./agent-chat-submission";
import { AgentMessage } from "./agent-message";

const AGENT_NAME = "Workbench analyst";

const getLatestTurnFailure = (
  events: EveAgentStoreSnapshot<ConversationState>["events"]
): string | undefined => {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];

    if (event.type === "turn.failed") {
      return event.data.code === "MODEL_CALL_FAILED"
        ? "The model is temporarily unavailable. Please try again."
        : event.data.message;
    }

    if (event.type === "turn.completed" || event.type === "turn.cancelled") {
      return undefined;
    }

    if (event.type === "message.received") {
      return undefined;
    }
  }

  return undefined;
};

const ComposerAction = ({
  hasInputText,
  isBusy,
  isResuming,
  onCancel,
}: {
  readonly hasInputText: boolean;
  readonly isBusy: boolean;
  readonly isResuming: boolean;
  readonly onCancel: () => void;
}) => {
  const attachments = usePromptInputAttachments();
  const canSubmit = hasInputText || attachments.files.length > 0;

  if (!isBusy || canSubmit) {
    return <PromptInputSubmit disabled={isResuming} />;
  }

  return (
    <PromptInputButton
      aria-label="Stop"
      className="absolute right-2.5 bottom-2.5"
      onClick={onCancel}
      variant="outline"
    >
      <SquareIcon className="size-3 fill-current" />
    </PromptInputButton>
  );
};

const ChatHeader = ({
  canStartNewChat,
}: {
  readonly canStartNewChat: boolean;
}) => (
  <header className="pointer-events-none fixed top-0 right-0 left-0 z-20 h-14">
    <div className="relative mx-auto flex h-full w-full max-w-3xl items-center justify-center bg-background px-24">
      <Typography
        as="span"
        variant="uiBody"
        className="truncate text-muted-foreground"
      >
        {AGENT_NAME}
      </Typography>
      {canStartNewChat ? (
        <Button
          aria-label="Start a new chat"
          className="pointer-events-auto fixed top-3 right-6 pr-4"
          onClick={() => window.location.assign("/s")}
          size="sm"
          type="button"
          variant="ghost"
        >
          <PlusIcon className="size-4" />
          <Typography
            as="span"
            variant="uiBodyNormal"
            className="hidden sm:inline"
          >
            New chat
          </Typography>
        </Button>
      ) : null}
    </div>
  </header>
);

const PendingThinking = () => (
  <Message aria-live="polite" from="assistant">
    <MessageContent>
      <Typography
        as="div"
        variant="uiBody"
        className="mb-4 flex w-full items-center gap-2 text-muted-foreground"
      >
        <BrainIcon className="size-4" />
        <Shimmer duration={1}>Thinking</Shimmer>
      </Typography>
    </MessageContent>
  </Message>
);

const ErrorMessage = ({ message }: { readonly message: string }) => (
  <Message className="max-w-full" from="assistant">
    <MessageContent>
      <Typography
        as="div"
        variant="uiBody"
        className="flex w-full items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5"
        role="alert"
      >
        <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div>
          <Typography as="p" variant="medium">
            Request failed
          </Typography>
          <p className="mt-0.5 text-muted-foreground">{message}</p>
        </div>
      </Typography>
    </MessageContent>
  </Message>
);

interface ConversationPresentation {
  agent: EveAgentStoreSnapshot<ConversationState> & {
    status: EveAgentStoreSnapshot<ConversationState>["status"] | "resuming";
  };
  sessionless: boolean;
  cancellationError: string | undefined;
  submissionError: string | undefined;
  sessionId: string | undefined;
}

const conversationPresentation = ({
  agent,
  sessionless,
  cancellationError,
  submissionError,
  sessionId,
}: ConversationPresentation) => {
  const isBusy = agent.status === "submitted" || agent.status === "streaming";
  const isResuming = agent.status === "resuming";
  const isEmpty = agent.data.messages.length === 0;
  const lastMessage = agent.data.messages.at(-1);

  const isPendingAssistantShell =
    lastMessage?.role === "assistant" &&
    lastMessage.parts.every((part) => part.type === "step-start");

  const showPendingThinking =
    isBusy &&
    (agent.status === "submitted" ||
      lastMessage?.role !== "assistant" ||
      isPendingAssistantShell);

  const turnFailure =
    isBusy || isResuming ? undefined : getLatestTurnFailure(agent.events);

  const errorMessage =
    cancellationError ?? submissionError ?? agent.error?.message ?? turnFailure;

  const hasConversationContent =
    sessionless || !isEmpty || errorMessage !== undefined;

  const showConversationLayout = isResuming || hasConversationContent;
  const activeSessionId = sessionId ?? agent.session?.sessionId;

  return {
    activeSessionId,
    errorMessage,
    isBusy,
    isEmpty,
    isPendingAssistantShell,
    isResuming,
    lastMessage,
    showConversationLayout,
    showPendingThinking,
  };
};

export const AgentChat = ({
  sessionId,
  sessionless = false,
}: {
  readonly sessionId?: string;
  readonly sessionless?: boolean;
}) => {
  const [cancellationError, setCancellationError] = useState<string>();
  const [submissionError, setSubmissionError] = useState<string>();
  const [hasInputText, setHasInputText] = useState(false);

  const submission = useMemo(
    () =>
      createAgentChatSubmission({
        initialSession:
          sessionId === undefined
            ? undefined
            : {
                sessionId,
                streamIndex: 0,
              },
      }),
    [sessionId]
  );

  const { store } = submission;

  const subscribe = useCallback(
    (notify: () => void) => store.subscribe(notify),
    [store]
  );

  const getSnapshot = useCallback(() => store.snapshot, [store]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [resuming, setResuming] = useState(sessionId !== undefined);
  store.setCallbacks({
    onSessionChange(session) {
      if (sessionId === undefined && session !== undefined) {
        // Next patches window.history to navigate, which would detach the active stream.
        History.prototype.replaceState.call(
          window.history,
          window.history.state,
          "",
          `/s/${encodeURIComponent(session.sessionId)}`
        );
      }
    },
  });
  useEffect(() => submission.mount(() => setResuming(false)), [submission]);

  const agent = {
    ...snapshot,
    status:
      resuming && snapshot.status === "ready" ? "resuming" : snapshot.status,
  };

  const {
    isBusy,
    isResuming,
    isEmpty,
    lastMessage,
    isPendingAssistantShell,
    showPendingThinking,
    errorMessage,
    showConversationLayout,
    activeSessionId,
  } = conversationPresentation({
    agent,
    cancellationError,
    sessionId,
    sessionless,
    submissionError,
  });

  const requestCancellation = async () => {
    setCancellationError(undefined);

    try {
      await store.cancel();
    } catch (error) {
      setCancellationError(
        error instanceof Error
          ? error.message
          : "Unable to cancel the response."
      );
    }
  };

  const handleSubmit = (
    message: PromptInputMessage,
    _event: FormEvent<HTMLFormElement>,
    context: PromptInputSubmissionContext
  ): Promise<PromptInputSubmissionOutcome> => {
    const text = message.text.trim();

    if ((text.length === 0 && message.files.length === 0) || isResuming) {
      return Promise.resolve({ status: "cancelled" });
    }

    setSubmissionError(undefined);
    setCancellationError(undefined);

    const options: SendTurnOptions = {
      signal: context.signal,
      turnPolicy: isBusy ? "steer" : undefined,
    };

    if (message.files.length === 0) {
      return submission.send(text, options);
    }

    const parts: UserContent = [];

    if (text.length > 0) {
      parts.push({ text, type: "text" });
    }

    for (const file of message.files) {
      parts.push({
        data: file.url,
        filename: file.filename,
        mediaType: file.mediaType,
        type: "file",
      });
    }

    return submission.send(parts, options);
  };

  const composer = (
    <PromptInput
      onSubmit={handleSubmit}
      onError={(error) => setSubmissionError(error.message)}
      onReset={() => setHasInputText(false)}
    >
      <PromptInputTextarea
        disabled={isResuming}
        onChange={(event) =>
          setHasInputText(event.currentTarget.value.trim().length > 0)
        }
        placeholder="Send a message…"
      />
      <ComposerAction
        hasInputText={hasInputText}
        isBusy={isBusy}
        isResuming={isResuming}
        onCancel={requestCancellation}
      />
    </PromptInput>
  );

  return (
    <main
      data-ui-theme="system"
      className="flex h-dvh flex-col overflow-hidden bg-background text-foreground"
    >
      {showConversationLayout ? (
        <ChatHeader canStartNewChat={activeSessionId !== undefined} />
      ) : null}

      {showConversationLayout ? (
        <Conversation
          className="min-h-0 flex-1"
          initial={sessionId === undefined ? undefined : false}
          resize={activeSessionId === undefined ? "smooth" : "instant"}
          scrollRestorationKey={
            isEmpty || activeSessionId === undefined
              ? undefined
              : `eve:web-chat-scroll:${activeSessionId}`
          }
        >
          <ConversationTopFade className="top-14" />
          <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 pt-20 pb-36 sm:px-6">
            {agent.data.messages.map((message, index) =>
              showPendingThinking &&
              isPendingAssistantShell &&
              message.id === lastMessage?.id ? null : (
                <AgentMessage
                  canRespond={!isBusy && !isResuming}
                  isStreaming={
                    agent.status === "streaming" &&
                    index === agent.data.messages.length - 1
                  }
                  key={message.id}
                  message={message}
                  onInputResponses={(inputResponses) => {
                    setCancellationError(undefined);

                    return store.send({ inputResponses });
                  }}
                />
              )
            )}
            {showPendingThinking ? <PendingThinking /> : null}
            {errorMessage ? <ErrorMessage message={errorMessage} /> : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      ) : null}

      <div
        className={cn(
          "mx-auto w-full px-4 sm:px-6",
          showConversationLayout
            ? "fixed bottom-0 left-1/2 z-20 max-w-3xl -translate-x-1/2 bg-gradient-to-t from-background via-background to-transparent pt-4 pb-6"
            : "flex max-w-xl flex-1 flex-col items-center justify-center gap-8 pb-[10vh]"
        )}
      >
        {showConversationLayout ? null : (
          <div className="flex flex-col items-center gap-3 text-center">
            <Typography as="h1" variant="uiTitle">
              {AGENT_NAME}
            </Typography>
          </div>
        )}
        <div className="w-full">{composer}</div>
      </div>
    </main>
  );
};
