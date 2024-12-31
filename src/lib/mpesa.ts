import * as SecureStore from "expo-secure-store";

export const fetchSessionKey = async (): Promise<string> => {
    try {
        const response = await fetch("<SUPABASE_EDGE_FUNCTION_URL>", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        const data = await response.json();

        if (data.output_SessionID) {
            await SecureStore.setItemAsync("mpesaSessionKey", data.output_SessionID);
            return data.output_SessionID;
        } else {
            throw new Error("Failed to fetch session key");
        }
    } catch (error) {
        console.error("Error fetching session key:", error);
        throw error;
    }
};

export const mpesaRequest = async (
    endpoint: string,
    method: string = "GET",
    body: Record<string, unknown> | null = null
): Promise<any> => {
    try {
        const sessionKey = await SecureStore.getItemAsync("mpesaSessionKey");

        if (!sessionKey) throw new Error("Session key not found");

        const response = await fetch(endpoint, {
            method,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${sessionKey}`,
                Origin: "*",
            },
            body: body ? JSON.stringify(body) : null,
        });

        const data = await response.json();

        return data;
    } catch (error) {
        console.error("Error making M-Pesa request:", error);
        throw error;
    }
};