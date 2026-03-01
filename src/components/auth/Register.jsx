import React, {useState} from 'react';
import {GoogleLogin} from '@react-oauth/google';
import {jwtDecode} from 'jwt-decode';
import {signup} from '../../services/AuthService';
import {ROLE_LIST} from '../../constants/roles';

const Register = () => {
    const [email, setEmail] = useState('');
    const [selectedRole, setSelectedRole] = useState('');
    const [isEmailVerified, setIsEmailVerified] = useState(false);

    const roles = ROLE_LIST;

    const handleGoogleSuccess = (credentialResponse) => {
        const decoded = jwtDecode(credentialResponse.credential);
        setEmail(decoded.email);
        setIsEmailVerified(true);
    };

    const handleGoogleError = () => {
        console.error('Đăng nhập Google thất bại');
    };

    const handleRoleSelect = (role) => {
        setSelectedRole(role);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedRole) {
            alert('Vui lòng chọn role');
            return;
        }

        try {
            const response = await signup(email, selectedRole);

            if (response) {
                console.log('Đăng ký thành công:', response);
                // Redirect hoặc xử lý tiếp theo
            }
        } catch (error) {
            console.error('Lỗi đăng ký:', error);
        }
    };

    return (
        <div style={{padding: '20px', maxWidth: '400px', margin: '0 auto'}}>
            <h2>Đăng Ký</h2>

            {!isEmailVerified ? (
                <div>
                    <p>Đăng nhập bằng Google để tiếp tục:</p>
                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={handleGoogleError}
                    />
                </div>
            ) : (
                <form onSubmit={handleSubmit}>
                    <div style={{marginBottom: '15px'}}>
                        <label>Email:</label>
                        <input
                            type="email"
                            value={email}
                            disabled
                            style={{width: '100%', padding: '8px', marginTop: '5px'}}
                        />
                    </div>

                    <div style={{marginBottom: '15px'}}>
                        <label>Chọn Role:</label>
                        <div style={{marginTop: '10px'}}>
                            {roles.map((role) => (
                                <button
                                    key={role}
                                    type="button"
                                    onClick={() => handleRoleSelect(role)}
                                    style={{
                                        padding: '10px 15px',
                                        margin: '5px',
                                        backgroundColor: selectedRole === role ? '#4285f4' : '#f0f0f0',
                                        color: selectedRole === role ? 'white' : 'black',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        style={{
                            width: '100%',
                            padding: '10px',
                            backgroundColor: '#4285f4',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Đăng Ký
                    </button>
                </form>
            )}
        </div>
    );
};

export default Register;
