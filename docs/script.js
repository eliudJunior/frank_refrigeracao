document.addEventListener('DOMContentLoaded', () => {
    const FRANK_WHATSAPP_NUMBER = '5587988517205';

    const buildWhatsAppUrl = (message) => {
        return `https://wa.me/${FRANK_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    };

    document.querySelectorAll('[data-whatsapp-direct]').forEach(link => {
        link.href = buildWhatsAppUrl(link.dataset.whatsappDirect);
        link.target = '_blank';
        link.rel = 'noopener';
    });

    // --- Smooth scrolling for Anchor links ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
  
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // --- Intuitive 3D Depth Setup ---
    const siteWrapper = document.createElement('div');
    siteWrapper.className = 'site-wrapper';
    document.body.style.backgroundColor = '#030811'; // Dark backdrop for 3D depth

    // Wrap elements to allow push-back effect
    const childrenToWrap = Array.from(document.body.children).filter(node => 
        node.nodeName !== 'SCRIPT' && 
        node.nodeName !== 'NOSCRIPT' && 
        !(node.classList && node.classList.contains('card-overlay'))
    );
    childrenToWrap.forEach(child => siteWrapper.appendChild(child));
    document.body.insertBefore(siteWrapper, document.body.firstChild);

    // --- Advanced Interactive Service Cards (Elegant Modal) ---
    const serviceCards = document.querySelectorAll('.service-card');
    const overlay = document.querySelector('.card-overlay');

    if (serviceCards && overlay) {
        let originalParent = null; // Track origin for returning

        serviceCards.forEach(card => {
            card.addEventListener('click', (e) => {
                if (card.classList.contains('expanded') || card.classList.contains('expanding') || e.target.closest('a') || e.target.closest('button')) return;

                // --- 1. FIRST ---
                const first = card.getBoundingClientRect();
                originalParent = card.parentNode;

                // Create Placeholder
                const placeholder = document.createElement('div');
                placeholder.className = 'card-placeholder';
                placeholder.style.width = first.width + 'px';
                placeholder.style.height = first.height + 'px';
                originalParent.insertBefore(placeholder, card);

                // --- 2. SETUP MODAL POSITIONS (Invisible) ---
                const targetWidth = Math.min(window.innerWidth * 0.9, 850);
                
                // Move to body and make invisible to calculate height precisely
                Object.assign(card.style, {
                    position: 'fixed',
                    visibility: 'hidden',
                    top: '0',
                    left: '0',
                    width: targetWidth + 'px',
                    height: 'auto',
                    margin: '0',
                    transform: 'none',
                    transition: 'none',
                    zIndex: '2000'
                });
                
                card.classList.remove('reveal', 'reveal-active', 'active');
                card.classList.add('expanding', 'expanded');
                document.body.appendChild(card);
                
                // Get target height and calculate center
                const targetHeight = card.offsetHeight;
                const topPos = Math.max((window.innerHeight - targetHeight) / 2, 20); // Center, but min 20px from top
                const leftPos = (window.innerWidth - targetWidth) / 2;

                // Setup initial "closed" modal state perfectly in center
                Object.assign(card.style, {
                    visibility: 'visible',
                    top: topPos + 'px',
                    left: leftPos + 'px',
                    opacity: '0',
                    transform: 'scale(0.96)',
                    transformOrigin: 'center'
                });

                card.offsetHeight; // Force reflow

                overlay.classList.add('active');
                document.body.classList.add('modal-open');
                
                // Trigger 3D Perspective Shift
                siteWrapper.style.transformOrigin = `50% ${window.scrollY + (window.innerHeight / 2)}px`;
                siteWrapper.classList.add('pushed-back');

                // --- 3. PLAY (Simple, Elegant Fade & Scale) ---
                requestAnimationFrame(() => {
                    // Smooth, simple, premium easing
                    card.style.transition = 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
                    
                    Object.assign(card.style, {
                        opacity: '1',
                        transform: 'scale(1)'
                    });
                });
            });
        });

        const closeExpandedCard = (e) => {
            if (e) e.stopPropagation();
            const card = document.querySelector('.service-card.expanded');
            const placeholder = document.querySelector('.card-placeholder');
            
            if (!card || !placeholder) return;
            
            // Revert state with an ultra-fast, snappy fade out (150ms)
            card.classList.remove('expanded');
            card.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
            
            Object.assign(card.style, {
                opacity: '0',
                transform: 'scale(0.96)'
            });

            overlay.classList.remove('active');
            document.body.classList.remove('modal-open');
            siteWrapper.classList.remove('pushed-back');

            // Cleanup instantly after the quick animation finishes
            setTimeout(() => {
                card.classList.remove('expanding');
                card.style.cssText = ''; 
                
                // Return to grid
                if (placeholder && placeholder.parentNode) {
                    placeholder.parentNode.replaceChild(card, placeholder);
                }
            }, 150);
        };

        // Close on overlay click
        overlay.addEventListener('click', closeExpandedCard);

        // Optional: Close on Escape key
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeExpandedCard();
        });
    }

    // --- BTU Calculator Logic ---
    const btuForm = document.getElementById('btu-calc-form');
    if (btuForm) {
        btuForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const area = parseFloat(document.getElementById('btu-area').value) || 0;
            const people = parseFloat(document.getElementById('people').value) || 0;
            const electronics = parseFloat(document.getElementById('electronics').value) || 0;
            const sun = document.getElementById('sun').value;

            const baseFactor = sun === 'strong' ? 800 : 600;
            let result = area * baseFactor;
            result += (people > 1 ? (people - 1) : 0) * baseFactor;
            result += electronics * baseFactor;

            const display = document.getElementById('btu-result');
            display.innerHTML = `Potência Recomendada: <strong>${result} BTUs</strong>`;
            display.style.display = 'block';
        });
    }

    // --- Scroll Reveal Animation ---
    const revealCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    };

    const revealObserver = new IntersectionObserver(revealCallback, {
        threshold: 0.15
    });

    document.querySelectorAll('.reveal').forEach(el => {
        revealObserver.observe(el);
    });

    console.log("Frank Refrigeração v3.2: Site estático com WhatsApp direto ativado.");
});
