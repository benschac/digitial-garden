import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { Button } from "./button-example";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  argTypes: { backgroundColor: { control: "color" } },
  args: { onClick: fn() },
  component: Button,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  title: "Example/Button",
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Primary: Story = {
  args: {
    label: "Button",
    primary: true,
  },
};

export const Secondary: Story = {
  args: {
    label: "Button",
  },
};

export const Large: Story = {
  args: {
    label: "Button",
    size: "large",
  },
};

export const Small: Story = {
  args: {
    label: "Button",
    size: "small",
  },
};
