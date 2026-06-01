fetch('/nav.html')
    .then(res => res.text())
    .then(html => {
        const placeholder = document.getElementById('navbar-placeholder');
        placeholder.outerHTML = html;

        // Mobile navigation logic
        const hamburgerMenu = document.getElementById('hamburger-menu');
        const navLinks = document.getElementById('nav-links');

        if (hamburgerMenu && navLinks) {
            hamburgerMenu.addEventListener('click', () => {
                navLinks.classList.toggle('show');
                hamburgerMenu.classList.toggle('active');
            });
        }
    })
    .catch(err => console.error('Error loading navbar:', err));
