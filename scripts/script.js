// ===== PERFORMANCE OPTIMIZATIONS =====
'use strict';

// Cache DOM elements for better performance
const DOM = {
    navbar: null,
    cartCount: null,
    cartItems: [],
    scrollThreshold: 100,
    isScrolling: false,
    scrollTimeout: null
};

// ===== FIREBASE INITIALIZATION =====
let db = null;

function initializeFirebase() {
    try {
        if (typeof firebase !== 'undefined') {
            // Check if Firebase is already initialized
            if (!firebase.apps.length) {
                const firebaseConfig = {
                    apiKey: "AIzaSyAbx9j0EnImiqjnOWQnHdaTMMSBrn5Cqho",
                    authDomain: "e-commerce-ffc52.firebaseapp.com",
                    projectId: "e-commerce-ffc52",
                    storageBucket: "e-commerce-ffc52.firebasestorage.app",
                    messagingSenderId: "560697224733",
                    appId: "1:560697224733:web:a72dd774f4c9c355eea0f4",
                    measurementId: "G-SVDW71Z94G"
                };
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.firestore();
            console.log('Firebase initialized successfully');
        } else {
            console.warn('Firebase not loaded yet');
        }
    } catch (error) {
        console.error('Firebase initialization error:', error);
    }
}

// ===== UTILITIES =====
const utils = {
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    scrollToElement(element, offset = 100) {
        if (element) {
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    },

    isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },

    formatPrice(price) {
        return `LE ${parseFloat(price).toFixed(2)}`;
    },

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }
};

// ===== CART MANAGEMENT =====
class CartManager {
    constructor() {
        try {
            const savedCart = localStorage.getItem('cart');
            this.items = savedCart ? JSON.parse(savedCart) : [];
            // Ensure items is always an array
            if (!Array.isArray(this.items)) {
                this.items = [];
            }
        } catch (error) {
            console.error('Error loading cart from localStorage:', error);
            this.items = [];
        }
        // Delay cart display update to ensure DOM is ready
        setTimeout(() => this.updateCartDisplay(), 100);
    }

    addItem(name, price, image, quantity = 1) {
        const existingItem = this.items.find(item => item.name === name);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.items.push({
                id: utils.generateId(),
                name,
                price,
                image,
                quantity
            });
        }
        
