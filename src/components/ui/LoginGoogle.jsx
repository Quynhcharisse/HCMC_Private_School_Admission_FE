import {GoogleLogin} from '@react-oauth/google';
import {jwtDecode} from 'jwt-decode';
import {useLayoutEffect, useRef, useState} from 'react';
import {Box, Typography} from '@mui/material';
import {signin} from '../../services/AuthService';
import {getApiErrorMessage} from '../../utils/getApiErrorMessage';
import {showErrorSnackbar} from './AppSnackbar.jsx';

const GSI_BTN_MAX_W = 400;
const GSI_BTN_MIN_W = 200;

const GOOGLE_BLUE = '#4285F4';

const BTN_H = 40;
const R_OUTER = '8px';
const R_LOGO = '8px';

function GoogleGMark({size = 20}) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width={size} height={size} aria-hidden>
            <path
                fill="#FFC107"
                d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
            />
            <path
                fill="#FF3D00"
                d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
            />
            <path
                fill="#4CAF50"
                d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
            />
            <path
                fill="#1976D2"
                d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
            />
        </svg>
    );
}

const ACCOUNT_NOT_FOUND_MESSAGE = 'Account not found';

export default function LoginGoogle({onSuccess, onError}) {
    const [isLoading, setIsLoading] = useState(false);
    const wrapRef = useRef(null);
    const [buttonWidth, setButtonWidth] = useState(GSI_BTN_MAX_W);

    useLayoutEffect(() => {
        const el = wrapRef.current;
        if (!el || typeof ResizeObserver === 'undefined') {
            return undefined;
        }
        const measure = () => {
            const w = el.getBoundingClientRect().width;
            setButtonWidth(Math.min(GSI_BTN_MAX_W, Math.max(GSI_BTN_MIN_W, Math.floor(w))));
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const handleLoginSuccess = async (credentialResponse) => {
        try {
            setIsLoading(true);

            const decoded = jwtDecode(credentialResponse.credential);
            const email = decoded.email;
            const name = decoded.name;
            const picture = decoded.picture || decoded.picture_url || decoded.photo || null;

            const response = await signin(email);

            if (response) {
                if (onSuccess) {
                    onSuccess({
                        email,
                        name,
                        picture,
                        credential: credentialResponse.credential,
                        response,
                    });
                }
            }
        } catch (err) {
            console.error('Login error:', err);
            const apiMessage = getApiErrorMessage(err);
            const errSnackOpts = {autoHideDuration: 2500};
            if (apiMessage === ACCOUNT_NOT_FOUND_MESSAGE) {
                showErrorSnackbar(
                    'Chưa có tài khoản trên hệ thống. Vui lòng bấm "Đăng ký tài khoản mới" bên dưới để tạo tài khoản.',
                    errSnackOpts
                );
            } else {
                showErrorSnackbar(apiMessage, errSnackOpts);
            }
            if (onError) {
                onError(err);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoginError = () => {
        const errorMessage = 'Đăng nhập Google không thành công. Vui lòng thử lại.';
        showErrorSnackbar(errorMessage, {autoHideDuration: 2500});
        if (onError) {
            onError(new Error(errorMessage));
        }
    };

    return (
        <div ref={wrapRef} className="login-google-container" style={{width: '100%'}}>
            <Box
                sx={{
                    position: 'relative',
                    width: '100%',
                    height: BTN_H,
                    borderRadius: R_OUTER,
                }}
            >
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 0,
                        opacity: 0.02,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <GoogleLogin
                        onSuccess={handleLoginSuccess}
                        onError={handleLoginError}
                        auto_select={false}
                        locale="vi_VN"
                        type="standard"
                        theme="filled_blue"
                        size="large"
                        shape="rectangular"
                        text="signin_with"
                        logo_alignment="left"
                        width={buttonWidth}
                        containerProps={{
                            style: {
                                display: 'flex',
                                justifyContent: 'center',
                                width: '100%',
                                height: BTN_H,
                            },
                        }}
                    />
                </Box>

                <Box
                    sx={{
                        position: 'relative',
                        zIndex: 1,
                        pointerEvents: 'none',
                        height: BTN_H,
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: R_OUTER,
                        bgcolor: GOOGLE_BLUE,
                        overflow: 'hidden',
                        userSelect: 'none',
                    }}
                >
                    <Box
                        sx={{
                            ml: '4px',
                            width: 32,
                            height: 32,
                            borderRadius: R_LOGO,
                            bgcolor: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <GoogleGMark size={18} />
                    </Box>
                    <Typography
                        sx={{
                            flex: 1,
                            textAlign: 'center',
                            color: '#fff',
                            fontWeight: 500,
                            fontSize: '0.875rem',
                            fontFamily: 'Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif',
                            pr: 0.5,
                            lineHeight: 1,
                        }}
                    >
                        Đăng nhập bằng Google
                    </Typography>
                </Box>
            </Box>

            {isLoading && <div className="loading-message">Processing...</div>}
        </div>
    );
}
