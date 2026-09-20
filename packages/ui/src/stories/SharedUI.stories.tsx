import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useId } from "react";
import { Button } from "../components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/dialog";
import { Input } from "../components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/select";

function SharedUI() {
  const id = useId();
  return (
    <div className="grid max-w-lg gap-8">
      <section aria-label="Buttons" className="flex flex-wrap gap-3">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Delete</Button>
        <Button disabled>Disabled</Button>
        <Button pressFeedback>Press feedback</Button>
        <Button pressFeedback disabled>
          Disabled press feedback
        </Button>
      </section>
      <section aria-label="Inputs" className="grid gap-4">
        <label htmlFor={`${id}-name`} className="grid gap-2 text-sm">
          Name
          <Input id={`${id}-name`} placeholder="Your name" />
        </label>
        <label htmlFor={`${id}-disabled`} className="grid gap-2 text-sm">
          Unavailable
          <Input id={`${id}-disabled`} disabled placeholder="Disabled input" />
        </label>
        <label htmlFor={`${id}-email`} className="grid gap-2 text-sm">
          Email
          <Input
            id={`${id}-email`}
            aria-invalid="true"
            aria-describedby={`${id}-email-error`}
            defaultValue="invalid"
          />
          <span id={`${id}-email-error`} className="text-destructive">
            Enter a valid email address.
          </span>
        </label>
      </section>
      <Select defaultValue="daily" items={{ daily: "Daily", weekly: "Weekly" }}>
        <SelectTrigger aria-label="Frequency">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="daily">Daily</SelectItem>
          <SelectItem value="weekly">Weekly</SelectItem>
        </SelectContent>
      </Select>
      <Dialog>
        <DialogTrigger render={<Button variant="outline" />}>
          Open dialog
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shared theme preview</DialogTitle>
            <DialogDescription>
              This popup inherits the same theme as its trigger.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </div>
  );
}

const meta = {
  title: "Shared UI/Theme",
  component: SharedUI,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof SharedUI>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const Light: Story = { globals: { theme: "light" } };
export const Dark: Story = { globals: { theme: "dark" } };
export const System: Story = { globals: { theme: "system" } };