        this.saveCart();
        this.updateCartDisplay();
        return this.items;
    }

    removeItem(id) {
        this.items = this.items.filter(item => item.id !== id);
        this.saveCart();
        this.updateCartDisplay();
        return this.items;
    }

    updateQuantity(id, quantity) {
        const item = this.items.find(item => item.id === id);
        if (item) {
            if (quantity <= 0) {
                this.removeItem(id);
            } else {
                item.quantity = quantity;
                this.saveCart();
                this.updateCartDisplay();
            }
        }
        return this.items;
    }

    getTotal() {
        return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    getItemCount() {
        return this.items.reduce((count, item) => count + item.quantity, 0);
    }

    clearCart() {
        this.items = [];
        this.saveCart();
        this.updateCartDisplay();
    }

    saveCart() {
        try {
            localStorage.setItem('cart', JSON.stringify(this.items));
        } catch (error) {
            console.error('Failed to save cart to localStorage:', error);
        }
    }

    updateCartDisplay() {
        const cartCount = document.querySelector('.cart-count');
        const cartTotal = document.querySelector('.cart-total');
        
        if (cartCount) {
            cartCount.textContent = this.getItemCount();
            cartCount.setAttribute('aria-label', `${this.getItemCount()} items in cart`);
        }
        
        if (cartTotal) {
            const total = this.getTotal();
            cartTotal.textContent = this.formatPrice(total);
        }
    }

    formatPrice(price) {
        return utils.formatPrice(price);
    }

    showCart() {
        if (this.items.length === 0) {
            Swal.fire({
                icon: 'info',
                title: 'Your Cart is Empty',
                text: 'Add some elegant pieces to your cart to get started.',
                confirmButtonColor: '#1a1a1a'
            });
            return;
        }
        
        let cartContent = '<div class="cart-items">';
        this.items.forEach(item => {
            cartContent += `
                <div class="cart-item">
                    <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                    <div class="cart-item-details">
                        <h6>${item.name}</h6>
                        <p class="cart-item-price">${this.formatPrice(item.price)}</p>
                        <p class="cart-item-quantity">Quantity: ${item.quantity}</p>
                    </div>
                    <button onclick="cartManager.removeItem('${item.id}')" class="cart-remove-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        });
        
        cartContent += `
            <div class="cart-total">
                <h5>Total: ${this.formatPrice(this.getTotal())}</h5>
            </div>
            <div class="cart-actions">
                <button onclick="cartManager.clearCart()" class="btn btn-outline-secondary">Clear Cart</button>
                <button onclick="cartManager.checkout()" class="btn btn-primary">Checkout</button>
            </div>
        </div>`;
        
        Swal.fire({
            title: 'Your Shopping Cart',
            html: cartContent,
            showConfirmButton: false,
            showCloseButton: true,
            width: '600px',
            customClass: {
                container: 'cart-modal'
            }
        });
    }

    checkout() {
        console.log('Checkout called, items:', this.items);
        
        if (this.items.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Empty Cart',
                text: 'Your cart is empty. Please add some items before checkout.'
            });
            return;
        }

        console.log('Redirecting to checkout page...');
        // Redirect to checkout page
        window.location.href = 'checkout.html';
    }
}

// ===== SCROLL MANAGEMENT =====
class ScrollManager {
    constructor() {
        this.isScrolling = false;
        this.scrollTimeout = null;
        this.init();
    }

    init() {
        // Throttled scroll handler for better performance
        const throttledScrollHandler = utils.throttle(() => {
            this.handleScroll();
        }, 16); // ~60fps

        window.addEventListener('scroll', throttledScrollHandler, { passive: true });
        
        // Handle scroll end
        window.addEventListener('scroll', utils.debounce(() => {
            this.isScrolling = false;
            this.handleScrollEnd();
        }, 150), { passive: true });
    }

    handleScroll() {
        if (!this.isScrolling) {
            this.isScrolling = true;
        }

        const navbar = document.querySelector('.navbar');
        if (!navbar) return;

        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }

    handleScrollEnd() {
        // Trigger any scroll-end animations or effects
        const elements = document.querySelectorAll('.fade-in-up');
        elements.forEach(element => {
            if (utils.isInViewport(element) && !element.classList.contains('animated')) {
                element.classList.add('animated');
            }
        });
    }
}

// ===== ANIMATION MANAGER =====
class AnimationManager {
    constructor() {
        this.observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        this.init();
    }

    init() {
        // Use Intersection Observer for better performance
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animated');
                        observer.unobserve(entry.target);
                    }
                });
            }, this.observerOptions);

            // Observe all elements with animation classes
            document.querySelectorAll('.fade-in, .fade-in-up').forEach(el => {
                observer.observe(el);
            });
        } else {
            // Fallback for older browsers
            this.fallbackAnimation();
        }
    }

    fallbackAnimation() {
        const elements = document.querySelectorAll('.fade-in, .fade-in-up');
        elements.forEach((element, index) => {
            setTimeout(() => {
                element.classList.add('animated');
            }, index * 100);
        });
    }
}

// ===== PRODUCT MANAGER =====
class ProductManager {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.currentFilters = {
            category: 'all',
            search: '',
            sort: 'name'
        };
        this.init();
    }

    init() {
        this.loadProducts().then(() => {
            this.setupEventListeners();
        }).catch(error => {
            console.error('Error initializing ProductManager:', error);
            this.setupEventListeners();
        });
    }

    async loadProducts() {
        try {
            if (!db) {
                console.warn('Firebase not initialized');
                this.products = [];
                this.filteredProducts = [];
                return;
            }
            
            const snapshot = await db.collection('products').get();
            this.products = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            this.filteredProducts = [...this.products];
            this.renderProducts();
        } catch (error) {
            console.error('Error loading products:', error);
            this.products = [];
            this.filteredProducts = [];
            this.renderProducts();
        }
    }

    setupEventListeners() {
        // Category filter
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.currentFilters.category = e.target.value;
                this.filterProducts();
            });
        }

        // Search filter
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            const debouncedSearch = utils.debounce((e) => {
                this.currentFilters.search = e.target.value.toLowerCase();
                this.filterProducts();
            }, 300);
            
            searchInput.addEventListener('input', debouncedSearch);
        }

        // Sort filter
        const sortFilter = document.getElementById('sort-filter');
        if (sortFilter) {
            sortFilter.addEventListener('change', (e) => {
                this.currentFilters.sort = e.target.value;
                this.filterProducts();
            });
        }
    }

    filterProducts() {
        this.filteredProducts = this.products.filter(product => {
            const matchesCategory = this.currentFilters.category === 'all' || 
                                  product.category === this.currentFilters.category;
            const matchesSearch = product.name.toLowerCase().includes(this.currentFilters.search);
            
            return matchesCategory && matchesSearch;
        });

        this.sortProducts();
        this.renderProducts();
    }

    sortProducts() {
        switch (this.currentFilters.sort) {
            case 'price-low':
                this.filteredProducts.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                this.filteredProducts.sort((a, b) => b.price - a.price);
                break;
            case 'name':
            default:
                this.filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
                break;
        }
    }

    renderProducts() {
        const productsContainer = document.getElementById('products-container');
        if (!productsContainer) return;

        productsContainer.innerHTML = '';

        if (this.filteredProducts.length === 0) {
            productsContainer.innerHTML = `
                <div class="col-12 text-center">
                    <p class="mb-4">No products found matching your criteria.</p>
                    <button class="hero-btn" onclick="productManager.clearFilters()">Clear Filters</button>
                </div>
            `;
            return;
        }

        this.filteredProducts.forEach(product => {
            const productCard = this.createProductCard(product);
            productsContainer.appendChild(productCard);
        });
    }

    createProductCard(product) {
        const col = document.createElement('div');
        col.className = 'col-xl-3 col-lg-4 col-md-6 col-sm-6 product-item';
        
        col.innerHTML = `
            <div class="product-card">
                <div class="product-image">
                    <img src="${product.image || ''}" alt="${product.name}" class="img-fluid" loading="lazy">
                    <div class="product-overlay">
                        <button class="btn" onclick="window.location.href='product.html?id=${product.id}'">View Details</button>
                    </div>
                </div>
                <div class="product-info">
                    <div class="product-category">${product.category || 'Accessories'}</div>
                    <h5>${product.name}</h5>
                    <p class="product-description">${product.description || 'Beautiful handmade accessory'}</p>
                    <p class="price">LE ${product.price}</p>
                    <div class="product-actions">
                        <button class="btn btn-view-details" onclick="window.location.href='product.html?id=${product.id}'">
                            <i class="fas fa-eye me-1"></i>View Details
                        </button>
                        <button class="btn btn-add-cart" onclick="addToCart('${product.name}', ${product.price}, '${product.image}')">
                            <i class="fas fa-shopping-cart me-1"></i>Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        return col;
    }

    clearFilters() {
        this.currentFilters = {
            category: 'all',
            search: '',
            sort: 'name'
        };
        
        // Reset form elements
        const categoryFilter = document.getElementById('category-filter');
        const searchInput = document.getElementById('search-input');
        const sortFilter = document.getElementById('sort-filter');
        
        if (categoryFilter) categoryFilter.value = 'all';
        if (searchInput) searchInput.value = '';
        if (sortFilter) sortFilter.value = 'name';
        
        this.filterProducts();
    }
}

// ===== NOTIFICATION MANAGER =====
class NotificationManager {
    static showSuccess(message) {
        Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: message,
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
    }

    static showError(message) {
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: message,
            confirmButtonText: 'OK'
        });
    }

    static showCart() {
        if (cartManager.items.length === 0) {
            Swal.fire({
                icon: 'info',
                title: 'Your Cart',
                text: 'Your cart is empty.',
                confirmButtonText: 'Continue Shopping'
            });
            return;
        }

        let cartHTML = '<div class="cart-items">';
        cartManager.items.forEach(item => {
            cartHTML += `
                <div class="cart-item" style="display: flex; align-items: center; margin-bottom: 1rem; padding: 1rem; border: 1px solid #eee; border-radius: 10px;">
                    <img src="${item.image}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; margin-right: 1rem;">
                    <div style="flex: 1;">
                        <h6 style="margin: 0 0 0.5rem 0;">${item.name}</h6>
                        <p style="margin: 0; color: #666;">${utils.formatPrice(item.price)} x ${item.quantity}</p>
                    </div>
                    <button onclick="cartManager.removeItem('${item.id}'); showCart();" style="background: #ff4444; color: white; border: none; padding: 0.5rem; border-radius: 5px; cursor: pointer;">Remove</button>
                </div>
            `;
        });
        cartHTML += `<div style="text-align: right; margin-top: 1rem; font-weight: bold;">Total: ${utils.formatPrice(cartManager.getTotal())}</div>`;
        cartHTML += '</div>';

        Swal.fire({
            title: 'Your Cart',
            html: cartHTML,
            showCancelButton: true,
            confirmButtonText: 'Checkout',
            cancelButtonText: 'Continue Shopping',
            width: '600px'
        }).then((result) => {
            if (result.isConfirmed) {
                cartManager.checkout();
            }
        });
    }

    static showCheckout() {
        // This method is deprecated - checkout now redirects to checkout.html
        cartManager.checkout();
    }
}

