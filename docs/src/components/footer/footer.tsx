import { component$, Host, useStyles$ } from '@builder.io/qwik';
import styles from './footer.css?inline';

export default component$(
  () => {
    useStyles$(styles);

    return (
      <Host>
        <ul>
          <li>
            <a class="footer-home" href="/">
              Home
            </a>
          </li>
        </ul>
      </Host>
    );
  },
  {
    tagName: 'footer',
  }
);
