// ========================================
// Wait for DOM to be fully loaded
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - initializing AsyncTest scripts...');

    // ========================================
    // Smooth scroll for navigation links
    // ========================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // ========================================
    // Header scroll effect
    // ========================================
    let lastScroll = 0;
    const header = document.querySelector('.header');

    if (header) {
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;

            if (currentScroll <= 0) {
                header.style.boxShadow = 'none';
            } else {
                header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.5)';
            }

            lastScroll = currentScroll;
        });
    }

    // ========================================
    // Intersection Observer for animations
    // ========================================
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe elements for animation
    document.querySelectorAll('.feature-card, .tech-item, .cta-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(el);
    });

    // ========================================
    // Add parallax effect to glows
    // ========================================
    window.addEventListener('mousemove', (e) => {
        const glows = document.querySelectorAll('.glow');
        const mouseX = e.clientX / window.innerWidth;
        const mouseY = e.clientY / window.innerHeight;

        glows.forEach((glow, index) => {
            const speed = (index + 1) * 20;
            const x = (mouseX - 0.5) * speed;
            const y = (mouseY - 0.5) * speed;
            glow.style.transform = `translate(${x}px, ${y}px)`;
        });
    });

    // ========================================
    // Code highlighting
    // ========================================
    const codeElement = document.querySelector('.code');
    if (codeElement) {
        highlightCode();
    }

    function highlightCode() {
        const code = document.querySelector('.code');
        if (!code) return;

        let html = code.innerHTML;

        // Keywords
        html = html.replace(/\b(import|from|const|await|async|return)\b/g, '<span class="code-keyword">$1</span>');

        // Functions
        html = html.replace(/\b(httpPost)\b/g, '<span class="code-function">$1</span>');

        // Strings
        html = html.replace(/'([^']*)'/g, '<span class="code-string">\'$1\'</span>');

        // Variables
        html = html.replace(/\b(testAPI|response)\b/g, '<span class="code-variable">$1</span>');

        // Properties
        html = html.replace(/(\w+):/g, '<span class="code-property">$1</span>:');

        // Comments
        html = html.replace(/(\/\/.*)/g, '<span class="code-comment">$1</span>');

        code.innerHTML = html;
    }

    // ========================================
    // Login Panel Functionality
    // ========================================
    console.log('Initializing login panel...');

    const loginTriggers = document.querySelectorAll('.btn-login-trigger');
    const loginCloseBtn = document.querySelector('.login-close');
    const loginCloseBtnById = document.getElementById('loginCloseBtn');
    const loginPanel = document.querySelector('.login-panel');
    const mainWrapper = document.querySelector('.main-wrapper');

    console.log('Login triggers found:', loginTriggers.length);
    console.log('Login close button (by class):', loginCloseBtn ? 'Found' : 'Not found');
    console.log('Login close button (by ID):', loginCloseBtnById ? 'Found' : 'Not found');
    console.log('Login panel:', loginPanel ? 'Found' : 'Not found');

    // 使用 ID 选择的按钮（更可靠）
    const closeBtn = loginCloseBtnById || loginCloseBtn;

    // Open login panel
    if (loginTriggers.length > 0) {
        loginTriggers.forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                console.log('Login button clicked!');
                e.preventDefault();
                e.stopPropagation();

                // Add login-active class
                document.body.classList.add('login-active');
                console.log('Body classes:', document.body.className);
                console.log('Has login-active:', document.body.classList.contains('login-active'));

                // Disable body scroll when login panel is open
                document.body.style.overflow = 'hidden';

                // Check if login panel exists and log its computed styles
                if (loginPanel) {
                    const styles = window.getComputedStyle(loginPanel);
                    console.log('Login panel transform:', styles.transform);
                    console.log('Login panel display:', styles.display);
                    console.log('Login panel visibility:', styles.visibility);
                }

                // Animate form elements
                setTimeout(() => {
                    animateFormElements();
                }, 300);
            });
        });
    } else {
        console.error('No login triggers found!');
    }

    // Close login panel function
    function closeLoginPanel() {
        console.log('=== closeLoginPanel called ===');
        console.log('Before remove - Body classes:', document.body.className);

        document.body.classList.remove('login-active');

        console.log('After remove - Body classes:', document.body.className);
        console.log('Has login-active:', document.body.classList.contains('login-active'));

        // Re-enable body scroll
        document.body.style.overflow = '';

        // Reset form animations
        const formElements = document.querySelectorAll('.login-header, .form-group, .btn-login-submit, .divider, .social-login, .signup-prompt');
        console.log('Resetting', formElements.length, 'form elements');
        formElements.forEach(element => {
            element.style.opacity = '';
            element.style.transform = '';
            element.style.transition = '';
            element.style.transitionDelay = '';
        });

        console.log('=== closeLoginPanel finished ===');
    }

    // Close button event
    if (closeBtn) {
        console.log('Binding close button event to:', closeBtn);
        console.log('Button element:', closeBtn);
        console.log('Button classes:', closeBtn.className);
        console.log('Button ID:', closeBtn.id);

        // 使用多种方式绑定事件，确保至少一种有效
        closeBtn.addEventListener('click', (e) => {
            console.log('Close button clicked!');
            e.preventDefault();
            e.stopPropagation();
            closeLoginPanel();
        }, false);

        // 额外添加 mousedown 事件作为备用
        closeBtn.addEventListener('mousedown', (e) => {
            console.log('Close button mousedown!');
        });

        // 添加触摸事件支持
        closeBtn.addEventListener('touchstart', (e) => {
            console.log('Close button touchstart!');
            e.preventDefault();
            closeLoginPanel();
        });
    } else {
        console.error('Close button not found!');
    }

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('login-active')) {
            closeLoginPanel();
        }
    });

    // Close when clicking on main wrapper
    if (mainWrapper) {
        mainWrapper.addEventListener('click', (e) => {
            console.log('Main wrapper clicked');
            if (document.body.classList.contains('login-active')) {
                console.log('Login is active, closing...');
                closeLoginPanel();
            }
        });
    }

    // Prevent login panel from closing when clicking inside it
    if (loginPanel) {
        loginPanel.addEventListener('click', (e) => {
            console.log('Login panel clicked, preventing close');
            e.stopPropagation();
        });
    } else {
        console.error('Login panel element not found!');
    }

    // Add entrance animation to form elements when panel opens
    function animateFormElements() {
        const formElements = document.querySelectorAll('.login-header, .form-group, .btn-login-submit, .divider, .social-login, .signup-prompt');

        formElements.forEach((element, index) => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(20px)';
            element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            element.style.transitionDelay = `${index * 0.1}s`;

            setTimeout(() => {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, 100);
        });
    }

    // ========================================
    // Password Toggle Functionality
    // ========================================
    const passwordToggle = document.querySelector('.password-toggle');
    if (passwordToggle) {
        const passwordInput = passwordToggle.closest('.input-wrapper').querySelector('input[type="password"]');
        let passwordVisible = false;

        passwordToggle.addEventListener('click', () => {
            passwordVisible = !passwordVisible;
            passwordInput.type = passwordVisible ? 'text' : 'password';

            // Update icon color
            if (passwordVisible) {
                passwordToggle.style.color = 'var(--color-accent)';
            } else {
                passwordToggle.style.color = 'var(--color-text-tertiary)';
            }
        });
    }

    // ========================================
    // Form Submission
    // ========================================
    const loginForm = document.querySelector('.login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const email = loginForm.querySelector('input[type="email"]').value;
            const password = loginForm.querySelector('input[type="password"]').value;
            const rememberMe = loginForm.querySelector('.checkbox-input').checked;

            console.log('Login attempt:', { email, rememberMe });

            // Show loading state on button
            const submitBtn = loginForm.querySelector('.btn-login-submit');
            const originalContent = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span>登录中...</span>';
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.7';

            // Simulate login (replace with actual API call)
            setTimeout(() => {
                console.log('Login successful!');

                // Show success message
                submitBtn.innerHTML = '<span>登录成功！</span>';
                submitBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';

                // Close panel and reset after delay
                setTimeout(() => {
                    closeLoginPanel();
                    submitBtn.innerHTML = originalContent;
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = '1';
                    submitBtn.style.background = '';
                    loginForm.reset();
                }, 1500);
            }, 2000);
        });
    }

    // ========================================
    // Social Login Buttons
    // ========================================
    const socialButtons = document.querySelectorAll('.btn-social');

    socialButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const provider = button.querySelector('span').textContent;
            console.log(`Social login with ${provider}`);

            // Add loading effect
            button.style.opacity = '0.7';
            button.disabled = true;

            setTimeout(() => {
                button.style.opacity = '1';
                button.disabled = false;
                alert(`${provider} 登录功能开发中...`);
            }, 1000);
        });
    });

    // ========================================
    // Input Focus Effects
    // ========================================
    const formInputs = document.querySelectorAll('.form-input');

    formInputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.parentElement.style.transform = 'scale(1.02)';
            input.parentElement.style.transition = 'transform 0.2s ease';
        });

        input.addEventListener('blur', () => {
            input.parentElement.style.transform = 'scale(1)';
        });
    });

    // ========================================
    // Add hover effect to buttons
    // ========================================
    document.querySelectorAll('button, .btn-hero-primary, .btn-hero-secondary').forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transition = 'all 0.3s ease';
        });
    });

    // ========================================
    // Console welcome message
    // ========================================
    console.log('%c🚀 AsyncTest', 'font-size: 24px; font-weight: bold; color: #3b82f6;');
    console.log('%c现代化 API 测试与管理平台', 'font-size: 14px; color: #a0a0a0;');
    console.log('%cGitHub: https://github.com/asynctest', 'font-size: 12px; color: #666;');
    console.log('%cAll scripts initialized successfully!', 'font-size: 12px; color: #10b981;');
});

// ========================================
// Add loading state
// ========================================
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';

    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});
