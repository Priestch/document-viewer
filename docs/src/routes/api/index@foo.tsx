import { component$, Host, useClientEffect$, useStore } from '@builder.io/qwik';

export default component$(() => {
  const store = useStore({ timestamp: ''});

  useClientEffect$(async () => {
    const url = `/api/builder.io/oss.json`;
    const rsp = await fetch(url);
    const data: any = await rsp.json();

    store.timestamp = data.timestamp;
  });

  return (
    <Host>
      <h1>Qwik City Test API!</h1>

      <ul>
        <li>
          <a href="/api/builder.io/oss.json">/api/[org]/[user].json</a>
        </li>
        <li>
          <a href="/api/data.json">/api/data.json</a>
        </li>
      </ul>

      <p>Timestamp: {store.timestamp}</p>
    </Host>
  );
});
