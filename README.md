# Robotics portfolio (Obsidian → GitHub Pages)

Write your portfolio as notes in Obsidian; this repo turns them into a fast, minimal website with project pages, a skills index, 3D model viewers and an Obsidian-style graph. Plain HTML, CSS and JS, no framework.

```
vault/              ← open this folder in Obsidian
  index.md          homepage intro
  about.md          about page (+ résumé link)
  graph.md          intro text for the graph page
  projects/         one note per project
  skills/           one note per skill (projects link to these)
  notes/            build logs and write-ups
  attachments/      images, videos, .glb models, résumé PDF
  _templates/       templates for new notes (not published)
src/
  templates.mjs     HTML for each kind of page
  style.css         all styling (colours at the top)
  graph.js          the graph
  console.js        the terminal and the prompt bar
build.mjs           vault → site/
dev.mjs             local preview with live rebuild
site.config.json    your name, links, section titles
```

## 1. Run it locally

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Open <http://localhost:4000>. The site rebuilds every time you save a note (refresh the browser to see it).

## 2. Open the vault in Obsidian

In Obsidian: **Open folder as vault** → choose the `vault` folder. It's already set up so that:

- pasted images go into `attachments/`
- links use the `[[Note name]]` style
- **Templates** (Settings → Core plugins → Templates) use `_templates/`. Make a new note in `projects/`, then run *Templates: Insert template* → *Project*.
- the graph colours projects gold, skills dark and notes grey, matching the site

## 3. Make it yours

1. Edit `site.config.json`: your name, title, description and links.
2. Rewrite `vault/index.md` and `vault/about.md`.
3. Replace the sample projects, skills and notes. Delete the placeholder files in `attachments/`.
4. Drop your résumé into `attachments/resume.pdf`. The About page shows a download button once the file exists.

## Writing a project

Each project note's properties (front matter) drive the page:

| Property   | What it does |
|------------|--------------|
| `title`, `summary` | Heading and one-line description (also used on cards) |
| `year`, `role`, `team`, `status`, `hardware` | The facts block |
| `featured: true`, `order` | Shows it in *Selected projects* on the homepage, in this order |
| `cover` | Card and header image, e.g. `"[[rover.jpg]]"` |
| `video` | Header video: a YouTube/Vimeo URL, or a local clip like `"[[demo.mp4]]"` (plays muted on loop) |
| `model` | A `.glb` file shown in a 3D viewer you can rotate |
| `skills` | List of `"[[Skill]]"` links. These become chips, backlinks and graph edges |
| `gallery` | List of `"[[image.jpg\|Caption]]"`, shown as "(1 of 3) Caption" |
| `code`, `paper`, `report`, `demo` | Links shown under *Links* |
| `draft: true` | Leaves the note off the site |

In the body you can use normal Obsidian syntax: `[[links]]`, `[[note|custom text]]`, `![[image.png]]`, `![[clip.mp4]]`, `![[part.glb]]`, `==highlights==`, `%%comments%%` (hidden) and callouts like `> [!tip]`.

**Video tips:** keep clips in the repo short (under ~10 MB, a few seconds, no audio). Upload anything longer to YouTube and paste the link. To shrink a clip:

```bash
ffmpeg -i input.mov -an -vf "scale=1280:-2" -c:v libx264 -crf 28 -preset veryfast -movflags +faststart demo.mp4
```

**3D models:** export from Fusion 360/Onshape/SolidWorks as STEP or OBJ, then convert to `.glb` (Blender: *File → Export → glTF 2.0*, choose *glTF Binary*). Aim for under 10 MB; decimate if needed.

## Math and diagrams

Both work in any note, project or skill page.

- **LaTeX:** write `$e = mc^2$` inline or `$$ ... $$` for a display equation. It is rendered to HTML when the site is built, so visitors download no extra JavaScript. Dollar amounts like `$5` are left alone, and anything inside backticks is never treated as math.
- **Mermaid:** write a fenced block with the language `mermaid`. It is drawn in the visitor's browser, uses the site colours and redraws when they switch between light and dark. If a diagram has a syntax error the source is shown instead.

Only pages that use them load the extra files (`vendor/katex`, `vendor/mermaid.min.js`). See `vault/notes/PID tuning notes.md` for an example of each.

## 4. Publish on GitHub Pages

1. Create a GitHub repo and push this folder to its `main` branch:
   ```bash
   git init && git add . && git commit -m "First version"
   git branch -M main
   git remote add origin https://github.com/YOURNAME/YOUR-REPO.git
   git push -u origin main
   ```
2. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Each push now rebuilds and deploys the site (watch it in the **Actions** tab). It goes live at `https://YOURNAME.github.io/YOUR-REPO/`.
   Name the repo `YOURNAME.github.io` to get `https://YOURNAME.github.io/` instead.

All links are relative, so the site works at either address and on a custom domain without changes.

**Custom domain:** buy one, add it under **Settings → Pages → Custom domain**, and create the DNS records GitHub shows you. Then set `"url"` in `site.config.json` (e.g. `"https://yourname.dev"`) so share previews get the right links. To add a share image, put a 1200×630 PNG in `attachments/` and set `"socialImage": "attachments/share.png"`.

**Publishing from Obsidian:** the community plugin *Obsidian Git* can commit and push the vault on a timer, so saving a note eventually updates the site. Commit the whole repo (not just `vault/`).

## The homepage terminal

The homepage is a full-screen terminal, styled after emrah.ca. Output appears above the prompt; the commands under the prompt change with what's on screen. Visitors can type or click.

| Type | What happens |
|------|--------------|
| `projects`, `skills`, `notes` | A table (projects also get a mosaic of cover images). ↑/↓ moves through the rows, Enter opens one, Esc collapses |
| a name, e.g. `arm`, `ros`, `lidar` | Suggestions appear as you type; Enter opens the best match |
| a number | Opens that row of the table on screen |
| `graph`, `about`, `contact`, `whoami`, `help` | Shown right in the terminal |
| `light` / `dark` | Switch themes (remembered per visitor) |
| `clear` | Reset the terminal |

Typing anywhere on the homepage goes into the prompt, and `/` focuses it. Every other page has a prompt bar at the bottom: commands there jump back to the homepage terminal (for example `index.html#projects`), and Esc goes back. Without JavaScript the intro and command links still work as ordinary links.

The intro comes from `vault/index.md`, the command descriptions from `"command"` in `site.config.json`, and the italic line under each table from `"intro"`. To add your own command (say `resume`), add an entry to `commands` in `src/console.js`:

```js
{ name: "resume", desc: "download my résumé", run: () => (location.href = href("attachments/resume.pdf")) },
```

This is a command prompt, not an AI chatbot. A static GitHub Pages site can't run an AI model without a separate server and API key.

## Customising

- **Colours and fonts:** variables at the top of `src/style.css`, one block for the dark theme (the default) and one for light. The font is IBM Plex Mono, bundled with the site. The placeholder drawings use their own colours; your real images replace them.
- **Page layout:** `src/templates.mjs`. Each page type is one function.
- **Sections:** add another folder (say `research/`) and list it in `site.config.json` → `sections`. Give it a graph colour with `--node-research` in `style.css`.
- **Graph behaviour:** `src/graph.js`. Spacing is set by the `charge` and `link` forces near the bottom.
