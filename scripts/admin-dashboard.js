// Admin Dashboard Management for Hana Store
// This script handles the admin dashboard functionality

class AdminDashboard {
    constructor() {
        this.db = null;
        this.currentUser = null;
        this.products = [];
        this.orders = [];
        this.users = [];
        this.currentPage = {
            products: 1,
            orders: 1,
            users: 1
        };
        this.itemsPerPage = 10;
        this.filteredData = {
            products: [],
            orders: [],
            users: []
        };
    }

    // Initialize dashboard
    async initialize() {
        if (typeof firebase !== 'undefined') {
            this.db = firebase.firestore();
            
            // Listen for auth state changes
            firebase.auth().onAuthStateChanged((user) => {
                this.currentUser = user;
                this.checkAdminStatus();
            });
        }
    }

    // Check if current user is admin
    async checkAdminStatus() {
        if (!this.currentUser) {
            this.showUserOnly();
            return;
        }

        try {
            const userDoc = await this.db.collection('users').doc(this.currentUser.uid).get();
            const isAdmin = userDoc.exists && userDoc.data().role === 'admin';
            
            if (isAdmin) {
                this.showAdminOnly();
                this.loadDashboardData();
            } else {
                this.showUserOnly();
            }
        } catch (error) {
            console.error('Error checking admin status:', error);
            this.showUserOnly();
        }
    }

    // Show admin interface
    showAdminOnly() {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
        document.querySelectorAll('.user-only').forEach(el => el.style.display = 'none');
    }

    // Show user interface
    showUserOnly() {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.user-only').forEach(el => el.style.display = 'block');
    }

    // Load all dashboard data
    async loadDashboardData() {
        await Promise.all([
            this.loadProducts(),
            this.loadOrders(),
            this.loadUsers()
        ]);
        this.updateStatistics();
    }

    // Load products
    async loadProducts() {
        try {
            const snapshot = await this.db.collection('products').orderBy('createdAt', 'desc').get();
            this.products = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            this.filteredData.products = [...this.products];
            this.renderProducts();
        } catch (error) {
            console.error('Error loading products:', error);
            this.showError('products-table-body', 'Error loading products');
        }
    }

    // Load orders
    async loadOrders() {
        try {
            const snapshot = await this.db.collection('orders').orderBy('orderDate', 'desc').get();
            this.orders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            this.filteredData.orders = [...this.orders];
            this.renderOrders();
        } catch (error) {
            console.error('Error loading orders:', error);
            this.showError('orders-table-body', 'Error loading orders');
        }
    }

    // Load users
    async loadUsers() {
        try {
            console.log('Loading users...');
            
            // First, try to get all users without ordering to see if collection exists
            const snapshot = await this.db.collection('users').get();
            
            if (snapshot.empty) {
                console.log('No users found in collection');
                this.users = [];
                this.filteredData.users = [];
                this.renderUsers();
                return;
            }
            
            console.log(`Found ${snapshot.docs.length} users`);
            
            this.users = snapshot.docs.map(doc => {
                const userData = doc.data();
                console.log('User data:', userData); // Debug log
                return {
                    id: doc.id,
                    email: userData.email || 'No email',
                    displayName: userData.displayName || userData.firstName || userData.name || 'Unknown',
                    firstName: userData.firstName || userData.displayName || 'Unknown',
                    lastName: userData.lastName || '',
                    phone: userData.phone || userData.phoneNumber || 'No phone',
                    role: userData.role || 'user',
                    createdAt: userData.createdAt || userData.created || userData.joinDate || new Date(),
                    updatedAt: userData.updatedAt || userData.updated || new Date()
                };
            });
            
            // Sort users: admins first, then regular users
            this.users.sort((a, b) => {
                // If both have same role, sort by name
                if (a.role === b.role) {
                    return (a.displayName || a.firstName).localeCompare(b.displayName || b.firstName);
                }
                // Admins come first
                return a.role === 'admin' ? -1 : 1;
            });
            
            this.filteredData.users = [...this.users];
            console.log('Processed users:', this.users);
            this.renderUsers();
        } catch (error) {
            console.error('Error loading users:', error);
            
            // If the error is about the collection not existing, create a sample user
            if (error.code === 'not-found' || error.message.includes('not found')) {
                console.log('Users collection does not exist, creating sample data...');
                this.users = [];
                this.filteredData.users = [];
                this.renderUsers();
                
                // Show a helpful message
                this.showError('users-table-body', 'No users collection found. Users will appear here when they register.');
            } else {
                this.showError('users-table-body', `Error loading users: ${error.message}`);
            }
        }
    }

