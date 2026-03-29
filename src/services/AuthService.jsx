import axiosClient from "../configs/APIConfig.jsx";

export const refreshToken = async () => {
    const response = await axiosClient.post("/auth/refresh", {}, {
        headers: {
            "X-Device-Type": "web"
        }
    });
    return response || null
}

export const signin = async (email) => {
    const response = await axiosClient.post("/auth/login", {
            email: email
        }, {
            headers: {
                "X-Device-Type": "web"
            }
        }
    );
    return response || null
}

export const signup = async (email, role, picture) => {
    const response = await axiosClient.post("/auth/register", {
            email: email,
            role: role,
            avatar: picture
        }, {
            headers: {
                "X-Device-Type": "web"
            }
        }
    );
    return response || null
}

export const registerSchool = async (registerData) => {
    const response = await axiosClient.post("/auth/register", registerData, {
        headers: {
            "X-Device-Type": "web"
        }
    });
    return response || null
}

export const checkTaxCode = async (taxCode) => {
    try {
        const response = await fetch(`https://api.vietqr.io/v2/business/${taxCode}`);
        const data = await response.json();
        if (!response.ok) {
            const error = new Error(data?.desc || 'Tax code lookup failed');
            error.status = response.status;
            error.response = {
                status: response.status,
                data,
            };
            throw error;
        }
        return data;
    } catch (error) {
        console.error('Error checking tax code:', error);
        throw error;
    }
}
