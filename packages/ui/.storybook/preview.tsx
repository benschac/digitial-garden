import type { Preview } from "@storybook/nextjs-vite";
import "./preview.css";

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "UI color theme",
      toolbar: {
        icon: "circlehollow",
        items: ["light", "dark", "system"],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light" },
  decorators: [
    (Story, context) => (
      <div data-ui-theme={context.globals.theme} className="p-6 font-sans">
        <Story />
      </div>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
