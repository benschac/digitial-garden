"use client";

import { useAbortController } from "@personal-site/react-hooks";
import type { EffectCallback } from "react";
import { useEffect, useId, useRef, useState } from "react";

import styles from "./mermaid-diagram.module.css";

interface MermaidDiagramProps {
  source: string;
  title: string;
  description: string;
}

interface MountedDiagram {
  destroy?: () => void;
}

const loadPele = async () => await import("pele");

export const MermaidDiagram = ({
  source,
  title,
  description,
}: MermaidDiagramProps) => {
  const host = useRef<HTMLDivElement>(null);
  const id = `mermaid-${useId().replaceAll(/[^a-zA-Z0-9_-]/gu, "")}`;
  const createController = useAbortController();
  const [status, setStatus] = useState("Loading diagram…");

  useEffect((): ReturnType<EffectCallback> => {
    const container = host.current;

    if (!container) {
      return;
    }

    const controller = createController();
    const mounted: MountedDiagram = {};

    const initialize = async (target: HTMLDivElement) => {
      setStatus("Loading diagram…");

      try {
        const { mount } = await loadPele();

        if (controller.signal.aborted) {
          return;
        }

        const diagram = mount(target, source, {
          idPrefix: `${id}-svg`,
          images: false,
          links: false,
          onError: () => {
            if (!controller.signal.aborted) {
              setStatus("Diagram unavailable. Read the description below.");
            }
          },
          onRender: () => {
            if (!controller.signal.aborted) {
              setStatus("");
            }
          },
        });

        mounted.destroy = () => {
          diagram.destroy();
        };

        if (controller.signal.aborted) {
          mounted.destroy();
          target.replaceChildren();
        }
      } catch {
        if (!controller.signal.aborted) {
          setStatus("Diagram unavailable. Read the description below.");
        }
      }
    };

    void initialize(container);

    return () => {
      controller.abort();
      mounted.destroy?.();
      container.replaceChildren();
    };
  }, [source, id, createController]);

  return (
    <figure
      className={styles.figure}
      data-prose-exclude
      data-mdx-interactive
      aria-labelledby={`${id}-title`}
    >
      <div className={styles.title} id={`${id}-title`}>
        {title}
      </div>
      <div
        ref={host}
        className={styles.diagram}
        aria-describedby={`${id}-caption`}
      />
      {status ? <output className={styles.status}>{status}</output> : null}
      <figcaption className={styles.caption} id={`${id}-caption`}>
        {description}
      </figcaption>
    </figure>
  );
};
