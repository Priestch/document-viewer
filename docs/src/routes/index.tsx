import { component$, Host } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';

export default component$(() => {
  return (
    <Host>
      <h1 onClick$={() => console.warn('hola')}>Welcome to Document Viewer!</h1>

      <p>An out-of-the-box PDF document viewer.</p>
    </Host>
  );
});

export const head: DocumentHead = {
  title: 'Welcome to Document Viewer',
};
