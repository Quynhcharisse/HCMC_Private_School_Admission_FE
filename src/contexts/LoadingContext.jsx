import {createContext, useCallback, useContext, useEffect, useState} from "react";

const LoadingContext = createContext();
// eslint-disable-next-line react-refresh/only-export-components
export const useLoading = () => {
    const context = useContext(LoadingContext);
    if (!context) {
        throw new Error('useLoading must be used within a LoadingProvider');
    }
    return context;
};

export const LoadingProvider = ({children}) => {
    const [loadingStates, setLoadingStates] = useState({
        app: false,
        auth: false,
        layout: false,
        data: false,
        custom: false
    });

    const [globalLoading, setGlobalLoading] = useState(false);

    const hasAnyLoading = Object.values(loadingStates).some(state => state);

    useEffect(() => {
        setGlobalLoading(hasAnyLoading);
    }, [hasAnyLoading]);

    const setLoading = useCallback((key, value) => {
        setLoadingStates(prev => ({
            ...prev,
            [key]: value
        }));
    }, []);

    const setAppLoading = useCallback((value) => setLoading('app', value), [setLoading]);
    const setAuthLoading = useCallback((value) => setLoading('auth', value), [setLoading]);
    const setLayoutLoading = useCallback((value) => setLoading('layout', value), [setLoading]);
    const setDataLoading = useCallback((value) => setLoading('data', value), [setLoading]);
    const setCustomLoading = useCallback((value) => setLoading('custom', value), [setLoading]);

    const clearAllLoading = useCallback(() => {
        setLoadingStates({
            app: false,
            auth: false,
            layout: false,
            data: false,
            custom: false
        });
    }, []);

    const value = {
        loadingStates,
        globalLoading,
        setLoading,
        setAppLoading,
        setAuthLoading,
        setLayoutLoading,
        setDataLoading,
        setCustomLoading,
        clearAllLoading,
        hasAnyLoading
    };

    return (
        <LoadingContext.Provider value={value}>
            {children}
        </LoadingContext.Provider>
    );
};

export const GlobalLoadingOverlay = () => {
    const {globalLoading} = useLoading();

    if (!globalLoading) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            zIndex: 99999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backdropFilter: 'blur(2px)'
        }}>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px'
            }}>
                <div style={{
                    width: '60px',
                    height: '60px',
                    border: '4px solid #e3e3e3',
                    borderTop: '4px solid #2e7d32',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }}></div>
                <div style={{
                    fontSize: '18px',
                    color: '#333',
                    fontWeight: '500',
                    fontFamily: '"Open Sans", sans-serif'
                }}>
                    Loading...
                </div>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        </div>
    );
};