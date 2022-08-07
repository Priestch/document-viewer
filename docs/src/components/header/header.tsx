import { component$, Host, useStyles$ } from '@builder.io/qwik';
import { useLocation } from '@builder.io/qwik-city';
import styles from './header.css?inline';

export default component$(
  () => {
    useStyles$(styles);

    const pathname = useLocation().pathname;

    return (
      <Host>
        <div class="header-inner">
          <section class="logo">
            <a href="/">Document Viewer</a>
          </section>
          <nav>
            <a href="/guides" class={{ active: pathname.startsWith('/guides') }}>
              Guides
            </a>
          </nav>
        </div>
      </Host>
    );
  },
  {
    tagName: 'header',
  }
);
