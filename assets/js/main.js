document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.primary-nav');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Close mobile menu after tapping a link
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Photo gallery lightbox — populated at build time, tiles get a
  // .lightbox-trigger class and a background-image inline style.
  var triggers = document.querySelectorAll('.lightbox-trigger');
  if (triggers.length) {
    var overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML =
      '<div class="lightbox-box">' +
        '<img alt="">' +
        '<p class="lightbox-caption"></p>' +
        '<a class="lightbox-link">View full story &rarr;</a>' +
        '<button class="lightbox-close" type="button" aria-label="Close">&times;</button>' +
      '</div>';
    document.body.appendChild(overlay);

    var lightboxImg = overlay.querySelector('img');
    var lightboxCaption = overlay.querySelector('.lightbox-caption');
    var lightboxLink = overlay.querySelector('.lightbox-link');

    triggers.forEach(function (trigger) {
      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        var bg = trigger.style.backgroundImage;
        var match = /url\((['"]?)(.*?)\1\)/.exec(bg);
        lightboxImg.src = match ? match[2] : '';
        lightboxCaption.textContent = trigger.getAttribute('data-caption') || '';
        lightboxLink.href = trigger.getAttribute('href');
        overlay.classList.add('open');
      });
    });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.classList.contains('lightbox-close')) {
        overlay.classList.remove('open');
      }
    });
  }
});
