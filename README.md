# Portfolio (React + Vite)

Horizontal project gallery for a personal portfolio. Replace placeholder images and links with your real projects.

## Run

Development server:

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Add your projects

- Put screenshots in `public/projects/` (any image format). Example: `public/projects/my-app.png`.
- Edit `src/pages/Portfolio.jsx` and update the `projects` array:
  - `title`: display name
  - `image`: path starting with `/projects/...`
  - `href`: URL to the live demo or repo

The gallery scrolls horizontally with scroll-snap and works on touch and trackpads. Use Shift + mouse wheel to scroll sideways with a mouse.