// ===== FORM VALIDATION =====
class FormValidator {
    static validateContactForm() {
        const name = document.getElementById('contact-name')?.value.trim();
        const email = document.getElementById('contact-email')?.value.trim();
        const message = document.getElementById('contact-message')?.value.trim();

        if (!name) {
            NotificationManager.showError('Please enter your name.');
            return false;
        }

        if (!email || !this.isValidEmail(email)) {
            NotificationManager.showError('Please enter a valid email address.');
            return false;
        }

        if (!message) {
            NotificationManager.showError('Please enter your message.');
            return false;
        }

        return true;
    }

    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

// ===== GLOBAL FUNCTIONS =====
let cartManager, scrollManager, animationManager, productManager;

// Initialize all managers
function initializeApp() {
    try {
        // Initialize Firebase first
        initializeFirebase();
        
        cartManager = new CartManager();
        scrollManager = new ScrollManager();
        animationManager = new AnimationManager();
        productManager = new ProductManager();
        
        // Setup auth state listener
        setupAuthStateListener();
        
        // Initialize shop page if on shop page
        initializeShopPage();
        
        // Update cart display after everything is initialized
        setTimeout(() => {
            if (cartManager) {
                cartManager.updateCartDisplay();
            }
        }, 200);
        
        console.log('Hana Store initialized successfully');
    } catch (error) {
        console.error('Failed to initialize app:', error);
    }
}

// Global functions for HTML onclick handlers
function addToCart(name, price, image) {
    try {
        cartManager.addItem(name, price, image);
        NotificationManager.showSuccess(`${name} added to cart!`);
    } catch (error) {
        console.error('Failed to add item to cart:', error);
        NotificationManager.showError('Failed to add item to cart.');
    }
}

function showCart() {
    cartManager.showCart();
}

function submitContactForm() {
    if (FormValidator.validateContactForm()) {
        // Simulate form submission
        NotificationManager.showSuccess('Thank you for your message! We\'ll get back to you soon.');
        
        // Clear form
        document.getElementById('contact-name').value = '';
        document.getElementById('contact-email').value = '';
        document.getElementById('contact-message').value = '';
    }
}

// ===== LAZY LOADING =====
function setupLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });

        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
}

