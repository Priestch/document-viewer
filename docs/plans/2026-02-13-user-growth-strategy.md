# User Growth Strategy - Frontend Developer Acquisition

**Date:** 2026-02-13
**Status:** Draft
**Time Budget:** 1-2 hours per week
**Primary Audience:** Frontend developers integrating PDF viewing
**Secondary Audiences:** Open-source contributors, enterprise users

## Problem Statement

**Current Challenges:**

- **Discovery/SEO:** Developers don't find the project when searching for PDF solutions
- **Ecosystem Awareness:** Not enough mentions in framework communities, Stack Overflow, or comparison articles

**Current Assets:**

- Documentation site with blog posts
- Working demos
- Recent SEO improvements (IndexNow, meta descriptions)
- npm package with 0.11.0-beta.3 published
- Framework-agnostic core library

## Strategic Approach

### Primary Strategy: Framework Integration Ecosystem ⭐ (Recommended)

Create official framework-specific packages/templates that become discovery points themselves.

**Implementation:**

- Build `@document-kits/react`, `@document-kits/vue`, `@document-kits/solid` wrapper packages
- Create framework-specific starter templates (Next.js, Nuxt, SvelteKit)
- Publish as separate npm packages with framework-specific keywords
- Add to framework-specific awesome lists and directories

**Why This Works:**

- Each package = new npm search entry ("react pdf viewer" → finds your React package)
- Framework communities discover you through their ecosystems
- Code speaks for itself - developers trust working examples
- Compounds: Once built, requires minimal maintenance
- 1-2 hours/week can produce one integration per month

**Timeline:**

- Month 1: `@document-kits/react` + basic React example
- Month 2: `@document-kits/vue` + Vue 3 composition API example
- Month 3: Next.js App Router template
- Month 4: `@document-kits/svelte` + SvelteKit example
- Month 5: Nuxt 3 template
- Month 6: Angular standalone component wrapper

**Success Metrics:**

- npm downloads per package
- GitHub stars growth
- Inbound issues/questions from framework users
- Search rankings for "{framework} pdf viewer"

**Trade-offs:**

- Upfront time investment (3-4 hours per integration)
- Need to keep up with major framework updates
- Works best for popular frameworks first

---

### Alternative Strategy A: Use-Case Example Library

Build a collection of specific, searchable examples that solve real problems.

**Implementation:**

- Create examples for common use cases:
  - "PDF viewer with form filling"
  - "PDF with annotations"
  - "Multi-file PDF viewer with tabs"
  - "PDF viewer with custom toolbar"
  - "Responsive PDF viewer for mobile"
- Each example: standalone CodeSandbox/StackBlitz + blog post
- Target long-tail searches: "how to add annotation to pdf.js viewer"
- Submit examples to coding example sites (CodePen picks, daily.dev)

**Why This Works:**

- Captures long-tail search traffic (less competition)
- Developers search by problem, not by library name
- Examples are shareable and reusable
- Each example can rank independently

**Trade-offs:**

- Requires some writing (blog post per example)
- SEO results take 3-6 months
- Need to identify high-value use cases

---

### Alternative Strategy B: Strategic Placement + Passive SEO

Focus on getting listed where developers already look for solutions.

**Implementation:**

**Directory/List Submissions:**

- awesome-react → PDF viewer section
- awesome-vue → Document viewers
- PDF.js alternatives lists
- JavaScript Weekly submissions
- npm weekly features

**Comparison Content:**

- "document-viewer vs PDF.js default viewer"
- "document-viewer vs React-PDF"
- "document-viewer vs PSPDFKit" (commercial)
- "Why choose document-viewer over iframe integration"

**SEO Optimization:**

- Optimize existing docs for searches:
  - "pdf.js custom toolbar"
  - "pdf.js without iframe"
  - "customizable pdf viewer"
  - "framework agnostic pdf viewer"

**Why This Works:**

- One-time effort with long-term payoff
- Captures developers in research phase
- Builds authority through comparisons
- Low ongoing maintenance

**Trade-offs:**

- Less code-heavy (more writing/outreach)
- Slower initial results
- Depends on others accepting submissions

---

## Recommended 6-Month Roadmap

### Phase 1: Foundation (Months 1-2)

- ✅ Build React integration package
- ✅ Create React CodeSandbox examples (3-4 common use cases)
- Submit to awesome-react
- Write comparison post: "vs PDF.js default viewer"

### Phase 2: Vue Ecosystem (Month 3)

- ✅ Build Vue 3 integration package
- Create Vue CodeSandbox examples
- Submit to awesome-vue
- Answer Stack Overflow questions about Vue + PDF.js (link to your package)

### Phase 3: Meta-Framework Templates (Months 4-5)

- ✅ Create Next.js App Router template
- ✅ Create Nuxt 3 template
- Submit templates to framework showcases
- Write blog post: "Building a PDF viewer in Next.js/Nuxt"

### Phase 4: Ecosystem Expansion (Month 6)

- ✅ Build Svelte/SvelteKit integration
- Consolidate comparison documentation
- Submit to JavaScript Weekly
- Review analytics and double down on top performers

---

## Long-Term Maintenance (Post Month 6)

**Weekly (30-60 minutes):**

- Monitor and respond to issues on framework packages
- Answer 1-2 Stack Overflow questions (link to relevant integration)

**Monthly (1-2 hours):**

- Check for major framework updates requiring wrapper updates
- Add one new example or use case demo
- Review search rankings and adjust keywords

**Quarterly:**

- Major version updates for breaking framework changes
- Review analytics and pivot strategy if needed

---

## Key Performance Indicators

**Primary Metrics:**

- npm downloads (total across all packages)
- GitHub stars/forks growth rate
- Organic search traffic to docs
- Stack Overflow mentions/links

**Secondary Metrics:**

- Framework-specific package downloads
- CodeSandbox/StackBlitz fork counts
- Inbound links from blog posts/tutorials
- Issues opened (indicates real usage)

**Target (6 months):**

- 2,000+ weekly npm downloads (combined)
- 500+ GitHub stars
- Top 10 ranking for "{framework} pdf viewer" (at least 2 frameworks)
- 5+ external blog posts/tutorials mentioning the project

---

## Next Steps

1. **Validate approach** - Does this align with project goals?
2. **Set up for implementation** - Create git worktree for first integration
3. **Create detailed plan** - Break down React integration into tasks
4. **Begin execution** - Start with `@document-kits/react` package

---

## Notes

- Strategy prioritizes code examples over content marketing (aligns with strengths)
- Focuses on compounding efforts (integrations drive long-term discovery)
- Realistic for 1-2 hours/week time constraint
- Leverages existing framework-agnostic core (no major refactoring needed)
