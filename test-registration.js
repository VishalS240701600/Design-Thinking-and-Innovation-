// using native fetch

async function testRegistration() {
    const url = 'http://localhost:3000/api/auth';

    console.log('Testing ADMIN registration injection...');
    const adminRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'register',
            name: 'Hacker',
            email: 'hacker@test.com',
            password: 'password123',
            role: 'ADMIN',
            agencyId: '1' // Assuming agency ID 1 exists
        })
    });
    console.log('Admin Request Status:', adminRes.status);
    const adminData = await adminRes.json();
    console.log('Admin Request Response:', adminData);

    console.log('\nTesting CUSTOMER registration...');
    const custRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'register',
            name: 'New Customer',
            email: `customer${Date.now()}@test.com`,
            password: 'password123',
            role: 'CUSTOMER',
            agencyId: '1'
        })
    });
    console.log('Customer Request Status:', custRes.status);
    const custData = await custRes.json();
    console.log('Customer Request Response:', custData.user ? 'Success' : custData);
}

testRegistration();
