---
layout: single
title: Gallery
permalink: /gallery/
classes: wide
author_profile: true
---

<style>
  body{overflow-x:hidden}
  .gallery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;overflow:visible}
  .gallery-item{position:relative;cursor:pointer}
  .gallery-item img{width:100%;height:220px;object-fit:cover;border-radius:10px;transition:transform 0.3s ease,box-shadow 0.3s ease}
  .gallery-item figcaption{margin-top:.5rem;font-size:.95rem;opacity:.9}
  .gallery-item.expanded{z-index:1000;position:relative}
  .gallery-item.expanded img{transform:scale(3);box-shadow:0 20px 60px rgba(0,0,0,0.5);border-radius:8px;position:relative}
  .page__content,.inner-wrap,.page,.site{overflow:visible!important}
  @media (min-width:1200px){.gallery-item img{height:260px}}
</style>

<script>
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.gallery-item').forEach(function(item) {
    item.addEventListener('click', function(e) {
      if (this.classList.contains('expanded')) {
        this.classList.remove('expanded');
      } else {
        document.querySelectorAll('.gallery-item.expanded').forEach(function(el) {
          el.classList.remove('expanded');
        });
        this.classList.add('expanded');
      }
    });
  });
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.gallery-item')) {
      document.querySelectorAll('.gallery-item.expanded').forEach(function(el) {
        el.classList.remove('expanded');
      });
    }
  });
});
</script>

<div class="gallery-grid">
  <figure class="gallery-item">
    <img src="/assets/images/bio-photo.jpg" alt="2022 Profile">
    <figcaption>2022 Profile</figcaption>
  </figure>
  <figure class="gallery-item">
    <img src="/assets/images/cv-photo.png" alt="2023 CV">
    <figcaption>2023 CV</figcaption>
  </figure>
  <figure class="gallery-item">
    <img src="/assets/images/20240109.jpg" alt="Las Vegas CES AI Innovation Award">
    <figcaption>2024.01.09 Las Vegas CES AI Innovation Award</figcaption>
  </figure>
  <figure class="gallery-item">
    <img src="/assets/images/20240617.jpg" alt="Seattle CVPR 2024 Workshop">
    <figcaption>2024.06.17 Seattle CVPR 2024 Workshop</figcaption>
  </figure>
  <figure class="gallery-item">
    <img src="/assets/images/20250808.jpg" alt="USC Visiting Student">
    <figcaption>2025.08.08 USC Visiting Student</figcaption>
  </figure>
  <figure class="gallery-item">
    <img src="/assets/images/20251023.jpg" alt="KRAFTON Intern">
    <figcaption>2025.10.23 KRAFTON Intern</figcaption>
  </figure>
  <figure class="gallery-item">
    <img src="/assets/images/20251209.jpg" alt="San Diego NeurIPS 2025 Workshop AI for Music">
    <figcaption>2025.12.09 San Diego NeurIPS 2025 Workshop AI for Music</figcaption>
  </figure>
</div>