// ===== SERVICE WORKER REGISTRATION =====
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        // Only register service worker if not running on file:// protocol
        if (window.location.protocol === 'file:') {
            console.log('Service Worker not registered: Running on file:// protocol');
            return;
        }
        
        window.addEventListener('load', () => {
            // Check if service worker file exists before registering
            fetch('/sw.js')
                .then(response => {
                    if (response.ok) {
                        return navigator.serviceWorker.register('/sw.js');
                    } else {
                        console.log('Service Worker file not found, skipping registration');
                        return Promise.reject('SW file not found');
                    }
                })
                .then(registration => {
                    console.log('SW registered: ', registration);
                })
                .catch(registrationError => {
                    console.log('SW registration failed: ', registrationError);
                });
        });
    }
}

// ===== PERFORMANCE MONITORING =====
function setupPerformanceMonitoring() {
    // Monitor Core Web Vitals
    if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                console.log(`${entry.name}: ${entry.value}`);
            }
        });
        
        observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
    }
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupLazyLoading();
    registerServiceWorker();
    setupPerformanceMonitoring();
});

// ===== ERROR HANDLING =====
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

// ===== EXPORT FOR MODULE USE =====
// Backend export removed for frontend-only use 

// ===== FIREBASE FIRESTORE HELPERS =====
// Fetch all products from Firestore
async function getProducts() {
    if (!db) {
        console.warn('Firebase not initialized');
        return [];
    }
    try {
        const snapshot = await db.collection('products').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error fetching products:', error);
        return [];
    }
}

// Add a new product to Firestore
async function addProduct(product) {
    if (!db) {
        console.warn('Firebase not initialized');
        return null;
    }
    try {
        const docRef = await db.collection('products').add(product);
        return docRef.id;
    } catch (error) {
        console.error('Error adding product:', error);
        return null;
    }
}

// User authentication helpers
async function signUp(email, password) {
    if (!firebase.auth) {
        console.warn('Firebase Auth not available');
        return null;
    }
    try {
        return await firebase.auth().createUserWithEmailAndPassword(email, password);
    } catch (error) {
        console.error('Sign up error:', error);
        throw error;
    }
}

async function signIn(email, password) {
    if (!firebase.auth) {
        console.warn('Firebase Auth not available');
        return null;
    }
    try {
        return await firebase.auth().signInWithEmailAndPassword(email, password);
    } catch (error) {
        console.error('Sign in error:', error);
        throw error;
    }
}

async function signOut() {
    if (!firebase.auth) {
        console.warn('Firebase Auth not available');
        return null;
    }
    try {
        return await firebase.auth().signOut();
    } catch (error) {
        console.error('Sign out error:', error);
        throw error;
    }
}

// ===== USER PROFILE SYNC TO FIRESTORE =====
function syncUserProfile(user, extraData = {}) {
    if (!user || !db) return;
    try {
        const userRef = db.collection('users').doc(user.uid);
        // Merge extraData (e.g., name, address) if provided
        return userRef.set({
            email: user.email,
            name: user.displayName || extraData.name || '',
            ...extraData
        }, { merge: true });
    } catch (error) {
        console.error('Error syncing user profile:', error);
    }
}

