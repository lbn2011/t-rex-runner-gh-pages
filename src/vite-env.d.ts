/// <reference types="svelte" />
/// <reference types="vite/client" />

declare module '*.svelte' {
  import type { SvelteComponent } from 'svelte';
  const Component: typeof SvelteComponent;
  export default Component;
}
