---
title: Blog
description: Articles and tutorials about PDF viewer development and web technologies.
---

<script setup>
const posts = [
  {
    title: 'Build PDF Viewer Based on Image',
    description: 'Learn how to build a PDF viewer based on images - an effective approach for simple use cases when you have limited time and resources.',
    link: './build-pdf-viewer-based-on-image',
    date: '2026-01-29',
    tag: 'Tutorial'
  },
    {
    title: 'How to Develop a PDF Viewer',
    description: 'A comprehensive guide on developing your own PDF viewer from scratch.',
    link: './how-to-develop-a-pdf-viewer',
    date: '2026-01-20',
    tag: 'Guide'
  },
  {
    title: 'Three Ways to Display a PDF in HTML',
    description: 'Learn how to display PDF files in your HTML app with three ways, including using native elements, open source library like PDF.js, and commercial PDF viewers.',
    link: './3-ways-to-display-pdf-in-html',
    date: '2024-01-15',
    tag: 'Tutorial'
  },
  {
    title: 'Communication between Main and Worker Threads',
    description: 'An overview of how to facilitate communication between the main thread and worker threads in a web application.',
    link: './communication-between-the-main-and-worker-thread',
    date: '2024-01-10',
    tag: 'Overview'
  },
]
</script>

# Blog

<div class="blog-posts">
  <a v-for="post in posts" :key="post.link" :href="post.link" class="blog-card">
    <div class="blog-card-left">
      <span class="blog-tag">{{ post.tag }}</span>
      <h3 class="blog-title">{{ post.title }}</h3>
      <p class="blog-description">{{ post.description }}</p>
    </div>
    <span class="blog-card-right">→</span>
  </a>
</div>

<style>
.blog-posts {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 2rem;
}

.blog-card {
  position: relative;
  padding: 1.25rem 1.5rem;
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  text-decoration: none !important;
  color: var(--vp-c-text-1);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.blog-card * {
  text-decoration: none !important;
}

.blog-card:hover {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-brand-1);
}

.blog-card-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.blog-tag {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-radius: 4px;
  width: fit-content;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.blog-title {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.4;
  margin: 0;
  color: var(--vp-c-text-1);
}

.blog-description {
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--vp-c-text-2);
  margin: 0;
  text-decoration: none;
}

.blog-card-right {
  display: flex;
  align-items: center;
  color: var(--vp-c-text-3);
  font-size: 1.25rem;
}

@media (max-width: 640px) {
  .blog-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .blog-card-right {
    align-self: flex-end;
  }
}
</style>