// ===== NAVBAR AUTH BUTTONS HANDLING =====
function setupAuthStateListener() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
                // Find the Account dropdown and replace it with Welcome dropdown
                var authDropdown = document.getElementById('authDropdown')?.parentElement;
                if (authDropdown && !document.getElementById('welcomeDropdown')) {
                    var userName = user.displayName || (user.email ? user.email.split('@')[0] : 'User');
                    authDropdown.innerHTML = `
                        <a class="nav-link dropdown-toggle" href="#" id="navbarWelcomeDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="fas fa-user me-1"></i>Welcome, ${userName}
                        </a>
                        <ul class="dropdown-menu" aria-labelledby="navbarWelcomeDropdown">
                            <li><a class="dropdown-item" href="#" id="myProfileBtnNav">
                                <i class="fas fa-user me-2"></i>My Profile
                            </a></li>
                            <li><a class="dropdown-item" href="#" id="myOrdersBtnNav">
                                <i class="fas fa-shopping-bag me-2"></i>My Orders
                            </a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item" href="#" id="logoutBtnNav">
                                <i class="fas fa-sign-out-alt me-2"></i>Logout
                            </a></li>
                        </ul>
                    `;
                    authDropdown.id = 'welcomeDropdown';
                    
                    // Add event handlers
                    setTimeout(function() {
                        var logoutBtn = document.getElementById('logoutBtnNav');
                        var myProfileBtn = document.getElementById('myProfileBtnNav');
                        var myOrdersBtn = document.getElementById('myOrdersBtnNav');
                        
                        if (logoutBtn) {
                            logoutBtn.onclick = function(e) {
                                e.preventDefault();
                                firebase.auth().signOut();
                                window.location.reload();
                            };
                        }
                        
                        if (myProfileBtn) {
                            myProfileBtn.onclick = function(e) {
                                e.preventDefault();
                                // Navigate to profile page or show profile modal
                                showUserProfile(user);
                            };
                        }
                        
                        if (myOrdersBtn) {
                            myOrdersBtn.onclick = function(e) {
                                e.preventDefault();
                                // Navigate to user orders page
                                showUserOrders(user);
                            };
                        }
                    }, 100);
                }
            } else {
                // User is not authenticated, ensure Account dropdown is present
                var welcomeDropdown = document.getElementById('welcomeDropdown');
                if (welcomeDropdown) {
                    welcomeDropdown.innerHTML = `
                        <a class="nav-link dropdown-toggle" href="#" id="authDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="fas fa-user me-1"></i>Account
                        </a>
                        <ul class="dropdown-menu" aria-labelledby="authDropdown">
                            <li><a class="dropdown-item" href="login.html">
                                <i class="fas fa-sign-in-alt me-2"></i>Sign In
                            </a></li>
                            <li><a class="dropdown-item" href="login.html#signup">
                                <i class="fas fa-user-plus me-2"></i>Sign Up
                            </a></li>
                        </ul>
                    `;
                    welcomeDropdown.id = '';
                }
            }
        });
    }
}

// ===== SHOP PAGE FUNCTIONALITY =====
let allProducts = [];
let filteredProducts = [];

// ===== ORDER MANAGEMENT =====
let allOrders = [];
let filteredOrders = [];

