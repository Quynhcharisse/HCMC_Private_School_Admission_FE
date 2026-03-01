import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useState } from 'react';
import { signin } from '../../services/AuthService';

export default function LoginGoogle({ onSuccess, onError }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLoginSuccess = async (credentialResponse) => {
    try {
      setIsLoading(true);
      setError(null);

      // Decode the JWT token to get user information
      const decoded = jwtDecode(credentialResponse.credential);
      const email = decoded.email;
      const name = decoded.name;
      const picture = decoded.picture;

      // Call the signin service with the email
      const response = await signin(email);

      if (response) {
        // Call the success callback with email and other user data
        if (onSuccess) {
          onSuccess({
            email,
            name,
            picture,
            credential: credentialResponse.credential,
            response
          });
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
      if (onError) {
        onError(err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginError = () => {
    const errorMessage = 'Google login failed';
    setError(errorMessage);
    if (onError) {
      onError(new Error(errorMessage));
    }
  };

  return (
    <div className="login-google-container">
      <div className="google-login-wrapper">
        <GoogleLogin
          onSuccess={handleLoginSuccess}
          onError={handleLoginError}
          auto_select={false}
          locale="vi_VN"
          size="large"
          width="300"
        />
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="loading-message">
          Processing...
        </div>
      )}
    </div>
  );
}
