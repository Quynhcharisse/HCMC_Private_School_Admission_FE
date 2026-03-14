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

export const signup = async (email, role) => {
    const response = await axiosClient.post("/auth/register", {
            email: email,
            role: role
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
        return data;
    } catch (error) {
        console.error('Error checking tax code:', error);
        throw error;
    }
}