# Copilot Instructions for Thriving Healthy

## Project Overview

This is a **Jekyll static site** for a health and wellness content hub hosted on GitHub Pages at `thrivinghealthy.com`. The site curates podcast summaries, article notes, book reviews, and expert recommendations across six health categories.

## Architecture

### Content System
- **Notes Collection** (`_notes/`): Primary content organized by subdirectory/category:
  - `diet/` → Diet & Nutrition
  - `exercise/` → Exercise & Fitness  
  - `sleep/` → Sleep & Rest
  - `brain/` → Brain & Stress
  - `happiness/` → Happiness & Spirituality
  - `health/` → Health & Wellness
- **Main Pages**: `index.md` serves as the content hub with category sections linking to notes
- Notes use front matter fields: `title`, `description`, `category`, `author`, `podcast`, `date`, `link` (external source URL), `keywords`

### Theme & Styling
- Uses **Cayman remote theme** (`pages-themes/cayman@v0.2.0`) with extensive SCSS overrides in [assets/css/style.scss](assets/css/style.scss)
- Dark mode toggle implemented via `body.dark-mode` class with localStorage persistence
- Platform-specific styling for YouTube, Spotify, Apple, Amazon links (colored badges/icons)

### Key Components (`_includes/`)
- `note-card.html`: Reusable card component with platform detection, YouTube thumbnail extraction, title parsing (expects `Guest – Episode` format)
- `tag-badges.html`: Renders colored badge spans from comma-separated tags
- `related-articles.html`: Auto-generates related content based on matching `category` front matter

### Search System
- Lunr.js client-side search with index generated via [search.json](search.json)
- Dual search inputs (desktop header + mobile hamburger menu) synced in [assets/js/search.js](assets/js/search.js)

## Content Patterns

### Note Front Matter Template
```yaml
---
title: "Show Name #123 - Guest Name"
description: "One-line summary for SEO and cards"
keywords: "comma, separated, keywords"
category: "Diet & Nutrition"  # Must match one of the six categories
author: "Expert Name"
podcast: "The Podcast Name"
date: 2024-06-27
link: "https://youtube.com/watch?v=..."  # External source
---
```

### Note Content Structure
Notes follow a consistent format:
1. **Overview block** with emoji metadata (🎧 Podcast, 👩‍⚕️ Expert, 🎯 Topic, ⏱️ Key Takeaway)
2. YouTube thumbnail embed (auto-extracted if link is YouTube)
3. Bullet-point **Key Discussion Points** with bold topic headers
4. **Conclusion** summary
5. **Resources** section with links
6. Back-to-top button

### Adding Content to index.md
Use the `note-card` include with platform-specific styling:
```liquid
{% include note-card.html 
   url="/notes/diet/Example-Note/" 
   show="Podcast Name" 
   title="Dr. Expert – Episode Title" 
   tags="Nutrition,Fitness" 
   platform="youtube" %}
```

### Tag/Badge System
Six primary tags with distinct colors: `Nutrition`, `Fitness`, `Brain`, `Sleep`, `Spirituality`, `Stress`

## Development

### Local Preview
```bash
bundle exec jekyll serve --livereload
```

### Build & Deploy
- GitHub Pages auto-builds from main branch
- Site configuration in [_config.yml](_config.yml)
- Google Analytics via `ga4_id` environment variable

### File Naming Convention
Notes use **kebab-case** matching the title: `The-Miracle-of-Fasting.md`

## Important Patterns

- **Category assignment**: Notes get their category from front matter, not directory location (though directories are organized by category)
- **Platform detection**: `note-card.html` auto-detects platform from `link` URL or explicit `platform` param
- **Title parsing**: Cards parse `Guest – Episode` format (en-dash) for two-line display; single titles display on one line
- **Related articles**: Limited to 3 items from same category, rendered automatically on note pages
