#!/usr/bin/env python3
"""Builds the portfolio site from GitHub repo metadata and projects.toml.

Usage:
    python build.py                    # build dist/ with the theme from projects.toml
    python build.py --theme terminal   # build with another theme
    python build.py --preview          # build every theme into dist/preview/<theme>/

Standard library only. Set GITHUB_TOKEN to avoid the anonymous API rate limit.
"""

from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import os
import shutil
import tomllib
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
THEMES = ("minimal", "terminal", "playful", "playful-dark")
FONTS = {
    "minimal": "Inter:wght@400;500;600;700",
    "terminal": "JetBrains+Mono:wght@400;500;700",
    "playful": "Nunito:wght@400;600;800",
    "playful-dark": "Nunito:wght@400;600;800",
}
LANG_COLORS = {
    "Python": "#3572A5", "Java": "#b07219", "JavaScript": "#f1e05a", "TypeScript": "#3178c6",
    "C#": "#178600", "CSS": "#663399", "HTML": "#e34c26", "Jupyter Notebook": "#DA5B0B",
}
NOT_TECH_TAGS = {"ai-agent"}  # topics too generic to show as tech tags
LANG_TOPICS = {"C#": "csharp", "Jupyter Notebook": "jupyter-notebook"}  # language -> matching topic


def esc(text: object) -> str:
    return html.escape(str(text), quote=True)


# ---------------------------------------------------------------- data

def github(path: str) -> object:
    req = urllib.request.Request(
        f"https://api.github.com{path}",
        headers={"Accept": "application/vnd.github+json", "User-Agent": "portfolio-build"},
    )
    if token := os.environ.get("GITHUB_TOKEN"):
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def load_data(user: str, cache: Path) -> dict:
    """Fetches the profile and public repos; falls back to the last cached copy."""
    try:
        data = {
            "user": github(f"/users/{user}"),
            "repos": github(f"/users/{user}/repos?per_page=100&type=owner&sort=pushed"),
        }
        cache.write_text(json.dumps(data, indent=1), encoding="utf-8")
        return data
    except OSError as err:
        if cache.exists():
            print(f"GitHub API unavailable ({err}); using {cache.name}")
            return json.loads(cache.read_text(encoding="utf-8"))
        raise


# ---------------------------------------------------------------- html parts

def thumb_for(repo: str) -> str | None:
    path = ROOT / "assets" / "img" / "thumbs" / f"{repo}.jpg"
    return f"assets/img/thumbs/{repo}.jpg" if path.exists() else None


def tags_html(tags: list[str], language: str | None = None) -> str:
    items = []
    if language:  # don't repeat the language as a topic tag (Python + python)
        same = {language.lower(), LANG_TOPICS.get(language, "")}
        tags = [t for t in tags if t.lower() not in same]
    if language:
        color = LANG_COLORS.get(language, "#888")
        items.append(f'<li class="tag lang"><span class="dot" style="background:{color}"></span>{esc(language)}</li>')
    items += [f'<li class="tag">{esc(t)}</li>' for t in tags]
    return f'<ul class="tags">{"".join(items)}</ul>' if items else ""


def buttons_html(repo: dict, category: str, user: str) -> str:
    out = []
    home = (repo.get("homepage") or "").strip()
    if home.startswith(f"https://{user}.github.io/") or home.startswith(f"http://{user}.github.io/"):
        label = "▶ Play" if category == "game" else "Open"
        out.append(f'<a class="btn primary" href="{esc(home)}">{label}</a>')
    out.append(f'<a class="btn" href="{esc(repo["html_url"])}">Code</a>')
    return f'<div class="actions">{"".join(out)}</div>'


def card_html(repo: dict, category: str, section_topics: set[str], user: str) -> str:
    tech = [t for t in repo.get("topics", []) if t not in section_topics and t not in NOT_TECH_TAGS]
    thumb = thumb_for(repo["name"])
    img = (f'<a class="thumb" href="{esc(repo.get("homepage") or repo["html_url"])}">'
           f'<img src="{thumb}" alt="Screenshot of {esc(repo["name"])}" loading="lazy"></a>') if thumb else ""
    return f"""
      <article class="card{' has-thumb' if thumb else ''}" data-cat="{esc(category)}">
        {img}
        <div class="card-body">
          <h3><a href="{esc(repo['html_url'])}">{esc(repo['name'])}</a></h3>
          <p>{esc(repo.get('description') or '')}</p>
          {tags_html(tech, repo.get('language'))}
          {buttons_html(repo, category, user)}
        </div>
      </article>"""


