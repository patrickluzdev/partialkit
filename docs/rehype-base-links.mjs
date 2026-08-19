/**
 * Prefixes root-absolute links in content with the site base.
 *
 * Starlight resolves the base for everything it generates, but a link written by
 * hand in Markdown or MDX is emitted verbatim — which 404s wherever the site is
 * not served from the domain root.
 */
export function rehypeBaseLinks({ base = "/" } = {}) {
  const prefix = base.replace(/\/+$/, "");

  return () => (tree) => {
    if (!prefix) return;
    walk(tree, prefix);
  };
}

function walk(node, prefix) {
  if (node.type === "element" && node.properties) {
    for (const attribute of ["href", "src"]) {
      const value = node.properties[attribute];
      if (
        typeof value === "string" &&
        value.startsWith("/") &&
        !value.startsWith("//") &&
        !(value === prefix || value.startsWith(`${prefix}/`))
      ) {
        node.properties[attribute] = prefix + value;
      }
    }
  }

  for (const child of node.children ?? []) walk(child, prefix);
}
