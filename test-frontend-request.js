// Test what the frontend is actually sending
const testFrontendRequest = async () => {
  try {
    console.log('Testing frontend-style request...');
    
    // Mimic exactly what the frontend would send
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
        'Origin': 'http://localhost:5173',
        'Referer': 'http://localhost:5173/',
      },
      body: JSON.stringify({
        email: 'phattarapong.phe@gmail.com',
        password: '0966566414'
      }),
      credentials: 'include'
    });
    
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('Response body:', text);
    
    if (response.status === 400) {
      try {
        const errorData = JSON.parse(text);
        console.log('Error details:', errorData);
      } catch (e) {
        console.log('Could not parse error as JSON');
      }
    }
    
  } catch (error) {
    console.error('Request failed:', error);
  }
};

testFrontendRequest();