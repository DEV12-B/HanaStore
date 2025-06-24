// Setup First Admin Script
// This script helps you set up the first admin user manually
// Run this once to create your first admin, then use the admin management system

// Function to set up the first admin user
async function setupFirstAdmin(userEmail) {
    try {
        if (typeof firebase === 'undefined') {
            alert('Firebase is not loaded. Please refresh the page and try again.');
            return;
        }

        // Initialize Firebase if not already done
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

        const db = firebase.firestore();

        // Find user by email
        const usersSnapshot = await db.collection('users')
            .where('email', '==', userEmail)
            .get();

        if (usersSnapshot.empty) {
            alert(`No user found with email: ${userEmail}\n\nPlease make sure the user has signed up first.`);
            return;
        }

        const userDoc = usersSnapshot.docs[0];
        
        // Update user to admin
        await userDoc.ref.update({
            role: 'admin',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: 'system'
        });

        alert(`✅ Success! ${userEmail} is now an admin.\n\nYou can now use the admin management system to manage other users.`);
        
    } catch (error) {
        console.error('Error setting up first admin:', error);
        alert('Error setting up admin: ' + error.message);
    }
}

// Function to check if any admins exist
async function checkAdminExists() {
    try {
        if (typeof firebase === 'undefined') {
            return false;
        }

        // Initialize Firebase if not already done
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

        const db = firebase.firestore();
        const adminsSnapshot = await db.collection('users')
            .where('role', '==', 'admin')
            .get();

        return !adminsSnapshot.empty;
    } catch (error) {
        console.error('Error checking admin existence:', error);
        return false;
    }
}

// Function to get all users for selection
async function getAllUsers() {
    try {
        if (typeof firebase === 'undefined') {
            return [];
        }

        // Initialize Firebase if not already done
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

        const db = firebase.firestore();
        const usersSnapshot = await db.collection('users').get();
        
        return usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting users:', error);
        return [];
    }
}

// Make functions globally available
window.setupFirstAdmin = setupFirstAdmin;
window.checkAdminExists = checkAdminExists;
window.getAllUsers = getAllUsers; 