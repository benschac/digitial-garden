import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Eyebrow } from "../components/eyebrow";
import { PageNavigation } from "../components/page-navigation";

const meta = {
  title: "Shared UI/Page chrome",
  component: PageNavigation,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof PageNavigation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithContext: Story = {
  render: () => (
    <div className="max-w-3xl bg-background p-6 text-foreground">
      <PageNavigation aria-label="Experiment" className="text-muted-foreground">
        <a
          href="#workbench"
          className="text-inherit no-underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          ← Workbench
        </a>
        <span>Experiment 002</span>
      </PageNavigation>
      <header className="pt-16">
        <Eyebrow className="mb-4 text-primary">
          TypeScript · Rust/WASM · Canvas
        </Eyebrow>
        <h1 className="text-3xl">Same field. Two runtimes.</h1>
      </header>
    </div>
  ),
};

export const TwoLinks: Story = {
  args: {
    "aria-label": "Related experiments",
    children: (
      <>
        <a className="text-inherit no-underline" href="#workbench">
          ← Workbench
        </a>
        <a className="text-inherit no-underline" href="#typegpu">
          TypeGPU copy →
        </a>
      </>
    ),
  },
};

export const CallerOverrides: Story = {
  render: () => (
    <div className="space-y-6">
      <PageNavigation className="flex-col items-start gap-3 normal-case">
        <a className="text-inherit no-underline" href="#workbench">
          ← Workbench
        </a>
        <a className="text-inherit no-underline" href="#typegpu">
          TypeGPU copy →
        </a>
      </PageNavigation>
      <Eyebrow className="mb-0 font-sans text-sm tracking-normal normal-case">
        A label with caller typography
      </Eyebrow>
    </div>
  ),
};