// Load orders for admin dashboard
async function loadOrders() {
    try {
        const db = firebase.firestore();
        const ordersSnapshot = await db.collection('orders').orderBy('orderDate', 'desc').get();
        
        allOrders = [];
        ordersSnapshot.forEach(doc => {
            allOrders.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        filteredOrders = [...allOrders];
        renderOrders(filteredOrders);
        updateOrderStats();
    } catch (error) {
        console.error('Error loading orders:', error);
        document.getElementById('orders-list').innerHTML = '<p class="text-danger">Error loading orders.</p>';
    }
}

// Render orders in admin dashboard
function renderOrders(orders) {
    const container = document.getElementById('orders-list');
    if (!container) return;
    
    if (!orders.length) {
        container.innerHTML = '<p class="text-muted">No orders found.</p>';
        return;
    }
    
    container.innerHTML = orders.map(order => `
        <div class="product-item">
            <div class="row align-items-center">
                <div class="col-md-3">
                    <div class="d-flex align-items-center">
                        <div class="me-3">
                            <strong>#${order.orderNumber}</strong><br>
                            <small class="text-muted">${formatDate(order.orderDate)}</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div>
                        <strong>${order.customerInfo.firstName} ${order.customerInfo.lastName}</strong><br>
                        <small class="text-muted">${order.customerInfo.email}</small>
                    </div>
                </div>
                <div class="col-md-2">
                    <span class="badge bg-${getStatusColor(order.status)}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                </div>
                <div class="col-md-2">
                    <strong>LE ${order.totals.total.toFixed(2)}</strong><br>
                    <small class="text-muted">${order.items.length} items</small>
                </div>
                <div class="col-md-2">
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary" onclick="viewOrderDetails('${order.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="updateOrderStatus('${order.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Get status color for badges
function getStatusColor(status) {
    switch (status) {
        case 'pending': return 'warning';
        case 'confirmed': return 'info';
        case 'shipped': return 'primary';
        case 'delivered': return 'success';
        case 'cancelled': return 'danger';
        default: return 'secondary';
    }
}

// Filter orders by status
function filterOrders() {
    const statusFilter = document.getElementById('order-status-filter').value;
    const searchTerm = document.getElementById('order-search').value.toLowerCase();
    
    filteredOrders = allOrders.filter(order => {
        const matchesStatus = !statusFilter || order.status === statusFilter;
        const matchesSearch = !searchTerm || 
            order.orderNumber.toLowerCase().includes(searchTerm) ||
            order.customerInfo.firstName.toLowerCase().includes(searchTerm) ||
            order.customerInfo.lastName.toLowerCase().includes(searchTerm) ||
            order.customerInfo.email.toLowerCase().includes(searchTerm);
        
        return matchesStatus && matchesSearch;
    });
    
    renderOrders(filteredOrders);
}

// Search orders
function searchOrders(query) {
    filterOrders(); // This will handle both status filter and search
}

// View order details
function viewOrderDetails(orderId) {
    window.open(`order-details.html?id=${orderId}`, '_blank');
}

// Update order status
async function updateOrderStatus(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const { value: newStatus } = await Swal.fire({
        title: 'Update Order Status',
        input: 'select',
        inputOptions: {
            'pending': 'Pending',
            'confirmed': 'Confirmed',
            'shipped': 'Shipped',
            'delivered': 'Delivered',
            'cancelled': 'Cancelled'
        },
        inputValue: order.status,
        showCancelButton: true,
        confirmButtonText: 'Update',
        cancelButtonText: 'Cancel'
    });
    
    if (newStatus && newStatus !== order.status) {
        try {
            const db = firebase.firestore();
            await db.collection('orders').doc(orderId).update({
                status: newStatus,
                lastUpdated: new Date()
            });
            
            // Update local data
            order.status = newStatus;
            renderOrders(filteredOrders);
            
            Swal.fire({
                icon: 'success',
                title: 'Status Updated',
                text: `Order status updated to ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`
            });
        } catch (error) {
            console.error('Error updating order status:', error);
            Swal.fire({
                icon: 'error',
                title: 'Update Failed',
                text: 'Failed to update order status. Please try again.'
            });
        }
    }
}

// Update order statistics
function updateOrderStats() {
    const totalOrders = allOrders.length;
    const pendingOrders = allOrders.filter(o => o.status === 'pending').length;
    const totalRevenue = allOrders.reduce((sum, order) => sum + order.totals.total, 0);
    
    document.getElementById('total-orders').textContent = totalOrders;
    
    // You can add more stats here if needed
    console.log(`Total Orders: ${totalOrders}, Pending: ${pendingOrders}, Revenue: LE ${totalRevenue.toFixed(2)}`);
}

// Format date for display
function formatDate(date) {
    if (date && date.toDate) {
        date = date.toDate();
    }
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// Initialize shop page
function initializeShopPage() {
    const container = document.getElementById('products-container');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    if (!container) return; // Not on shop page
    
    async function fetchProducts() {
        if (!loadingIndicator) return;
        
        loadingIndicator.style.display = '';
        try {
            const products = await getProducts();
            allProducts = products;
            filteredProducts = products;
            loadingIndicator.style.display = 'none';
            renderProducts(filteredProducts);
        } catch (error) {
            console.error('Error fetching products:', error);
            loadingIndicator.style.display = 'none';
            container.innerHTML = '<div style="width:100%;text-align:center;padding:2rem;">Error loading products.</div>';
        }
    }

    function renderProducts(products) {
        container.innerHTML = '';
        if (!products.length) {
            container.innerHTML = '<div style="width:100%;text-align:center;padding:2rem;">No products found.</div>';
            return;
        }
        
        products.forEach(product => {
            const col = document.createElement('div');
            col.className = 'col-xl-3 col-lg-4 col-md-6 col-sm-6 product-item';
            col.dataset.category = product.category || '';
            col.dataset.price = product.price;
            col.dataset.name = product.name;
            col.innerHTML = `
                <div class="product-card">
                    <div class="product-image">
                        <img src="${product.image || ''}" alt="${product.name}" class="img-fluid" loading="lazy">
                        <div class="product-overlay">
                            <button class="btn" onclick="window.location.href='product.html?id=${product.id}'">View Details</button>
                        </div>
                    </div>
                    <div class="product-info">
                        <div class="product-category">${product.category || 'Accessories'}</div>
                        <h5>${product.name}</h5>
                        <p class="product-description">${product.description || 'Beautiful handmade accessory'}</p>
                        <p class="price">LE ${product.price}</p>
                        <div class="product-actions">
                            <button class="btn btn-view-details" onclick="window.location.href='product.html?id=${product.id}'">
                                <i class="fas fa-eye me-1"></i>View Details
                            </button>
                            <button class="btn btn-add-cart" onclick="addToCart('${product.name}', ${product.price}, '${product.image}')">
                                <i class="fas fa-shopping-cart me-1"></i>Add to Cart
                            </button>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(col);
        });
    }

    // Global functions for HTML onclick handlers
    window.filterProducts = function(category) {
        filteredProducts = (category === 'all') ? allProducts : allProducts.filter(p => (p.category || '').toLowerCase() === category.toLowerCase());
        renderProducts(filteredProducts);
        // Update active button
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
    };

    window.searchProducts = function(query) {
        const searchTerm = query.toLowerCase();
        renderProducts(filteredProducts.filter(product => (product.name || '').toLowerCase().includes(searchTerm)));
    };

    window.sortProducts = function(sortBy) {
        let sorted = [...filteredProducts];
        switch(sortBy) {
            case 'price-low':
                sorted.sort((a, b) => a.price - b.price); 
                break;
            case 'price-high':
                sorted.sort((a, b) => b.price - a.price); 
                break;
            case 'name':
                sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '')); 
                break;
        }
        renderProducts(sorted);
    };

    // Initialize products
    setTimeout(() => {
        fetchProducts();
    }, 200);
}

// ===== USER PROFILE AND ORDERS FUNCTIONS =====

