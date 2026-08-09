# institutions

Three small, interactive research demonstrations organized around one question: inside an
institution that is visibly declining, why does decision-making stall — and can the spiral
of exit and silence be interrupted before it removes the capacity needed to fix it?

Live at **[meherbejaoui.com/institutions](https://www.meherbejaoui.com/institutions/)**,
alongside the main site at [meherbejaoui.github.io](https://github.com/meherbejaoui/meherbejaoui.github.io).

## What's here

- **[`simulation/`](simulation/)** — The Decline Spiral. An agent-based model where a
  hundred agents hold a depletable account of trust; departures remove the capacity the
  institution needed to self-correct, feeding the next round of decline. Sliders control
  decline pressure, whether voice is actually heard, and how many agents have somewhere
  else to go.
- **[`in-tray/`](in-tray/)** — a playable desk simulation. Approve, refuse, or request
  further documents on a stream of synthetic administrative dossiers, under a hidden payoff
  structure that rewards deferral. The session debrief turns your own choices into a
  deferral-chain timeline and a duration-to-clearance chart.
- **[`reading-map/`](reading-map/)** — an annotated map of five established frames for
  institutional non-decision (non-decision-making, blame avoidance, implementation deficit,
  individual decision avoidance, exit–voice–loyalty), each with what it explains, what it
  leaves open, and where the site's own account-of-trust mechanism sits relative to it.

## On accuracy

Every citation on this site is checked against a verifiable source before publication; the
full trail — including one page-range discrepancy across secondary sources, disclosed rather
than silently resolved — is in [`REFERENCES.md`](REFERENCES.md). The simulation and the game
are illustrative models built to make a mechanism legible; neither is a fitted or validated
empirical finding, and both say so on their own pages. The In-Tray's dossiers are entirely
synthetic — invented for the game, not drawn from any real case file.

## Stack

Plain HTML, CSS, and vanilla JavaScript. No framework, no build step, no dependencies —
deliberately, so the whole site stays inspectable and durable. Served as a GitHub Pages
project site, inheriting the custom domain configured on the main site.

```
institutions/
├── index.html          landing page
├── style.css            shared design system
├── theme.js              light/dark toggle
├── simulation/           project 1
├── in-tray/               project 2
├── reading-map/           project 3
├── REFERENCES.md
└── README.md
```

## Local preview

No build step — serve the directory with any static file server, e.g.:

```
python3 -m http.server 8000
```

then open `http://localhost:8000/`.

## License

Code and content © Meher Béjaoui, all rights reserved unless stated otherwise.
