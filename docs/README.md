# Qwik docs1 ⚡️

- File based routing and MDX support
- Vite.js tooling.
- Netlify Edge Functions.
- Prettier code formatter.

## Development Builds

### Client only

During development, the index.html is not a result of server-side rendering, but rather the Qwik app is built using client-side JavaScript only. This is ideal for development with Vite and its ability to reload modules quickly and on-demand. However, this mode is only for development and does not showcase "how" Qwik works since JavaScript is required to execute, and Vite imports many development modules for the app to work.

```
npm run dev
```

### Server-side Rendering (SSR) and Client

Server-side rendered index.html, with client-side modules prefetched and loaded by the browser. This can be used to test out server-side rendered content during development, but will be slower than the client-only development builds.

```
npm run dev.ssr
```

## Production Builds

A production build should generate the client and server modules by running both client and server build commands.

```
npm run build
```

### Client Modules

Production build that creates only the client-side modules that are dynamically imported by the browser.

```
npm run build.client
```

### Server Modules

Production build that creates the server-side render (SSR) module that is used by the server to render the HTML.

```
npm run build.ssr
```

## Netlify

This starter site is configured to deploy to [Netlify Edge Functions](https://www.netlify.com/products/edge/), which means it will be rendered at an edge location near to your users.

### Local development

The [Netlify CLI](https://docs.netlify.com/cli/get-started/) can be used to preview a production build locally. To do so: First build your site, then to start a local server, run:

1. Build your site with `netlify build`.
2. Start a local server with `npm run serve`.
   In this project, `npm run serve` uses the `netlify dev` command to spin up a server that can handle Netlify's Edge Functions locally.
3. Visit [http://localhost:8888/](http://localhost:8888/) to check out your site.

### Deployments

You can [deploy your site to Netlify](https://docs.netlify.com/site-deploys/create-deploys/) either via a Git provider integration or through the Netlify CLI. This starter site includes a `netlify.toml` file to configure your build for deployment.

#### Deploying via Git

Once your site has been pushed to your Git provider, you can either link it [in the Netlify UI](https://app.netlify.com/start) or use the CLI. To link your site to a Git provider from the Netlify CLI, run the command:

```shell
netlify link
```

This sets up [continuous deployment](https://docs.netlify.com/site-deploys/create-deploys/#deploy-with-git) for your site's repo. Whenever you push new commits to your repo, Netlify starts the build process..

#### Deploying manually via the CLI

If you wish to deploy from the CLI rather than using Git, you can use the command:

```shell
netlify deploy --build
```

You must use the `--build` flag whenever you deploy. This ensures that the Edge Functions that this starter site relies on are generated and available when you deploy your site.

--------------------

## Related

- [Qwik Docs](https://qwik.builder.io/)
- [Qwik Github](https://github.com/BuilderIO/qwik)
- [@QwikDev](https://twitter.com/QwikDev)
- [Discord](https://qwik.builder.io/chat)
- [Vite](https://vitejs.dev/)
- [Partytown](https://partytown.builder.io/)
- [Mitosis](https://github.com/BuilderIO/mitosis)
- [Builder.io](https://www.builder.io/)