// Show user profile modal
async function showUserProfile(user) {
    try {
        // Get user profile data from Firestore
        const db = firebase.firestore();
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        
        // Create profile modal content
        const profileContent = `
            <div class="text-center mb-4">
                <div class="profile-avatar mb-3">
                    <i class="fas fa-user-circle fa-4x text-primary"></i>
                </div>
                <h4>${user.displayName || user.email.split('@')[0]}</h4>
                <p class="text-muted">${user.email}</p>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label"><strong>First Name:</strong></label>
                        <input type="text" class="form-control" id="profileFirstName" value="${userData.firstName || ''}" placeholder="Enter first name">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label"><strong>Last Name:</strong></label>
                        <input type="text" class="form-control" id="profileLastName" value="${userData.lastName || ''}" placeholder="Enter last name">
                    </div>
                </div>
            </div>
            <div class="mb-3">
                <label class="form-label"><strong>Phone Number:</strong></label>
                <input type="tel" class="form-control" id="profilePhone" value="${userData.phone || ''}" placeholder="Enter phone number">
            </div>
            <div class="mb-3">
                <label class="form-label"><strong>Address:</strong></label>
                <textarea class="form-control" id="profileAddress" rows="3" placeholder="Enter your address">${userData.address || ''}</textarea>
            </div>
            <div class="mb-3">
                <label class="form-label"><strong>Email:</strong></label>
                <input type="email" class="form-control" value="${user.email}" disabled>
                <small class="text-muted">Email cannot be changed</small>
            </div>
        `;
        
        // Show profile modal
        const { isConfirmed } = await Swal.fire({
            title: 'My Profile',
            html: profileContent,
            showCancelButton: true,
            confirmButtonText: 'Save Changes',
            cancelButtonText: 'Cancel',
            width: '600px',
            customClass: {
                container: 'profile-modal'
            },
            didOpen: () => {
                // Add custom styling
                const modal = document.querySelector('.profile-modal');
                if (modal) {
                    modal.style.zIndex = '9999';
                }
            }
        });
        
        if (isConfirmed) {
            // Save profile changes
            const updatedData = {
                firstName: document.getElementById('profileFirstName').value,
                lastName: document.getElementById('profileLastName').value,
                phone: document.getElementById('profilePhone').value,
                address: document.getElementById('profileAddress').value,
                lastUpdated: new Date()
            };
            
            await db.collection('users').doc(user.uid).set(updatedData, { merge: true });
            
            // Update user display name if first/last name provided
            if (updatedData.firstName || updatedData.lastName) {
                const displayName = `${updatedData.firstName || ''} ${updatedData.lastName || ''}`.trim();
                await user.updateProfile({ displayName });
            }
            
            Swal.fire({
                icon: 'success',
                title: 'Profile Updated',
                text: 'Your profile has been updated successfully!',
                timer: 2000
            });
            
            // Refresh the page to update the navbar
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }
        
    } catch (error) {
        console.error('Error showing user profile:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load profile. Please try again.'
        });
    }
}

