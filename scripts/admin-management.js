// Admin Management System for Hana Store
// This script handles admin user management

// Admin management functions
class AdminManager {
    constructor() {
        this.db = null;
        this.currentUser = null;
    }

    // Initialize admin manager
    async initialize() {
        if (typeof firebase !== 'undefined') {
            this.db = firebase.firestore();
            
            // Listen for auth state changes
            firebase.auth().onAuthStateChanged((user) => {
                this.currentUser = user;
                this.updateAdminUI();
            });
        }
    }

    // Check if current user is admin
    async isCurrentUserAdmin() {
        if (!this.currentUser) return false;
        
        try {
            const userDoc = await this.db.collection('users').doc(this.currentUser.uid).get();
            return userDoc.exists && userDoc.data().role === 'admin';
        } catch (error) {
            console.error('Error checking admin status:', error);
            return false;
        }
    }

    // Check if a specific user is admin
    async isUserAdmin(userId) {
        try {
            const userDoc = await this.db.collection('users').doc(userId).get();
            return userDoc.exists && userDoc.data().role === 'admin';
        } catch (error) {
            console.error('Error checking user admin status:', error);
            return false;
        }
    }

    // Make a user an admin (only existing admins can do this)
    async makeUserAdmin(userEmail) {
        try {
            // Check if current user is admin
            const isAdmin = await this.isCurrentUserAdmin();
            if (!isAdmin) {
                throw new Error('Only admins can make other users admin');
            }

            // Find user by email
            const usersSnapshot = await this.db.collection('users')
                .where('email', '==', userEmail)
                .get();

            if (usersSnapshot.empty) {
                throw new Error('User not found with that email');
            }

            const userDoc = usersSnapshot.docs[0];
            await userDoc.ref.update({
                role: 'admin',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: this.currentUser.uid
            });

            return { success: true, message: `${userEmail} is now an admin` };
        } catch (error) {
            console.error('Error making user admin:', error);
            throw error;
        }
    }

    // Remove admin status from a user
    async removeUserAdmin(userEmail) {
        try {
            // Check if current user is admin
            const isAdmin = await this.isCurrentUserAdmin();
            if (!isAdmin) {
                throw new Error('Only admins can remove admin status');
            }

            // Find user by email
            const usersSnapshot = await this.db.collection('users')
                .where('email', '==', userEmail)
                .get();

            if (usersSnapshot.empty) {
                throw new Error('User not found with that email');
            }

            const userDoc = usersSnapshot.docs[0];
            
            // Prevent removing admin from self
            if (userDoc.id === this.currentUser.uid) {
                throw new Error('Cannot remove admin status from yourself');
            }

            await userDoc.ref.update({
                role: 'user',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: this.currentUser.uid
            });

            return { success: true, message: `${userEmail} is no longer an admin` };
        } catch (error) {
            console.error('Error removing admin status:', error);
            throw error;
        }
    }

    // Get all admin users
    async getAllAdmins() {
        try {
            const adminsSnapshot = await this.db.collection('users')
                .where('role', '==', 'admin')
                .get();

            return adminsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting admins:', error);
            return [];
        }
    }

    // Get all users
    async getAllUsers() {
        try {
            const usersSnapshot = await this.db.collection('users').get();
            return usersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting users:', error);
            return [];
        }
    }

    // Update admin UI based on current user's admin status
    async updateAdminUI() {
        const isAdmin = await this.isCurrentUserAdmin();
        const adminElements = document.querySelectorAll('.admin-only');
        const userElements = document.querySelectorAll('.user-only');

        adminElements.forEach(element => {
            element.style.display = isAdmin ? 'block' : 'none';
        });

        userElements.forEach(element => {
            element.style.display = !isAdmin ? 'block' : 'none';
        });

        // Update admin status indicator
        const adminStatus = document.getElementById('admin-status');
        if (adminStatus) {
            if (isAdmin) {
                adminStatus.innerHTML = `
                    <div class="alert alert-success">
                        <i class="fas fa-crown me-2"></i>
                        You have admin privileges
                    </div>
                `;
            } else if (this.currentUser) {
                adminStatus.innerHTML = `
                    <div class="alert alert-info">
                        <i class="fas fa-user me-2"></i>
                        Regular user account
                    </div>
                `;
            } else {
                adminStatus.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Please sign in
                    </div>
                `;
            }
        }
    }
}

// Global admin manager instance
const adminManager = new AdminManager();

// Initialize admin manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        adminManager.initialize();
    }, 100);
});

// Global functions for HTML onclick handlers
window.makeUserAdmin = async function() {
    const email = document.getElementById('admin-email').value.trim();
    if (!email) {
        alert('Please enter an email address');
        return;
    }

    try {
        const result = await adminManager.makeUserAdmin(email);
        alert(result.message);
        document.getElementById('admin-email').value = '';
        // Refresh admin list
        displayAdminUsers();
    } catch (error) {
        alert('Error: ' + error.message);
    }
};

window.removeUserAdmin = async function(userEmail) {
    if (confirm(`Are you sure you want to remove admin status from ${userEmail}?`)) {
        try {
            const result = await adminManager.removeUserAdmin(userEmail);
            alert(result.message);
            // Refresh admin list
            displayAdminUsers();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }
};

// Display admin users in a table
async function displayAdminUsers() {
    const container = document.getElementById('admin-users-list');
    if (!container) return;

    try {
        const admins = await adminManager.getAllAdmins();
        const currentUser = firebase.auth().currentUser;

        if (admins.length === 0) {
            container.innerHTML = '<p class="text-muted">No admin users found.</p>';
            return;
        }

        let html = `
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Name</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        admins.forEach(admin => {
            const isCurrentUser = currentUser && admin.id === currentUser.uid;
            html += `
                <tr>
                    <td>${admin.email || 'N/A'}</td>
                    <td>${admin.name || 'N/A'}</td>
                    <td>${admin.createdAt ? new Date(admin.createdAt.toDate()).toLocaleDateString() : 'N/A'}</td>
                    <td>
                        ${isCurrentUser ? 
                            '<span class="badge bg-secondary">Current User</span>' :
                            `<button class="btn btn-sm btn-danger" onclick="removeUserAdmin('${admin.email}')">
                                <i class="fas fa-user-minus"></i> Remove Admin
                            </button>`
                        }
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    } catch (error) {
        console.error('Error displaying admin users:', error);
        container.innerHTML = '<p class="text-danger">Error loading admin users.</p>';
    }
}

// Make functions globally available
window.adminManager = adminManager;
window.displayAdminUsers = displayAdminUsers; 