import type { Preview } from "@storybook/nextjs-vite";

import "./preview.css";

const preview: Preview = {
  decorators: [
    (Story, context) => (
      <div data-ui-theme={context.globals.theme} className="p-6 font-sans">
        <Story />
      </div>
    ),
  ],
  globalTypes: {
    theme: {
      description: "UI color theme",
      toolbar: {
        dynamicTitle: true,
        icon: "circlehollow",
        items: ["light", "dark", "system"],
      },
    },
  },
  initialGlobals: { theme: "light" },
  parameters: {
    controls: {
      matchers: {
        color: /(?:background|color)$/iu,
        date: /Date$/iu,
      },
    },
  },
};

export default preview;
