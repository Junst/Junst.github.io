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

{% assign imgs = site.static_files | where_exp: "f", "f.path contains '/assets/images/'" %}
{% assign priority_files = "bio-photo.jpg,cv-photo.png" | split: "," %}
{% assign dated_files = "" | split: "" %}
{% assign other_files = "" | split: "" %}

{% for img in imgs %}
  {% assign ext = img.extname | downcase %}
  {% if ext == '.jpg' or ext == '.jpeg' or ext == '.png' or ext == '.webp' %}
    {% if img.name == 'logo.png' %}
      {% continue %}
    {% elsif priority_files contains img.name %}
      {% continue %}
    {% elsif img.name contains '202' %}
      {% assign dated_files = dated_files | push: img %}
    {% else %}
      {% assign other_files = other_files | push: img %}
    {% endif %}
  {% endif %}
{% endfor %}

{% assign dated_files = dated_files | sort: "name" %}

<div class="gallery-grid">
{% for name in priority_files %}
  {% for img in imgs %}
    {% if img.name == name %}
      {% assign cap = site.data.gallery_captions[img.name] | default: img.name | split: '.' | first | replace: '-', ' ' | replace: '_', ' ' | capitalize %}
      <figure class="gallery-item">
        <img src="{{ img.path | relative_url }}" alt="{{ cap }}">
        <figcaption>{{ cap }}</figcaption>
      </figure>
    {% endif %}
  {% endfor %}
{% endfor %}
{% for img in dated_files %}
  {% assign cap = site.data.gallery_captions[img.name] | default: img.name | split: '.' | first | replace: '-', ' ' | replace: '_', ' ' | capitalize %}
  <figure class="gallery-item">
    <img src="{{ img.path | relative_url }}" alt="{{ cap }}">
    <figcaption>{{ cap }}</figcaption>
  </figure>
{% endfor %}
{% for img in other_files %}
  {% assign cap = site.data.gallery_captions[img.name] | default: img.name | split: '.' | first | replace: '-', ' ' | replace: '_', ' ' | capitalize %}
  <figure class="gallery-item">
    <img src="{{ img.path | relative_url }}" alt="{{ cap }}">
    <figcaption>{{ cap }}</figcaption>
  </figure>
{% endfor %}
</div>
