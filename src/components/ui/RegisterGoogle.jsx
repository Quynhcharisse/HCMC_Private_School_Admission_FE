import {GoogleLogin} from '@react-oauth/google';
import {jwtDecode} from 'jwt-decode';
import {useState} from 'react';

export default function RegisterGoogle({onSuccess, onError}) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            setIsLoading(true);
            setError(null);

            const decoded = jwtDecode(credentialResponse.credential);
            const email = decoded.email;
            const name = decoded.name;
            const picture = decoded.picture;

            if (onSuccess) {
                onSuccess({
                    email,
                    name,
                    picture,
                    credential: credentialResponse.credential,
                });
            }
        } catch (err) {
            console.error('Google registration error:', err);
            setError(err.message);
            if (onError) {
                onError(err);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleError = () => {
        const errorMessage = 'Google đăng ký thất bại';
        setError(errorMessage);
        if (onError) {
            onError(new Error(errorMessage));
        }
    };

    return (
        <div
            className="register-google-container"
            style={{width: '100%'}}
        >
            <div
                className="google-register-wrapper"
                style={{width: '100%', display: 'flex', justifyContent: 'center'}}
            >
                <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    auto_select={false}
                    locale="vi_VN"
                    size="large"
                    width="100%"
                    text="signup_with"
                />
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {isLoading && (
                <div className="loading-message">
                    Đang xử lý...
                </div>
            )}
        </div>
    );
}