    // Update statistics
    updateStatistics() {
        const totalRevenue = this.orders
            .filter(order => order.status === 'delivered')
            .reduce((sum, order) => sum + (order.totals?.total || 0), 0);

        document.getElementById('total-products').textContent = this.products.length;
        document.getElementById('total-orders').textContent = this.orders.length;
        document.getElementById('total-users').textContent = this.users.length;
        document.getElementById('total-revenue').textContent = `LE ${totalRevenue.toFixed(2)}`;
    }

    // Render products table
    renderProducts() {
        const tbody = document.getElementById('products-table-body');
        const startIndex = (this.currentPage.products - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageProducts = this.filteredData.products.slice(startIndex, endIndex);

        if (pageProducts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-box"></i>
                            <p>No products found</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = pageProducts.map(product => `
            <tr>
                <td>
                    <img src="${product.image}" alt="${product.name}" class="product-image">
                </td>
                <td>
                    <strong>${product.name}</strong><br>
                    <small class="text-muted">${product.description?.substring(0, 50)}...</small>
                </td>
                <td>
                    <span class="badge bg-light text-dark">${product.category || 'N/A'}</span>
                </td>
                <td>
                    <strong>LE ${(product.price || 0).toFixed(2)}</strong>
                </td>
                <td>
                    <span class="badge ${product.inStock ? 'bg-success' : 'bg-danger'}">
                        ${product.inStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-admin btn-sm" onclick="adminDashboard.editProduct('${product.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-admin btn-sm" onclick="adminDashboard.deleteProduct('${product.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        this.renderPagination('products-pagination', this.filteredData.products.length, this.currentPage.products, 'products');
    }

    // Render orders table
    renderOrders() {
        const tbody = document.getElementById('orders-table-body');
        const startIndex = (this.currentPage.orders - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageOrders = this.filteredData.orders.slice(startIndex, endIndex);

        if (pageOrders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-shopping-cart"></i>
                            <p>No orders found</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = pageOrders.map(order => `
            <tr>
                <td>
                    <strong>#${order.orderNumber || order.id.substring(0, 8)}</strong>
                </td>
                <td>
                    <strong>${order.customerInfo?.firstName} ${order.customerInfo?.lastName}</strong><br>
                    <small class="text-muted">${order.customerInfo?.email}</small>
                </td>
                <td>
                    <span class="badge bg-light text-dark">${order.items?.length || 0} items</span>
                </td>
                <td>
                    <strong>LE ${(order.totals?.total || 0).toFixed(2)}</strong>
                </td>
                <td>
                    <span class="status-badge status-${order.status}">${order.status}</span>
                </td>
                <td>
                    <small>${this.formatDate(order.orderDate)}</small>
                </td>
                <td>
                    <button class="btn btn-admin btn-sm" onclick="adminDashboard.viewOrder('${order.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-admin btn-sm" onclick="adminDashboard.updateOrderStatus('${order.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        this.renderPagination('orders-pagination', this.filteredData.orders.length, this.currentPage.orders, 'orders');
    }

    // Render users table
    renderUsers() {
        const tbody = document.getElementById('users-table-body');
        const startIndex = (this.currentPage.users - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageUsers = this.filteredData.users.slice(startIndex, endIndex);

        if (pageUsers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-users"></i>
                            <p>No users found</p>
                            <div class="mt-3">
                                <button class="btn btn-admin me-2" onclick="adminDashboard.createFirstAdmin()">
                                    <i class="fas fa-crown me-2"></i>Create First Admin
                                </button>
                                <button class="btn btn-outline-secondary" onclick="adminDashboard.createSampleUsers()">
                                    <i class="fas fa-plus me-2"></i>Create Sample Users
                                </button>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = pageUsers.map(user => `
            <tr class="${user.role === 'admin' ? 'table-warning' : ''}">
                <td>
                    <div class="d-flex align-items-center">
                        ${user.role === 'admin' ? '<i class="fas fa-crown text-warning me-2" title="Admin"></i>' : ''}
                        <div>
                            <strong>${user.displayName || user.firstName || 'N/A'}</strong>
                            ${user.role === 'admin' ? '<br><small class="text-warning">Administrator</small>' : ''}
                        </div>
                    </div>
                </td>
                <td>
                    ${user.email}<br>
                    <small class="text-muted">${user.phone || 'No phone'}</small>
                </td>
                <td>
                    <span class="badge ${user.role === 'admin' ? 'bg-warning text-dark' : 'bg-success'}">
                        ${user.role === 'admin' ? '<i class="fas fa-crown me-1"></i>' : ''}${user.role || 'user'}
                    </span>
                </td>
                <td>
                    <small>${this.formatDate(user.createdAt)}</small>
                </td>
                <td>
                    ${user.role !== 'admin' ? `
                        <button class="btn btn-admin btn-sm" onclick="adminDashboard.makeAdmin('${user.id}')" title="Make Admin">
                            <i class="fas fa-crown"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-admin btn-sm" onclick="adminDashboard.viewUser('${user.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        this.renderPagination('users-pagination', this.filteredData.users.length, this.currentPage.users, 'users');
    }

    // Render pagination
    renderPagination(containerId, totalItems, currentPage, type) {
        const container = document.getElementById(containerId);
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="adminDashboard.changePage('${type}', ${currentPage - 1})">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                paginationHTML += `
                    <li class="page-item ${i === currentPage ? 'active' : ''}">
                        <a class="page-link" href="#" onclick="adminDashboard.changePage('${type}', ${i})">${i}</a>
                    </li>
                `;
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }

        // Next button
        paginationHTML += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="adminDashboard.changePage('${type}', ${currentPage + 1})">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;

        container.innerHTML = paginationHTML;
    }

    // Change page
    changePage(type, page) {
        this.currentPage[type] = page;
        switch (type) {
            case 'products':
                this.renderProducts();
                break;
            case 'orders':
                this.renderOrders();
                break;
            case 'users':
                this.renderUsers();
                break;
        }
    }

    // Filter products
    filterProducts(searchTerm) {
        this.filteredData.products = this.products.filter(product =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
        this.currentPage.products = 1;
        this.renderProducts();
    }

    // Filter orders
    filterOrders(searchTerm, statusFilter) {
        this.filteredData.orders = this.orders.filter(order => {
            const matchesSearch = !searchTerm || 
                (order.customerInfo?.firstName + ' ' + order.customerInfo?.lastName).toLowerCase().includes(searchTerm.toLowerCase()) ||
                (order.orderNumber || order.id).toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = !statusFilter || order.status === statusFilter;
            
            return matchesSearch && matchesStatus;
        });
        this.currentPage.orders = 1;
        this.renderOrders();
    }

    // Filter users
    filterUsers(searchTerm, roleFilter) {
        this.filteredData.users = this.users.filter(user => {
            const matchesSearch = !searchTerm || 
                (user.displayName || user.firstName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesRole = !roleFilter || user.role === roleFilter;
            
            return matchesSearch && matchesRole;
        });
        
        // Maintain admin-first sorting after filtering
        this.filteredData.users.sort((a, b) => {
            // If both have same role, sort by name
            if (a.role === b.role) {
                return (a.displayName || a.firstName).localeCompare(b.displayName || b.firstName);
            }
            // Admins come first
            return a.role === 'admin' ? -1 : 1;
        });
        
        this.currentPage.users = 1;
        this.renderUsers();
    }

    // Format date
    formatDate(date) {
        if (!date) return 'N/A';
        if (date.toDate) date = date.toDate();
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    // Show error
    showError(containerId, message) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Determine the number of columns based on the container ID
        let colSpan = 6; // Default for products
        if (containerId === 'orders-table-body') colSpan = 7;
        if (containerId === 'users-table-body') colSpan = 5;
        
        container.innerHTML = `
            <tr>
                <td colspan="${colSpan}" class="text-center text-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${message}
                    ${containerId === 'users-table-body' ? `
                        <div class="mt-3">
                            <button class="btn btn-admin me-2" onclick="adminDashboard.createFirstAdmin()">
                                <i class="fas fa-crown me-2"></i>Create First Admin
                            </button>
                            <button class="btn btn-outline-secondary" onclick="adminDashboard.createSampleUsers()">
                                <i class="fas fa-plus me-2"></i>Create Sample Users
                            </button>
                        </div>
                    ` : ''}
                </td>
            </tr>
        `;
    }

    // Edit product
    editProduct(productId) {
        window.location.href = `add-products.html?edit=${productId}`;
    }

    // Delete product
    async deleteProduct(productId) {
        const result = await Swal.fire({
            title: 'Delete Product?',
            text: 'This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                await this.db.collection('products').doc(productId).delete();
                await this.loadProducts();
                this.updateStatistics();
                Swal.fire('Deleted!', 'Product has been deleted.', 'success');
            } catch (error) {
                console.error('Error deleting product:', error);
                Swal.fire('Error!', 'Failed to delete product.', 'error');
            }
        }
    }

    // Clear all products
    async clearAllProducts() {
        const result = await Swal.fire({
            title: 'Clear All Products?',
            text: 'This will permanently delete ALL products from the database. This action cannot be undone!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Clear All',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d'
        });

        if (result.isConfirmed) {
            try {
                // Show loading state
                Swal.fire({
                    title: 'Clearing Products...',
                    text: 'Please wait while we delete all products.',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                // Get all products
                const snapshot = await this.db.collection('products').get();
                
                if (snapshot.empty) {
                    Swal.fire('No Products', 'There are no products to clear.', 'info');
                    return;
                }

                // Delete all products in a batch
                const batch = this.db.batch();
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                
                await batch.commit();
                
                // Reload products and update statistics
                await this.loadProducts();
                this.updateStatistics();
                
                Swal.fire('Cleared!', `All ${snapshot.docs.length} products have been deleted.`, 'success');
            } catch (error) {
                console.error('Error clearing products:', error);
                Swal.fire('Error!', 'Failed to clear products. Please try again.', 'error');
            }
        }
    }

    // Clear all orders
    async clearAllOrders() {
        const result = await Swal.fire({
            title: 'Clear All Orders?',
            text: 'This will permanently delete ALL orders from the database. This action cannot be undone!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Clear All',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d'
        });

        if (result.isConfirmed) {
            try {
                // Show loading state
                Swal.fire({
                    title: 'Clearing Orders...',
                    text: 'Please wait while we delete all orders.',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                // Get all orders
                const snapshot = await this.db.collection('orders').get();
                
                if (snapshot.empty) {
                    Swal.fire('No Orders', 'There are no orders to clear.', 'info');
                    return;
                }

                // Delete all orders in a batch
                const batch = this.db.batch();
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                
                await batch.commit();
                
                // Reload orders and update statistics
                await this.loadOrders();
                this.updateStatistics();
                
                Swal.fire('Cleared!', `All ${snapshot.docs.length} orders have been deleted.`, 'success');
            } catch (error) {
                console.error('Error clearing orders:', error);
                Swal.fire('Error!', 'Failed to clear orders. Please try again.', 'error');
            }
        }
    }

    // Add sample data (products, orders, users)
    async addSampleData() {
        const result = await Swal.fire({
            title: 'Add Sample Data?',
            text: 'This will add sample products, orders, and users to your database. This is useful for testing and demonstration.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Add Sample Data',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d'
        });

        if (result.isConfirmed) {
            try {
                // Show loading state
                Swal.fire({
                    title: 'Adding Sample Data...',
                    text: 'Please wait while we add sample data to your database.',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                // Add sample products
                await this.addSampleProducts();
                
                // Add sample orders
                await this.addSampleOrders();
                
                // Add sample users
                await this.addSampleUsers();
                
                // Reload all data and update statistics
                await this.loadDashboardData();
                
                Swal.fire('Success!', 'Sample data has been added successfully!', 'success');
            } catch (error) {
                console.error('Error adding sample data:', error);
                Swal.fire('Error!', 'Failed to add sample data. Please try again.', 'error');
            }
        }
    }

    // Add sample products
    async addSampleProducts() {
        const sampleProducts = [
            {
                name: "Handcrafted Silver Necklace",
                price: 85,
                category: "necklaces",
                description: "Elegant handcrafted silver necklace with delicate chain design. Perfect for everyday wear or special occasions.",
                image: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=500&h=500&fit=crop",
                material: "Sterling Silver",
                dimensions: "18 inches",
                inStock: true
            },
            {
                name: "Bohemian Beaded Bracelet",
                price: 45,
                category: "bracelets",
                description: "Colorful bohemian-style bracelet with hand-strung beads. Adjustable fit for comfort.",
                image: "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=500&h=500&fit=crop",
                material: "Glass Beads, Elastic",
                dimensions: "7-8 inches adjustable",
                inStock: true
            },
            {
                name: "Decorative Phone Chain",
                price: 25,
                category: "phone-chains",
                description: "Stylish decorative phone chain with colorful beads and charms. Perfect accessory for your smartphone.",
                image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&h=500&fit=crop",
                material: "Metal Chain, Glass Beads",
                dimensions: "6 inches",
                inStock: true
            },
            {
                name: "Pearl Strand Necklace",
                price: 95,
                category: "necklaces",
                description: "Classic pearl strand necklace with sterling silver clasp. Timeless elegance for any outfit.",
                image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&h=500&fit=crop",
                material: "Freshwater Pearls, Sterling Silver",
                dimensions: "16 inches",
                inStock: true
            },
            {
                name: "Leather Wrap Bracelet",
                price: 35,
                category: "bracelets",
                description: "Handcrafted leather wrap bracelet with adjustable design. Perfect for casual or formal wear.",
                image: "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=500&h=500&fit=crop",
                material: "Genuine Leather",
                dimensions: "Adjustable 7-9 inches",
                inStock: true
            }
        ];

        const batch = this.db.batch();
        sampleProducts.forEach(product => {
            const productRef = this.db.collection('products').doc();
            batch.set(productRef, {
                ...product,
                createdBy: this.currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
        
        await batch.commit();
        console.log('Sample products added successfully');
    }

    // Add sample orders
    async addSampleOrders() {
        const sampleOrders = [
            {
                orderNumber: "ORD-001",
                status: "delivered",
                orderDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
                customerInfo: {
                    firstName: "Sarah",
                    lastName: "Johnson",
                    email: "sarah.johnson@example.com",
                    phone: "+1234567890",
                    address: "123 Main St",
                    city: "New York"
                },
                items: [
                    { name: "Handcrafted Silver Necklace", price: 85, image: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=500&h=500&fit=crop" },
                    { name: "Bohemian Beaded Bracelet", price: 45, image: "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=500&h=500&fit=crop" }
                ],
                totals: {
                    subtotal: 130,
                    shipping: 10,
                    total: 140
                },
                shipping: {
                    method: "standard",
                    cost: 10
                },
                payment: {
                    method: "credit_card",
                    status: "paid"
                }
            },
            {
                orderNumber: "ORD-002",
                status: "shipped",
                orderDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
                customerInfo: {
                    firstName: "Michael",
                    lastName: "Chen",
                    email: "michael.chen@example.com",
                    phone: "+1234567891",
                    address: "456 Oak Ave",
                    city: "Los Angeles"
                },
                items: [
                    { name: "Decorative Phone Chain", price: 25, image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&h=500&fit=crop" }
                ],
                totals: {
                    subtotal: 25,
                    shipping: 8,
                    total: 33
                },
                shipping: {
                    method: "express",
                    cost: 8
                },
                payment: {
                    method: "paypal",
                    status: "paid"
                }
            },
            {
                orderNumber: "ORD-003",
                status: "pending",
                orderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
                customerInfo: {
                    firstName: "Emily",
                    lastName: "Davis",
                    email: "emily.davis@example.com",
                    phone: "+1234567892",
                    address: "789 Pine St",
                    city: "Chicago"
                },
                items: [
                    { name: "Pearl Strand Necklace", price: 95, image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&h=500&fit=crop" },
                    { name: "Leather Wrap Bracelet", price: 35, image: "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=500&h=500&fit=crop" },
                    { name: "Decorative Phone Chain", price: 25, image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&h=500&fit=crop" }
                ],
                totals: {
                    subtotal: 155,
                    shipping: 12,
                    total: 167
                },
                shipping: {
                    method: "premium",
                    cost: 12
                },
                payment: {
                    method: "credit_card",
                    status: "pending"
                }
            }
        ];

        const batch = this.db.batch();
        sampleOrders.forEach(order => {
            const orderRef = this.db.collection('orders').doc();
            batch.set(orderRef, {
                ...order,
                userId: this.currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
        
        await batch.commit();
        console.log('Sample orders added successfully');
    }

    // Add sample users
    async addSampleUsers() {
        const sampleUsers = [
            {
                email: "john.doe@example.com",
                displayName: "John Doe",
                firstName: "John",
                lastName: "Doe",
                phone: "+1234567893",
                role: "user",
                createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
                updatedAt: new Date()
            },
            {
                email: "jane.smith@example.com",
                displayName: "Jane Smith",
                firstName: "Jane",
                lastName: "Smith",
                phone: "+1234567894",
                role: "user",
                createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
                updatedAt: new Date()
            },
            {
                email: "admin@hanastore.com",
                displayName: "Store Admin",
                firstName: "Store",
                lastName: "Admin",
                phone: "+1234567895",
                role: "admin",
                createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
                updatedAt: new Date()
            }
        ];

        const batch = this.db.batch();
        sampleUsers.forEach(user => {
            const userRef = this.db.collection('users').doc();
            batch.set(userRef, user);
        });
        
        await batch.commit();
        console.log('Sample users added successfully');
    }

    // Clear all users
    async clearAllUsers() {
        const result = await Swal.fire({
            title: 'Delete All Users?',
            text: 'This will permanently delete ALL users from the database, including your own account. You will be logged out immediately. This action cannot be undone!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Delete All',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d'
        });

        if (result.isConfirmed) {
            try {
                // Show loading state
                Swal.fire({
                    title: 'Deleting Users...',
                    text: 'Please wait while we delete all users.',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                // Get all users
                const snapshot = await this.db.collection('users').get();
                
                if (snapshot.empty) {
                    Swal.fire('No Users', 'There are no users to delete.', 'info');
                    return;
                }

                // Delete all users in a batch
                const batch = this.db.batch();
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                
                await batch.commit();
                
                // Show success message
                await Swal.fire('Deleted!', `All ${snapshot.docs.length} users have been deleted. You will be logged out now.`, 'success');
                
                // Sign out the current user
                await firebase.auth().signOut();
                
                // Redirect to login page
                window.location.href = 'login.html';
                
            } catch (error) {
                console.error('Error deleting users:', error);
                Swal.fire('Error!', 'Failed to delete users. Please try again.', 'error');
            }
        }
    }

    // View order
    viewOrder(orderId) {
        window.location.href = `order-details.html?id=${orderId}`;
    }

    // Update order status
    async updateOrderStatus(orderId) {
        const order = this.orders.find(o => o.id === orderId);
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
                await this.db.collection('orders').doc(orderId).update({
                    status: newStatus,
                    lastUpdated: new Date()
                });
                
                order.status = newStatus;
                this.renderOrders();
                this.updateStatistics();
                
                Swal.fire('Updated!', 'Order status has been updated.', 'success');
            } catch (error) {
                console.error('Error updating order status:', error);
                Swal.fire('Error!', 'Failed to update order status.', 'error');
            }
        }
    }

    // Make user admin
    async makeAdmin(userId) {
        const result = await Swal.fire({
            title: 'Make User Admin?',
            text: 'This user will have full admin privileges.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Make Admin',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                await this.db.collection('users').doc(userId).update({
                    role: 'admin',
                    updatedAt: new Date()
                });
                
                await this.loadUsers();
                Swal.fire('Updated!', 'User is now an admin.', 'success');
            } catch (error) {
                console.error('Error making user admin:', error);
                Swal.fire('Error!', 'Failed to make user admin.', 'error');
            }
        }
    }

    // View user
    viewUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        Swal.fire({
            title: 'User Details',
            html: `
                <div class="text-left">
                    <p><strong>Name:</strong> ${user.displayName || user.firstName || 'N/A'}</p>
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p><strong>Phone:</strong> ${user.phone || 'N/A'}</p>
                    <p><strong>Role:</strong> ${user.role || 'user'}</p>
                    <p><strong>Joined:</strong> ${this.formatDate(user.createdAt)}</p>
                </div>
            `,
            confirmButtonText: 'Close'
        });
    }

    // Create sample users for testing
    async createSampleUsers() {
        try {
            const sampleUsers = [
                {
                    email: 'admin@hanastore.com',
                    displayName: 'Admin User',
                    firstName: 'Admin',
                    lastName: 'User',
                    phone: '+1234567890',
                    role: 'admin',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    email: 'user1@example.com',
                    displayName: 'John Doe',
                    firstName: 'John',
                    lastName: 'Doe',
                    phone: '+1234567891',
                    role: 'user',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    email: 'user2@example.com',
                    displayName: 'Jane Smith',
                    firstName: 'Jane',
                    lastName: 'Smith',
                    phone: '+1234567892',
                    role: 'user',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            const batch = this.db.batch();
            
            for (const userData of sampleUsers) {
                const userRef = this.db.collection('users').doc();
                batch.set(userRef, userData);
            }
            
            await batch.commit();
            console.log('Sample users created successfully');
            
            // Reload users
            await this.loadUsers();
            this.updateStatistics();
            
            Swal.fire('Success!', 'Sample users have been created.', 'success');
        } catch (error) {
            console.error('Error creating sample users:', error);
            Swal.fire('Error!', 'Failed to create sample users.', 'error');
        }
    }

    // Create first admin user
    async createFirstAdmin() {
        try {
            const { value: email } = await Swal.fire({
                title: 'Create First Admin',
                input: 'email',
                inputLabel: 'Admin Email',
                inputPlaceholder: 'admin@hanastore.com',
                showCancelButton: true,
                confirmButtonText: 'Create Admin',
                cancelButtonText: 'Cancel',
                inputValidator: (value) => {
                    if (!value) {
                        return 'You need to enter an email!';
                    }
                }
            });

            if (email) {
                const adminUser = {
                    email: email,
                    displayName: 'Admin User',
                    firstName: 'Admin',
                    lastName: 'User',
                    phone: 'No phone',
                    role: 'admin',
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                await this.db.collection('users').add(adminUser);
                console.log('First admin user created successfully');
                
                // Reload users
                await this.loadUsers();
                this.updateStatistics();
                
                Swal.fire('Success!', 'First admin user has been created.', 'success');
            }
        } catch (error) {
            console.error('Error creating first admin:', error);
            Swal.fire('Error!', 'Failed to create admin user.', 'error');
        }
    }

    // Debug function - can be called from browser console
    async debugUsers() {
        console.log('=== DEBUG USERS ===');
        console.log('Current user:', this.currentUser);
        console.log('Database instance:', this.db);
        
        try {
            console.log('Checking if users collection exists...');
            const snapshot = await this.db.collection('users').get();
            console.log('Users collection snapshot:', snapshot);
            console.log('Number of users found:', snapshot.docs.length);
            
            if (!snapshot.empty) {
                console.log('First user document:', snapshot.docs[0].data());
            }
            
            console.log('Current users array:', this.users);
            console.log('Filtered users array:', this.filteredData.users);
        } catch (error) {
            console.error('Debug error:', error);
        }
    }

    // Force reload users
    async forceReloadUsers() {
        console.log('Force reloading users...');
        await this.loadUsers();
        this.updateStatistics();
    }
}

// Global admin dashboard instance
const adminDashboard = new AdminDashboard();

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        adminDashboard.initialize();
    }, 100);

    // Set up search and filter event listeners
    document.getElementById('product-search').addEventListener('input', (e) => {
        adminDashboard.filterProducts(e.target.value);
    });

    document.getElementById('order-search').addEventListener('input', (e) => {
        const statusFilter = document.getElementById('order-status-filter').value;
        adminDashboard.filterOrders(e.target.value, statusFilter);
    });

    document.getElementById('order-status-filter').addEventListener('change', (e) => {
        const searchTerm = document.getElementById('order-search').value;
        adminDashboard.filterOrders(searchTerm, e.target.value);
    });

    document.getElementById('user-search').addEventListener('input', (e) => {
        const roleFilter = document.getElementById('user-role-filter').value;
        adminDashboard.filterUsers(e.target.value, roleFilter);
    });

    document.getElementById('user-role-filter').addEventListener('change', (e) => {
        const searchTerm = document.getElementById('user-search').value;
        adminDashboard.filterUsers(searchTerm, e.target.value);
    });
}); 