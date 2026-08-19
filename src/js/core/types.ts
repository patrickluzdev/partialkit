export type Cleanup = () => void;

export interface Component {
  /** Unique name, also used to mark an element as mounted. */
  readonly name: string;
  /** CSS selector matched against added nodes. */
  readonly selector: string;
  /** Runs once per matching element. Return a cleanup to run when the element leaves the DOM. */
  mount(element: HTMLElement): Cleanup | void;
  /** Runs once when the component is registered. Use it for document-level delegation. */
  setup?(): Cleanup | void;
}

export interface StartOptions {
  /** Subtree to scan and observe. Defaults to `document.body`. */
  root?: ParentNode & Node;
}