// Show user orders
async function showUserOrders(user) {
    try {
        // Show loading state
        Swal.fire({
            title: 'Loading Orders...',
            html: '<i class="fas fa-spinner fa-spin fa-2x"></i>',
            showConfirmButton: false,
            allowOutsideClick: false
        });

        // Get user orders from Firestore
        const db = firebase.firestore();
        
        // Try multiple queries to find user orders
        let userOrders = [];
        
        console.log('Searching for orders for user:', user.email, 'UID:', user.uid);
        
        // Query 1: By userEmail (top level field)
        try {
            console.log('Trying query by userEmail:', user.email);
            const ordersByUserEmail = await db.collection('orders')
                .where('userEmail', '==', user.email)
                .orderBy('orderDate', 'desc')
                .get();
            
            console.log('Orders found by userEmail:', ordersByUserEmail.size);
            ordersByUserEmail.forEach(doc => {
                const orderData = doc.data();
                console.log('Order found:', orderData);
                userOrders.push({
                    id: doc.id,
                    ...orderData
                });
            });
        } catch (error) {
            console.log('Query by userEmail failed:', error.message);
        }
        
        // Query 2: By customerInfo.email (nested field)
        try {
            console.log('Trying query by customerInfo.email:', user.email);
            const ordersByCustomerEmail = await db.collection('orders')
                .where('customerInfo.email', '==', user.email)
                .orderBy('orderDate', 'desc')
                .get();
            
            console.log('Orders found by customerInfo.email:', ordersByCustomerEmail.size);
            ordersByCustomerEmail.forEach(doc => {
                // Check if order already exists to avoid duplicates
                const existingOrder = userOrders.find(order => order.id === doc.id);
                if (!existingOrder) {
                    const orderData = doc.data();
                    console.log('Order found:', orderData);
                    userOrders.push({
                        id: doc.id,
                        ...orderData
                    });
                }
            });
        } catch (error) {
            console.log('Query by customerInfo.email failed:', error.message);
        }
        
        // Query 3: By userId (if available)
        try {
            console.log('Trying query by userId:', user.uid);
            const ordersByUserId = await db.collection('orders')
                .where('userId', '==', user.uid)
                .orderBy('orderDate', 'desc')
                .get();
            
            console.log('Orders found by userId:', ordersByUserId.size);
            ordersByUserId.forEach(doc => {
                // Check if order already exists to avoid duplicates
                const existingOrder = userOrders.find(order => order.id === doc.id);
                if (!existingOrder) {
                    const orderData = doc.data();
                    console.log('Order found:', orderData);
                    userOrders.push({
                        id: doc.id,
                        ...orderData
                    });
                }
            });
        } catch (error) {
            console.log('Query by userId failed:', error.message);
        }
        
        // Query 4: Get all orders and filter client-side (fallback)
        if (userOrders.length === 0) {
            try {
                console.log('Trying to get all orders and filter client-side');
                const allOrdersSnapshot = await db.collection('orders').get();
                console.log('Total orders in database:', allOrdersSnapshot.size);
                
                allOrdersSnapshot.forEach(doc => {
                    const orderData = doc.data();
                    console.log('Checking order:', orderData);
                    
                    // Check if this order belongs to the current user
                    const isUserOrder = 
                        orderData.userEmail === user.email ||
                        orderData.userId === user.uid ||
                        (orderData.customerInfo && orderData.customerInfo.email === user.email);
                    
                    if (isUserOrder) {
                        console.log('Found user order in all orders:', orderData);
                        userOrders.push({
                            id: doc.id,
                            ...orderData
                        });
                    }
                });
            } catch (error) {
                console.log('Query all orders failed:', error.message);
            }
        }
        
        console.log('Total user orders found:', userOrders.length);
        
        // Sort orders by date (most recent first)
        userOrders.sort((a, b) => {
            const dateA = a.orderDate?.toDate ? a.orderDate.toDate() : new Date(a.orderDate);
            const dateB = b.orderDate?.toDate ? b.orderDate.toDate() : new Date(b.orderDate);
            return dateB - dateA;
        });
        
        // Close loading dialog
        Swal.close();
        
        if (userOrders.length === 0) {
            Swal.fire({
                title: 'My Orders',
                html: `
                    <div class="text-center py-4">
                        <i class="fas fa-shopping-bag fa-3x text-muted mb-3"></i>
                        <h5>No Orders Yet</h5>
                        <p class="text-muted">You haven't placed any orders yet.</p>
                        <a href="shop.html" class="btn btn-primary">
                            <i class="fas fa-shopping-cart me-2"></i>Start Shopping
                        </a>
                    </div>
                `,
                showConfirmButton: false,
                width: '500px'
            });
            return;
        }
        
        // Create orders list content
        const ordersContent = `
            <div class="user-orders-container" style="max-height: 400px; overflow-y: auto;">
                ${userOrders.map(order => `
                    <div class="order-item mb-3 p-3 border rounded" style="background: #f8f9fa;">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <strong>Order #${order.orderNumber || 'N/A'}</strong>
                                <br>
                                <small class="text-muted">${formatDate(order.orderDate)}</small>
                            </div>
                            <span class="badge bg-${getStatusColor(order.status || 'pending')}">
                                ${(order.status || 'pending').charAt(0).toUpperCase() + (order.status || 'pending').slice(1)}
                            </span>
                        </div>
                        <div class="mb-2">
                            <strong>Total: LE ${(order.totals?.total || 0).toFixed(2)}</strong>
                            <br>
                            <small class="text-muted">${order.items?.length || 0} item${(order.items?.length || 0) > 1 ? 's' : ''}</small>
                        </div>
                        <div class="order-items mb-2">
                            ${(order.items || []).slice(0, 3).map(item => `
                                <span class="badge bg-light text-dark me-1">${item.name || 'Unknown Item'} (${item.quantity || 1})</span>
                            `).join('')}
                            ${(order.items || []).length > 3 ? `<span class="badge bg-secondary">+${(order.items || []).length - 3} more</span>` : ''}
                        </div>
                        <button class="btn btn-sm btn-outline-primary" onclick="viewUserOrderDetails('${order.id}')">
                            <i class="fas fa-eye me-1"></i>View Details
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Show orders modal
        Swal.fire({
            title: 'My Orders',
            html: ordersContent,
            showConfirmButton: false,
            showCloseButton: true,
            width: '700px',
            customClass: {
                container: 'orders-modal'
            },
            didOpen: () => {
                // Add custom styling
                const modal = document.querySelector('.orders-modal');
                if (modal) {
                    modal.style.zIndex = '9999';
                }
            }
        });
        
    } catch (error) {
        console.error('Error showing user orders:', error);
        Swal.close(); // Close loading dialog
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load orders. Please try again.',
            footer: 'If this problem persists, please contact support.'
        });
    }
}

// View user order details
function viewUserOrderDetails(orderId) {
    // Close the current modal
    Swal.close();
    
    // Open order details in a new window/tab
    window.open(`order-details.html?id=${orderId}`, '_blank');
} 