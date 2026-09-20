import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { CSSProperties } from "react";
import { Heading, Text, Typography } from "../components/typography";

const meta = {
  title: "Editorial/Typography",
  component: Heading,
  subcomponents: { Text },
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Shared editorial type styles. The web app owns font loading and preferences; these stories use serif fallbacks. Heading level and visual variant are independent. Spacing and reading measure belong to the caller.",
      },
    },
  },
  tags: ["autodocs"],
  args: { as: "h2", variant: "section", children: "Selected work" },
  argTypes: {
    as: { control: "select", options: ["h1", "h2", "h3", "h4", "h5", "h6"] },
    variant: {
      control: "select",
      options: [
        "display",
        "section",
        "sectionSidebar",
        "feature",
        "item",
        "subtitle",
        "subtitleItalic",
      ],
    },
  },
  decorators: [
    (Story) => (
      <div className="bg-paper p-6 text-ink">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Heading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const HeadingStyles: Story = {
  render: () => (
    <div className="grid gap-8">
      <Heading as="h1" variant="display" className="max-w-[9ch]">
        Benjamin Schachter
      </Heading>
      <Heading variant="subtitle">Looking for my next role</Heading>
      <Heading variant="section">Speaking</Heading>
      <Heading as="h3" variant="feature">
        Emit Once, Notify Anywhere
      </Heading>
      <Heading as="h3" variant="item">
        Treasure It
      </Heading>
    </div>
  ),
};

export const ParagraphStyles: Story = {
  render: () => (
    <div className="grid max-w-[36ch] gap-4">
      <Text variant="metadata">App.js Conf · 2026</Text>
      <Text>A second life for good things in your neighborhood.</Text>
      <Text variant="small">Founder / Software Engineer</Text>
      <Text variant="caption">March 2025 – Present</Text>
    </div>
  ),
};

export const CallerOverrides: Story = {
  render: () => (
    <div className="grid gap-4">
      <Heading as="h3" variant="section" className="text-xl not-italic">
        The caller controls the level and can override the style
      </Heading>
      <Text variant="metadata" className="text-sm tracking-normal normal-case">
        Metadata without uppercase or tracking.
      </Text>
    </div>
  ),
};

export const FontRoles: Story = {
  render: () => (
    <div
      className="grid gap-4"
      style={
        {
          "--font-editorial-display": "Palatino, serif",
          "--font-editorial-reading": "Georgia, serif",
        } as CSSProperties
      }
    >
      <Heading variant="feature">Fonts come from the consumer</Heading>
      <Text>
        The same components follow the active editorial font variables.
      </Text>
    </div>
  ),
};

export const SharedRoles: Story = {
  render: () => (
    <div className="grid max-w-[65ch] gap-8">
      <div className="grid gap-2">
        <Typography as="h2" variant="uiLabel">
          Workbench controls
        </Typography>
        <Typography as="p" variant="uiBody">
          Choose an option to continue.
        </Typography>
        <Typography as="p" variant="uiCaption">
          Supporting information
        </Typography>
        <Typography as="code" variant="code">
          const speed = 16;
        </Typography>
      </div>
    </div>
  ),
};
