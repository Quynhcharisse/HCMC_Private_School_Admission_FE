import { useState } from 'react';
import LoginGoogle from '../ui/LoginGoogle';

export default function Login() {
  const [userEmail, setUserEmail] = useState(null);
  const [userData, setUserData] = useState(null);

  const handleLoginSuccess = (data) => {
    // Extract email from the response
    const { email, name, picture, response } = data;

    setUserEmail(email);
    setUserData({ email, name, picture });

    console.log('Login successful!');
    console.log('Email:', email);
    console.log('Name:', name);
    console.log('Picture:', picture);
    console.log('Auth Response:', response);

  };

  const handleLoginError = (error) => {
    console.error('Login failed:', error);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>Login</h1>

        {!userEmail ? (
          <>
            <p>Please log in with Google.</p>
            <LoginGoogle
              onSuccess={handleLoginSuccess}
              onError={handleLoginError}
            />
          </>
        ) : (
          <div className="login-success">
            <h2>Login successful!</h2>
            <p>Email: {userEmail}</p>
            {userData?.name && <p>Tên: {userData.name}</p>}
            {userData?.picture && (
              <img
                src={userData.picture}
                alt="Profile"
                style={{ borderRadius: '50%', width: '100px', height: '100px' }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
