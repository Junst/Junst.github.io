---
layout: single
title: Gallery
permalink: /gallery/
classes: wide
author_profile: true
---

<style>
  .gallery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
  .gallery-item img{width:100%;height:220px;object-fit:cover;border-radius:10px}
  .gallery-item figcaption{margin-top:.5rem;font-size:.95rem;opacity:.9}
  @media (min-width:1200px){.gallery-item img{height:260px}}
</style>

{% assign imgs = site.static_files | where_exp: "f", "f.path contains '/assets/images/'" | sort:"name" %}
<div class="gallery-grid">
{% for img in imgs %}
  {% assign ext = img.extname | downcase %}
  {% if ext == '.jpg' or ext == '.jpeg' or ext == '.png' or ext == '.webp' %}
    {% assign cap = site.data.gallery_captions[img.name] | default: img.name | split: '.' | first | replace: '-', ' ' | replace: '_', ' ' | capitalize %}
    <figure class="gallery-item">
      <img src="{{ img.path | relative_url }}" alt="{{ cap }}">
      <figcaption>{{ cap }}</figcaption>
    </figure>
  {% endif %}
{% endfor %}
</div>
