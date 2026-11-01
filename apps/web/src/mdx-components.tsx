import { Typography } from "@personal-site/ui/components/typography";
import { Predicate } from "effect";
import type { MDXComponents } from "mdx/types";
import Image from "next/image";
import Link from "next/link";
import { Children, cloneElement, isValidElement } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { AnimatedDiagram } from "./components/mdx/animated-diagram";
import { Callout } from "./components/mdx/callout";
import { ComingSoon } from "./components/mdx/coming-soon";
import { EffectWalkthrough } from "./components/mdx/effect-walkthrough";
import { MermaidDiagram } from "./components/mdx/mermaid-diagram";

export const MdxLink = ({
  href = "",
  children,
  ...props
}: ComponentPropsWithoutRef<"a">) => {
  if (href.startsWith("/")) {
    return (
      <Link href={href} transitionTypes={["nav-lateral"]} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <a
      {...props}
      href={href}
      target={props.target}
      rel={`noopener noreferrer ${props.rel ?? ""}`}
    >
      {children}
    </a>
  );
};

export const MdxImage = ({
  alt = "",
  src = "",
  title,
}: ComponentPropsWithoutRef<"img">) => {
  if (
    !Predicate.isString(src) ||
    (!src.startsWith("/") && !src.startsWith("https://"))
  ) {
    throw new Error(
      "Markdown images must use repository-local /public paths or HTTPS URLs."
    );
  }

  return (
    <figure data-mdx-media>
      <Image
        alt={alt}
        height={675}
        sizes="(max-width: 672px) calc(100vw - 2rem), (max-width: 900px) 90vw, 768px"
        src={src}
        title={title}
        width={1200}
      />
      {title ? <Typography as="figcaption">{title}</Typography> : null}
    </figure>
  );
};

export const MdxParagraph = ({
  children,
  ...props
}: ComponentPropsWithoutRef<"p">) => {
  if (isValidElement(children) && children.type === MdxImage) {
    return children;
  }

  return (
    <Typography as="p" {...props}>
      {children}
    </Typography>
  );
};

const tableText = (node: ReactNode): string => {
  if (Predicate.isString(node) || Predicate.isNumber(node)) {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(tableText).join("");
  }

  return isValidElement<{ children?: ReactNode }>(node)
    ? tableText(node.props.children)
    : "";
};

export const MdxTable = ({
  children,
  ...props
}: ComponentPropsWithoutRef<"table">) => {
  const head = Children.toArray(children).find(
    (part) => isValidElement(part) && part.type === "thead"
  );

  const headerRow = isValidElement<{ children?: ReactNode }>(head)
    ? Children.toArray(head.props.children)[0]
    : null;

  const labels = isValidElement<{ children?: ReactNode }>(headerRow)
    ? Children.toArray(headerRow.props.children).map((cell) =>
        isValidElement<{ children?: ReactNode }>(cell) && cell.type === "th"
          ? tableText(cell.props.children)
          : ""
      )
    : [];

  const labeledChildren = Children.map(children, (part) => {
    if (
      !isValidElement<{ children?: ReactNode }>(part) ||
      part.type !== "tbody"
    ) {
      return part;
    }

    return cloneElement(
      part,
      {},
      Children.map(part.props.children, (row) => {
        if (!isValidElement<{ children?: ReactNode }>(row)) {
          return row;
        }

        return cloneElement(
          row,
          {},
          Children.map(row.props.children, (cell, index) =>
            isValidElement<
              ComponentPropsWithoutRef<"td"> & { "data-column-label"?: string }
            >(cell) && labels[index]
              ? cloneElement(cell, { "data-column-label": labels[index] })
              : cell
          )
        );
      })
    );
  });

  return (
    <section
      data-mdx-table
      data-mdx-table-labeled={
        labels.length && labels.every(Boolean) ? "" : undefined
      }
      aria-label="Table"
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Keyboard users need to focus the overflow container to scroll the table.
      tabIndex={0}
    >
      <span data-mdx-table-hint aria-hidden="true">
        Scroll to see all columns →
      </span>
      <table {...props}>{labeledChildren}</table>
    </section>
  );
};

const components = {
  AnimatedDiagram,
  Callout,
  ComingSoon,
  EffectWalkthrough,
  MermaidDiagram,
  a: MdxLink,
  blockquote: (props) => <Typography as="blockquote" {...props} />,
  code: (props) => <Typography as="code" {...props} />,
  em: (props) => <Typography as="em" {...props} />,
  h1: (props) => <Typography as="h1" {...props} />,
  h2: (props) => <Typography as="h2" {...props} />,
  h3: (props) => <Typography as="h3" {...props} />,
  h4: (props) => <Typography as="h4" {...props} />,
  h5: (props) => <Typography as="h5" {...props} />,
  h6: (props) => <Typography as="h6" {...props} />,
  img: MdxImage,
  p: MdxParagraph,
  pre: (props) => <Typography as="pre" {...props} />,
  strong: (props) => <Typography as="strong" {...props} />,
  table: MdxTable,
} satisfies MDXComponents;

export const useMDXComponents = (): MDXComponents => components;
