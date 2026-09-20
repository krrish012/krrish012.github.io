# Krrish Ajay Katira — Portfolio

Static single-page portfolio. No build step, no dependencies to install — just HTML, CSS, and vanilla JS, with GSAP/ScrollTrigger loaded from a CDN.

## File structure

```
portfolio/
├── index.html     # markup + content
├── style.css       # all styling (design tokens at the top)
├── script.js       # nav, typewriter, scramble effect, matrix rain, GSAP animations
├── about.html     # about page
├── about.css       # styling for the about page
├── about.js       # desktop layout, apps amd GSAP animations
└── README.md
```

## Before you deploy

Search `index.html` for the three `<!-- PLACEHOLDER -->` comments and fill in the real URLs:

1. GitHub profile link (used twice: nav + contact section)
2. LinkedIn profile link (contact section)
3. Email link — use `mailto:you@example.com` (contact section)

## Deploy to GitHub Pages

1. Create a new GitHub repository (e.g. `portfolio`) and push these files to the root of the `main` branch.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`, branch `main`, folder `/ (root)`.
4. Save — your site will be live at `https://<your-username>.github.io/<repo-name>/` within a minute or two.

## Connecting your custom domain

1. Delete the placeholder text in the `CNAME` file and replace it with your domain, e.g. `krrishkatira.com` (no `https://`, no trailing slash).
2. At your domain registrar, add DNS records pointing at GitHub Pages:
   - For an apex domain (`krrishkatira.com`): four `A` records pointing to
     `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - For a `www` subdomain: a `CNAME` record pointing to `<your-username>.github.io`
3. Back in **Settings → Pages**, enter your custom domain in the **Custom domain** field and save. Once DNS propagates, enable **Enforce HTTPS**.

## Notes

- All animations respect `prefers-reduced-motion` and degrade gracefully if the GSAP CDN fails to load.
- The hero's pinned scroll transition is disabled below 861px width in favor of a lighter fade, to keep mobile scrolling smooth.
