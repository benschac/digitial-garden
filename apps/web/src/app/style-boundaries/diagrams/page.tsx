import { notFound } from "next/navigation";
import { DiagramFixture } from "./fixture";

export default function DiagramFixturePage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <DiagramFixture />;
}
