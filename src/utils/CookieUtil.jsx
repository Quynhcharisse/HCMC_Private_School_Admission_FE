import {getAccess} from "../services/AccountService.jsx";

export const getAccessCookie = async () => {
    const response = await getAccess()
    if (response && response.status === 200) {
        return response.data.body
    }
    return null
};