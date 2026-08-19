import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// GitHub Pages serves the project under /partialkit; local runs stay at the root.
const base = process.env.PAGES_BASE ?? "/";

export default defineConfig({
  site: "https://patrickluzdev.github.io",
  base,
  // Bind IPv4 explicitly: the default resolves to ::1 only on Windows.
  server: { host: "127.0.0.1", port: 4321 },
  vite: { plugins: [tailwindcss()] },
  integrations: [
    starlight({
      title: "partialkit",
      description:
        "shadcn-inspired UI components for plain HTML. Tailwind CSS classes plus a small ESM runtime, for any project that writes HTML.",
      social: [
        { icon: "github", label: "GitHub", href: "https://github.com/patrickluzdev/partialkit" },
      ],
      customCss: ["./src/styles/docs.css"],
      editLink: {
        baseUrl: "https://github.com/patrickluzdev/partialkit/edit/main/docs/",
      },
      head: [
        {
          // Starlight tracks the theme on data-theme; partialkit reads the dark class.
          tag: "script",
          content: `(() => {
            const root = document.documentElement;
            const sync = () => root.classList.toggle("dark", root.dataset.theme === "dark");
            sync();
            new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
          })();`,
        },
      ],
      sidebar: [
        {
          label: "Start here",
          items: [
            { label: "Introduction", link: "/" },
            { label: "Installation", slug: "installation" },
          ],
        },
        {
          label: "Guides",
          items: [
            { label: "Theming", slug: "guides/theming" },
            { label: "Accessibility", slug: "guides/accessibility" },
            { label: "Dynamic HTML", slug: "guides/dynamic-html" },
            { label: "JavaScript API", slug: "guides/javascript-api" },
          ],
        },
        {
          label: "Components",
          items: [{ autogenerate: { directory: "components" } }],
        },
      ],
    }),
  ],
});
