"use client";

import { useAbortController } from "@personal-site/react-hooks";
import { cn } from "@personal-site/ui/lib/utils";
import { bind, play, setEnabled, setVolume, unlock } from "cuelume";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const storageKey = "interaction-sounds-enabled";

function savePreference(enabled: boolean) {
  try {
    localStorage.setItem(storageKey, String(enabled));
  } catch {
    return;
  }
}

export function InteractionSounds() {
  const pathname = usePathname();
  const isChat = pathname === "/s" || pathname.startsWith("/s/");
  const [enabled, setSoundEnabled] = useState(true);
  const [pending, setPending] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const createController = useAbortController();

  useEffect(() => {
    let initialEnabled: boolean;
    try {
      initialEnabled = localStorage.getItem(storageKey) !== "false";
    } catch {
      initialEnabled = true;
    }
    setSoundEnabled(initialEnabled);
    setEnabled(initialEnabled);
    setVolume(0.25);
    const unbind = bind();
    return () => {
      unbind();
      setEnabled(false);
    };
  }, []);

  async function toggleSound() {
    if (enabled) {
      setEnabled(false);
      setSoundEnabled(false);
      savePreference(false);
      return;
    }

    const { signal } = createController();
    setPending(true);
    setEnabled(true);
    const available = await unlock();
    if (signal.aborted) return;
    setEnabled(available);
    setSoundEnabled(available);
    setUnavailable(!available);
    setPending(false);
    savePreference(available);
    if (available) play("toggle", { emphasis: "subtle" });
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-3",
        isChat ? "fixed top-2 left-4 z-30" : "px-6 py-4",
      )}
    >
      <output className="text-sm text-ink">
        {unavailable ? "Sound is unavailable in this browser." : ""}
      </output>
      <button
        type="button"
        aria-label="Interaction sounds"
        aria-pressed={enabled}
        disabled={pending}
        onClick={() => void toggleSound()}
        className={cn(
          "inline-flex min-h-11 min-w-11 items-center px-3 py-2",
          "rounded border border-current bg-paper text-sm text-ink",
          "cursor-pointer disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-offset-4",
        )}
      >
        Sound: {enabled ? "on" : "off"}
      </button>
    </div>
  );
}
