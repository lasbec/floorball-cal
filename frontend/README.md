# Floorball Calendar Frontend

This package contains the HTMX-driven frontend for the Floorball Calendar.

## Getting started

```bash
npm install
npm run dev
```

The commands above need to be executed inside the `frontend` directory. The
Vite development server loads the base page from `index.html` and serves HTMX
fragments from `public/fragments`.

## Project structure

- `index.html` &mdash; bootstraps the HTMX-enabled shell layout.
- `src/main.ts` &mdash; registers HTMX on the global window object and applies the
  shared styles.
- `public/fragments` &mdash; contains HTML snippets that are fetched dynamically
  via HTMX attributes.
- `src/style.css` &mdash; houses the shared styling for the frontend shell and
  loaded fragments.

You can add new fragments by placing HTML files inside the `public/fragments`
folder and referencing them through `hx-get` attributes.
