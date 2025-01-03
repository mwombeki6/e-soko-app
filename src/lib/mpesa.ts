import * as SecureStore from "expo-secure-store";

// Constants
const SESSION_KEY_STORAGE_KEY = "mpesaSessionKey";
const SUPABASE_EDGE_FUNCTION_URL = "https://hxwsymkdhujkskgdtrti.supabase.co/functions/v1/mpesa-checkout"; // Replace with your Supabase Edge Function URL
const MPESA_API_BASE_URL = "https://openapi.m-pesa.com/sandbox/ipg/v2/vodacomTZN";

// Fetch and store the session key
export const fetchSessionKey = async (): Promise<string> => {
    try {
        // Check if a valid session key already exists in storage
        const storedSessionKey = await SecureStore.getItemAsync(SESSION_KEY_STORAGE_KEY);
        if (storedSessionKey) {
            return storedSessionKey;
        }

        // Fetch a new session key from the Supabase Edge Function
        const response = await fetch(SUPABASE_EDGE_FUNCTION_URL, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch session key: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.output_SessionID) {
            throw new Error("Session key not found in response");
        }

        // Store the session key securely
        await SecureStore.setItemAsync(SESSION_KEY_STORAGE_KEY, data.output_SessionID);

        return data.output_SessionID;
    } catch (error) {
        console.error("Error fetching session key:", error);
        throw error;
    }
};

// Clear the stored session key
export const clearSessionKey = async (): Promise<void> => {
    try {
        await SecureStore.deleteItemAsync(SESSION_KEY_STORAGE_KEY);
    } catch (error) {
        console.error("Error clearing session key:", error);
        throw error;
    }
};

// Make authenticated M-Pesa API requests
export const mpesaRequest = async (
    endpoint: string,
    method: string = "GET",
    body: Record<string, unknown> | null = null
): Promise<any> => {
    try {
        // Ensure a session key is available
        let sessionKey = await SecureStore.getItemAsync(SESSION_KEY_STORAGE_KEY);
        if (!sessionKey) {
            sessionKey = await fetchSessionKey();
        }

        // Make the API request
        const response = await fetch(`${MPESA_API_BASE_URL}${endpoint}`, {
            method,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${sessionKey}`,
                Origin: "*",
            },
            body: body ? JSON.stringify(body) : null,
        });

        if (!response.ok) {
            throw new Error(`M-Pesa API request failed: ${response.statusText}`);
        }

        const data = await response.json();

        // Handle M-Pesa API-specific errors
        if (data.output_ResponseCode !== "INS-0") {
            throw new Error(data.output_ResponseDesc || "M-Pesa API error");
        }

        return data;
    } catch (error) {
        console.error("Error making M-Pesa request:", error);
        throw error;
    }
};

// Helper function to initiate a C2B payment
export const initiateC2BPayment = async (
    phoneNumber: string,
    amount: number,
    reference: string
): Promise<any> => {
    try {
        const response = await mpesaRequest("/c2bPayment/singleStage/", "POST", {
            input_Amount: amount,
            input_Country: "TZN",
            input_Currency: "TZS",
            input_CustomerMSISDN: `255${phoneNumber}`, // Add Tanzanian country code
            input_ServiceProviderCode: "000000", // Replace with your service provider code
            input_ThirdPartyConversationID: reference, // Unique transaction reference
            input_TransactionReference: reference, // Unique transaction reference
            input_PurchasedItemsDesc: "Cart Items", // Description of purchased items
        });

        return response;
    } catch (error) {
        console.error("Error initiating C2B payment:", error);
        throw error;
    }
};