import type { Preview } from "@storybook/nextjs-vite";

import "./preview.css";

const preview: Preview = {
  decorators: [
    (Story, context) => {
      const configuredTheme: unknown = context.globals.theme;
      let theme = "system";

      if (configuredTheme === "dark" || configuredTheme === "light") {
        theme = configuredTheme;
      }

      return (
        <div data-ui-theme={theme} className="p-6 font-sans">
          <Story />
        </div>
      );
    },
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
