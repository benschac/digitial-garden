import { notFound } from "next/navigation";

import HowIWorkContent from "./content.mdx";

export default function HowIWorkPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return <HowIWorkContent />;
}
