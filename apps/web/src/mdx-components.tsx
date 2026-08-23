import type { MDXComponents } from "mdx/types";
import Image from "next/image";
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { BezierPlayground } from "./components/mdx/bezier-playground";
import { Callout } from "./components/mdx/callout";

function MdxLink({ href = "", ...props }: ComponentPropsWithoutRef<"a">) {
  if (href.startsWith("/")) {
    return <Link href={href} {...props} />;
  }

  const opensNewTab = props.target === "_blank";
  return (
    <a
      {...props}
      href={href}
      rel={opensNewTab ? "noopener noreferrer" : props.rel}
    />
  );
}

function MdxImage({
  alt = "",
  src = "",
  title,
}: ComponentPropsWithoutRef<"img">) {
  if (
    typeof src !== "string" ||
    (!src.startsWith("/") && !src.startsWith("https://"))
  ) {
    throw new Error(
      "Markdown images must use repository-local /public paths or HTTPS URLs.",
    );
  }

  return (
    <Image
      alt={alt}
      height={675}
      sizes="(max-width: 760px) 100vw, 720px"
      src={src}
      title={title}
      width={1200}
    />
  );
}

const components = {
  a: MdxLink,
  img: MdxImage,
  BezierPlayground,
  Callout,
} satisfies MDXComponents;

export function useMDXComponents(): MDXComponents {
  return components;
}
