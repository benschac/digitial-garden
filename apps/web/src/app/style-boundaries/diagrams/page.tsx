import { notFound } from "next/navigation";

import { DiagramFixture } from "./fixture";

const DiagramFixturePage = () => {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <DiagramFixture />;
};

export default DiagramFixturePage;
