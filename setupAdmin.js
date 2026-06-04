const admin = require('firebase-admin');
const serviceAccount = require('C:/Users/S Vishal/Downloads/fmcg-distribution-firebase-adminsdk-fbsvc-72f742cff3.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function run() {
  try {
    const email = 'admin@distributeiq.com';
    const password = 'AdminPassword123!';
    
    // Check if user exists
    let uid;
    try {
      const user = await auth.getUserByEmail(email);
      uid = user.uid;
      console.log('User already exists:', uid);
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        const user = await auth.createUser({
          email,
          password,
          displayName: 'Global Admin'
        });
        uid = user.uid;
        console.log('Created Global Admin user in Firebase Auth:', uid);
      } else {
        throw e;
      }
    }
    
    // Set custom claims
    await auth.setCustomUserClaims(uid, { role: 'ADMIN', agencyId: '0' });
    console.log('Custom claims (ADMIN) set successfully');
    
    // Add to Firestore
    await db.collection('users').doc(uid).set({
      agencyId: '0',
      name: 'Global Admin',
      email: email,
      role: 'ADMIN',
      createdAt: new Date().toISOString()
    });
    console.log('Added Global Admin profile to Firestore users collection');
    
    // Create a default Agency just so we have one for testing
    const defaultAgencyRef = db.collection('agencies').doc('default_agency');
    await defaultAgencyRef.set({
      name: 'Nexus Distribution',
      themeColor: '#006591',
      createdAt: new Date().toISOString()
    });
    console.log('Created a default agency "Nexus Distribution" in Firestore');
    
    console.log('\n=============================================');
    console.log(' SUCCESS: Backend Bootstrapped               ');
    console.log('=============================================');
    console.log('You can now log in as the Global Admin using:');
    console.log('Email:    ' + email);
    console.log('Password: ' + password);
    console.log('=============================================');
    
  } catch (error) {
    console.error('Error during setup:', error);
  } finally {
    process.exit(0);
  }
}

run();
