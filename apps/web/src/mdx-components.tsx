import type { MDXComponents } from "mdx/types";
import Image from "next/image";
import Link from "next/link";
import { type ComponentPropsWithoutRef, isValidElement } from "react";
import { Callout } from "./components/mdx/callout";

function MdxLink({ href = "", ...props }: ComponentPropsWithoutRef<"a">) {
  if (href.startsWith("/")) {
    return <Link href={href} transitionTypes={["nav-lateral"]} {...props} />;
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

export function MdxImage({
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
    <figure data-mdx-media>
      <Image
        alt={alt}
        height={675}
        sizes="(max-width: 672px) calc(100vw - 2rem), (max-width: 900px) 90vw, 768px"
        src={src}
        title={title}
        width={1200}
      />
      {title ? <figcaption>{title}</figcaption> : null}
    </figure>
  );
}

export function MdxParagraph({
  children,
  ...props
}: ComponentPropsWithoutRef<"p">) {
  if (isValidElement(children) && children.type === MdxImage) {
    return children;
  }

  return <p {...props}>{children}</p>;
}

const components = {
  a: MdxLink,
  img: MdxImage,
  p: MdxParagraph,
  Callout,
} satisfies MDXComponents;

export function useMDXComponents(): MDXComponents {
  return components;
}
