import './styles/index.css'
import {createBrowserRouter, Navigate, RouterProvider} from "react-router-dom";
import {lazy, Suspense} from "react";
import {SnackbarProvider} from 'notistack';
import {createTheme, CssBaseline, Slide, ThemeProvider} from '@mui/material';
import {GlobalLoadingOverlay, LoadingProvider} from './contexts/LoadingContext.jsx';

// Lazy load components
const WebAppLayout = lazy(() => import("./components/ui/WebAppLayout.jsx"));
const HomePage = lazy(() => import("./components/Page/HomePage.jsx"));
const Login = lazy(() => import("./components/auth/Login.jsx"));
const Register = lazy(() => import("./components/auth/Register.jsx"));
const ProtectedRoute = lazy(() => import("./configs/ProtectedRoute.jsx"));

const LoadingFallback = () => {
    return null;
};

const theme = createTheme({
    typography: {
        fontFamily: '"Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
        h1: {
            fontFamily: '"Segoe UI", "Roboto"',
        },
        h2: {
            fontFamily: '"Segoe UI", "Roboto"',
        },
        h3: {
            fontFamily: '"Segoe UI", "Roboto"',
        },
        h4: {
            fontFamily: '"Segoe UI", "Roboto"',
        },
        h5: {
            fontFamily: '"Segoe UI", "Roboto"',
        },
        h6: {
            fontFamily: '"Segoe UI", "Roboto"',
        },
        body1: {
            fontFamily: '"Segoe UI", "Roboto"',
        },
        body2: {
            fontFamily: '"Segoe UI", "Roboto"',
        },
        button: {
            fontFamily: '"Segoe UI", "Roboto"',
        },
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    fontFamily: '"Segoe UI", "Roboto"',
                },
            },
        },
    },
});

const router = createBrowserRouter([
    {
        path: "/",
        element: (
            <Suspense fallback={<LoadingFallback/>}>
                <WebAppLayout/>
            </Suspense>
        ),
        children: [
            {
                index: true,
                element: <Navigate to={'/home'}/>
            },
            {
                path: 'home',
                element: (
                    <Suspense fallback={<LoadingFallback/>}>
                        <HomePage/>
                    </Suspense>
                )
            },
            {
                path: 'schools',
                element: (
                    <Suspense fallback={<LoadingFallback/>}>
                        <div>Schools List</div>
                    </Suspense>
                )
            },
            {
                path: 'guide',
                element: (
                    <Suspense fallback={<LoadingFallback/>}>
                        <div>Guide Page</div>
                    </Suspense>
                )
            },
            {
                path: 'about',
                element: (
                    <Suspense fallback={<LoadingFallback/>}>
                        <div>About Page</div>
                    </Suspense>
                )
            },
            {
                path: 'policy/privacy',
                element: (
                    <Suspense fallback={<LoadingFallback/>}>
                        <div>Privacy Policy</div>
                    </Suspense>
                )
            },
            {
                path: 'tos',
                element: (
                    <Suspense fallback={<LoadingFallback/>}>
                        <div>Terms of Service</div>
                    </Suspense>
                )
            },
            {
                path: 'faq',
                element: (
                    <Suspense fallback={<LoadingFallback/>}>
                        <div>FAQ Page</div>
                    </Suspense>
                )
            },
            {
                path: 'login',
                element: (
                    <Suspense fallback={<LoadingFallback/>}>
                        <Login/>
                    </Suspense>
                )
            },
            {
                path: 'register',
                element: (
                    <Suspense fallback={<LoadingFallback/>}>
                        <Register/>
                    </Suspense>
                )
            }
        ]
    },
    {
        path: '/student',
        element: (
            <Suspense fallback={<LoadingFallback/>}>
                <ProtectedRoute allowRoles={['STUDENT']}>
                    <Suspense fallback={<LoadingFallback/>}>
                        <div>Student Dashboard Layout</div>
                    </Suspense>
                </ProtectedRoute>
            </Suspense>
        ),
        children: [
            {
                index: true,
                element: <Navigate to={'/student/dashboard'}/>
            },
            {
                path: 'dashboard',
                element: (
                    <Suspense fallback={<LoadingFallback/>}>
                        <div>Student Dashboard</div>
                    </Suspense>
                )
            },
            {
                path: 'profile',
                element: (
                    <Suspense fallback={<LoadingFallback/>}>
                        <div>Student Profile</div>
                    </Suspense>
                )
            }
        ]
    },
    {
        path: '/school',
        element: (
            <Suspense fallback={<LoadingFallback/>}>
                <ProtectedRoute allowRoles={['SCHOOL']}>
                    <Suspense fallback={<LoadingFallback/>}>
                        <div>School Dashboard Layout</div>
                    </Suspense>
                </ProtectedRoute>
            </Suspense>
        ),
        children: [
            {
                index: true,
                element: <Navigate to={'/school/dashboard'}/>
            },
            {
                path: 'dashboard',
                element: (
                    <Suspense fallback={<LoadingFallback/>}>
                        <div>School Dashboard</div>
                    </Suspense>
                )
            },
            {
                path: 'profile',
                element: (
                    <Suspense fallback={<LoadingFallback/>}>
                        <div>School Profile</div>
                    </Suspense>
                )
            }
        ]
    },
    {
        path: '/admin',
        element: (
            <Suspense fallback={<LoadingFallback/>}>
                <ProtectedRoute allowRoles={['ADMIN']}>
                    <Suspense fallback={<LoadingFallback/>}>
                        <div>Admin Dashboard Layout</div>
                    </Suspense>
                </ProtectedRoute>
            </Suspense>
        ),
        children: [
            {
                index: true,
                element: <Navigate to={'/admin/dashboard'}/>
            },
            {
                path: 'dashboard',
                element: (
                    <Suspense fallback={<LoadingFallback/>}>
                        <div>Admin Dashboard</div>
                    </Suspense>
                )
            },
            {
                path: 'users',
                element: (
                    <Suspense fallback={<LoadingFallback/>}>
                        <div>Users Management</div>
                    </Suspense>
                )
            }
        ]
    }
])

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline/>
            <LoadingProvider>
                <SnackbarProvider
                    maxSnack={3}
                    autoHideDuration={3000}
                    anchorOrigin={{vertical: 'top', horizontal: 'right'}}
                    TransitionComponent={Slide}
                    preventDuplicate={true}
                >
                    <RouterProvider router={router}/>
                    <GlobalLoadingOverlay/>
                </SnackbarProvider>
            </LoadingProvider>
        </ThemeProvider>
    )
}

export default App