def featured_html(item: dict, repos: dict, user: str) -> str:
    facts = "".join(f"<li>{esc(f)}</li>" for f in item.get("facts", []))
    if "repo" in item:  # public repo: data from GitHub plus a code snippet
        repo = repos[item["repo"]]
        tech = [t for t in repo.get("topics", []) if t not in {"ai", *NOT_TECH_TAGS}]
        media = f"""
        <div class="feat-media snippet" aria-label="Example session">
          <div class="term-bar"><span></span><span></span><span></span><em>sales-agent</em></div>
          <pre><code><span class="q">&gt; {esc(item['snippet_question'])}</span>
<span class="c"># tools: {esc(item['snippet_tools'])}</span>
{esc(item['snippet_sql'])}
<span class="a">{esc(item['snippet_answer'])}</span></code></pre>
        </div>"""
        title, desc = repo["name"], repo.get("description") or ""
        tags = tags_html(tech, repo.get("language"))
        actions = f'<div class="actions"><a class="btn primary" href="{esc(repo["html_url"])}">Code &amp; README</a></div>'
        badge = ""
    else:  # manual entry (private repo)
        gallery = "".join(f'<img src="{esc(g)}" alt="{esc(item["name"])} screenshot" loading="lazy">'
                          for g in item.get("gallery", []))
        media = f"""
        <div class="feat-media gallery">
          <img class="hero-img" src="{esc(item['image'])}" alt="{esc(item['name'])}">
          <div class="shots">{gallery}</div>
        </div>"""
        title, desc = item["name"], item.get("description", "")
        tags = tags_html(item.get("tags", []))
        actions = ""
        badge = f'<span class="badge">{esc(item["status"])}</span>' if item.get("status") else ""
    return f"""
    <article class="featured">
      {media}
      <div class="feat-body">
        <h3>{esc(title)} {badge}</h3>
        <p>{esc(desc)}</p>
        <ul class="facts">{facts}</ul>
        {tags}
        {actions}
      </div>
    </article>"""


def theme_css(theme: str) -> str:
    """playful-dark = the playful theme with its dark palette always on."""
    files = ["playful", "playful-dark"] if theme == "playful-dark" else [theme]
    return "\n  ".join(f'<link rel="stylesheet" href="assets/css/{f}.css">' for f in files)


def render(cfg: dict, data: dict, theme: str) -> str:
    site, user = cfg["site"], data["user"]
    login = site["user"]
    sections = cfg["section"]
    section_topics = {s["topic"] for s in sections}
    hidden = set(cfg.get("hidden", {}).get("repos", []))
    featured_repos = {f["repo"] for f in cfg.get("featured", []) if "repo" in f}
    repos = {r["name"]: r for r in data["repos"] if not r.get("private")}

    featured = "".join(featured_html(f, repos, login) for f in cfg.get("featured", [])
                       if "repo" not in f or f["repo"] in repos)

    nav, blocks = [], []
    for s in sections:
        items = [r for r in repos.values()
                 if s["topic"] in r.get("topics", []) and r["name"] not in hidden | featured_repos
                 and not r.get("fork") and not r.get("archived")]
        if not items:
            continue
        items.sort(key=lambda r: r.get("pushed_at") or "", reverse=True)  # newest first
        items.sort(key=lambda r: thumb_for(r["name"]) is None)  # then the ones with screenshots first
        cards = "".join(card_html(r, s["topic"], section_topics, login) for r in items)
        nav.append(f'<a href="#{esc(s["topic"])}">{esc(s["label"])}</a>')
        blocks.append(f"""
    <section class="projects" id="{esc(s['topic'])}">
      <h2 data-cmd="ls ~/{esc(s['topic'])}">{esc(s['label'])}</h2>
      <div class="grid">{cards}
      </div>
    </section>""")

    links = [f'<a class="btn" href="{esc(user["html_url"])}">GitHub</a>']
    if site.get("linkedin"):
        links.append(f'<a class="btn" href="{esc(site["linkedin"])}">LinkedIn</a>')
    avatar = (f'<img class="avatar" src="{esc(user["avatar_url"])}&s=240" alt="{esc(site["name"])}">'
              if site.get("show_avatar") else "")
    today = dt.date.today().isoformat()

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{esc(site['name'])} · {esc(site['title'])}</title>
  <meta name="description" content="{esc(site['intro'])}">
  <meta property="og:title" content="{esc(site['name'])} · {esc(site['title'])}">
  <meta property="og:description" content="{esc(site['intro'])}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family={FONTS[theme]}&display=swap">
  <link rel="stylesheet" href="assets/css/base.css">
  {theme_css(theme)}
</head>
<body class="theme-{theme.split('-')[0]}">
  <header class="hero">
    {avatar}
    <div>
      <h1>{esc(site['name'])}</h1>
      <p class="role">{esc(site['title'])} <span class="sep">|</span> <span class="stack">{esc(site['stack'])}</span></p>
      <p class="intro">{esc(site['intro'])}</p>
      <div class="actions">{''.join(links)}</div>
    </div>
  </header>
  <nav class="toc"><a href="#featured">Featured</a>{''.join(nav)}</nav>
  <main>
    <section id="featured">
      <h2 data-cmd="cat featured.md">Featured</h2>
      {featured}
    </section>
    {''.join(blocks)}
  </main>
  <footer>Generated from my <a href="{esc(user['html_url'])}">GitHub repos</a> · updated {today}</footer>
</body>
</html>
"""


# ---------------------------------------------------------------- build

def build(cfg: dict, data: dict, theme: str, out: Path) -> None:
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(ROOT / "assets", out / "assets")
    (out / "index.html").write_text(render(cfg, data, theme), encoding="utf-8")
    (out / ".nojekyll").touch()
    print(f"built {out.relative_to(ROOT)}/index.html ({theme})")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--theme", choices=THEMES)
    ap.add_argument("--out", default="dist")
    ap.add_argument("--preview", action="store_true", help="build every theme into <out>/preview/")
    args = ap.parse_args()

    cfg = tomllib.loads((ROOT / "projects.toml").read_text(encoding="utf-8"))
    data = load_data(cfg["site"]["user"], ROOT / ".cache.json")
    out = ROOT / args.out
    if args.preview:
        for theme in THEMES:
            build(cfg, data, theme, out / "preview" / theme)
    else:
        build(cfg, data, args.theme or cfg["site"].get("theme", "minimal"), out)


if __name__ == "__main__":
    main()
