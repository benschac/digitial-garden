import { notFound } from "next/navigation";

import { StyleBoundaryFixture } from "./style-boundary-fixture";

/** Development-only integration surface; never linked from the public site. */
const StyleBoundariesPage = () => {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <StyleBoundaryFixture />;
};

export default StyleBoundariesPage;
