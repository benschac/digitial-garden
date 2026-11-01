import { notFound } from "next/navigation";

import HowIWorkContent from "./content.mdx";

const HowIWorkPage = () => {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <HowIWorkContent />;
};

export default HowIWorkPage;
