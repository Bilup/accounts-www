const hamburgerMenu = document.getElementById('hamburger-menu');
const navLinks = document.getElementById('nav-links');

hamburgerMenu.addEventListener('click', () => {
  navLinks.classList.toggle('show');
  hamburgerMenu.classList.toggle('active');
});
