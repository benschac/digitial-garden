"use client";

import { useAbortController } from "@personal-site/react-hooks";
import { cn } from "@personal-site/ui/lib/utils";
import { bind, play, setEnabled, setVolume, unlock } from "cuelume";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

const storageKey = "interaction-sounds-enabled";

const savePreference = (enabled: boolean) => {
  try {
    localStorage.setItem(storageKey, String(enabled));

    return true;
  } catch {
    return false;
  }
};

const readSoundPreference = () => {
  try {
    return localStorage.getItem(storageKey) !== "false";
  } catch {
    return true;
  }
};

const subscribeToSoundPreference = (listener: () => void) => {
  window.addEventListener("storage", listener);

  return () => window.removeEventListener("storage", listener);
};

export const InteractionSounds = () => {
  const pathname = usePathname();
  const isChat = pathname === "/s" || pathname.startsWith("/s/");
  const [selectedPreference, setSelectedPreference] = useState<boolean>();

  const storedPreference = useSyncExternalStore(
    subscribeToSoundPreference,
    readSoundPreference,
    () => true
  );

  const enabledPreference = selectedPreference ?? storedPreference;
  const [pending, setPending] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const createController = useAbortController();

  useEffect(() => {
    setEnabled(enabledPreference);
  }, [enabledPreference]);

  useEffect(() => {
    setVolume(0.25);
    const unbind = bind();

    return () => {
      unbind();
      setEnabled(false);
    };
  }, []);

  const toggleSound = async () => {
    if (enabledPreference) {
      setEnabled(false);
      setSelectedPreference(false);
      savePreference(false);

      return;
    }

    const { signal } = createController();
    setPending(true);
    setEnabled(true);
    const available = await unlock();

    if (signal.aborted) {
      return;
    }

    setEnabled(available);
    setSelectedPreference(available);
    setUnavailable(!available);
    setPending(false);
    savePreference(available);

    if (available) {
      play("toggle", { emphasis: "subtle" });
    }
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-3",
        isChat ? "fixed top-2 left-4 z-30" : "px-6 py-4"
      )}
    >
      <output className="text-sm text-ink">
        {unavailable ? "Sound is unavailable in this browser." : ""}
      </output>
      <button
        type="button"
        aria-label="Interaction sounds"
        aria-pressed={enabledPreference}
        disabled={pending}
        onClick={toggleSound}
        className={cn(
          "inline-flex min-h-11 min-w-11 items-center px-3 py-2",
          "rounded border border-current bg-paper text-sm text-ink",
          "cursor-pointer disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-offset-4"
        )}
      >
        Sound: {enabledPreference ? "on" : "off"}
      </button>
    </div>
  );
};
