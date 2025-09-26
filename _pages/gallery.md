---
layout: single
title: Gallery
permalink: /gallery/
classes: wide
---

<style>
  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
  }
  .gallery-item img {
    width: 100%;
    height: 220px;             /* 규격화 높이 */
    object-fit: cover;          /* 원본 비율 유지하며 크롭 */
    border-radius: 10px;
  }
  .gallery-item figcaption {
    margin-top: .5rem;
    font-size: .95rem;
    opacity: .9;
  }
  @media (min-width: 1200px) {
    .gallery-item img { height: 260px; }  /* 큰 화면에서는 살짝 더 크게 */
  }
</style>

<div class="gallery-grid">
{% assign imgs = site.static_files
  | where_exp: "f", "f.path contains '/assets/images/'"
  | where_exp: "f", "f.extname == '.jpg' or f.extname == '.jpeg' or f.extname == '.png' or f.extname == '.webp'"
  | sort: "name" %}
{% for img in imgs %}
  {% assign cap = site.data.gallery_captions[img.name] %}
  <figure class="gallery-item">
    <img src="{{ img.path | relative_url }}" alt="{{ img.name | split: '.' | first | replace: '-', ' ' }}">
    {% if cap %}<figcaption>{{ cap }}</figcaption>{% endif %}
  </figure>
{% endfor %}
</div>
