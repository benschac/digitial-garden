import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { cn } from "../lib/utils";

const palette = [
  { name: "Paper", token: "--color-paper", className: "bg-paper" },
  { name: "Ink", token: "--color-ink", className: "bg-ink" },
  {
    name: "Supporting text",
    token: "--color-editorial-muted",
    className: "bg-editorial-muted",
  },
  { name: "Selection", token: "--color-selection", className: "bg-selection" },
];

function EditorialPalette() {
  return (
    <section
      aria-label="Editorial palette"
      className={cn(
        "grid max-w-3xl gap-6 p-6",
        "bg-paper text-ink selection:bg-selection",
      )}
    >
      <header className="space-y-2">
        <h1 className="text-2xl">Editorial palette</h1>
        <p className="text-editorial-muted">
          Shared by home, blog, and Playground. This palette stays light when
          the application UI theme changes.
        </p>
      </header>
      <ul className="grid gap-6 sm:grid-cols-2">
        {palette.map(({ name, token, className }) => (
          <li key={token} className="grid gap-2">
            <div
              aria-hidden="true"
              className={cn("h-16 border border-ink/18", className)}
            />
            <h2 className="font-medium">{name}</h2>
            <code className="text-sm text-editorial-muted">{token}</code>
          </li>
        ))}
      </ul>
      <p className="border-t border-ink/18 pt-6 text-sm text-editorial-muted">
        This is a color reference. Production typography, font preferences, and
        page compositions are reviewed in the web app; this story uses the
        shared system sans-serif font.
      </p>
    </section>
  );
}

const meta = {
  title: "Editorial/Palette",
  component: EditorialPalette,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof EditorialPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Colors: Story = {};

export const AlongsideDarkUI: Story = {
  globals: { theme: "dark" },
};
