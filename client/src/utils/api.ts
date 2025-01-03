
// utils/api.js
// Tree Shaking Note:
// This module contains utility functions for API interactions.
// These functions are modular and actively used across the project. 
// Future improvements will ensure that Webpack's tree-shaking capabilities are leveraged 
// to include only the necessary code paths in production builds, reducing bundle size 
// and exposure of non-critical logic.


const TRUSTED_ROOT_URL = "http://localhost:8080/root";
const API_URL = "http://localhost:8080";

export async function fetchRoot(retries = 5, delay = 3000) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(TRUSTED_ROOT_URL);
      const json = await response.json();
      if (json.root) return json.root;

      console.log(`Retrying... (${retries - attempt - 1} attempts left)`);
      await new Promise((resolve) => setTimeout(resolve, delay)); // Wait before retrying
    } catch (error) {
      console.error("Error fetching trusted root:", error);
    }
  }
  return null; // Return null if all retries fail
}

// utils/api.ts (Frontend)

export async function storeData(text: string) {
  try {
    const response = await fetch(`${API_URL}/store`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to store data.");
    }

    const data = await response.json();
    return data; // Expected to include { success: boolean, root: string, version: number, hash: string }
  } catch (error) {
    console.error("Error storing data:", error);
    return { success: false, root: "", version: 0, hash: "" };
  }
}


// utils/api.ts

export async function fetchProof(hash: string, version: number) {
  try {
    const response = await fetch(`${API_URL}/proof`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hash, version }), // Include version here
    });
    const data = await response.json();
    return data; // Expected to include { proof: string[], exists: boolean }
  } catch (error) {
    console.error("Error fetching proof:", error);
    return { proof: [], exists: false };
  }
}





export async function verifyHash(hash: string, proof: string[], version: number) {
  try {
    const response = await fetch(`${API_URL}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hash, proof, version }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Verification failed.");
    }

    return data;
  } catch (error) {
    console.error("Error verifying hash:", error);
    return { valid: false, root: "", message: error.message };
  }
}





export async function fetchHistoricalRoots() {
  try {
    const response = await fetch(`${API_URL}/historical-roots`);
    if (!response.ok) {
      throw new Error("Failed to fetch historical roots");
    }
    const data = await response.json();

    // Now the data is an array of versions, not objects with version and root
    return data;  // This should be an array of { version: number }
  } catch (error) {
    console.error("Error fetching historical roots:", error);
    throw error;
  }
}

// Recover Data for a specific version
export async function recoverData(version: number) {
  try {
    const response = await fetch(`${API_URL}/recover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version }), // Sending version number to fetch the data
    });

    if (!response.ok) {
      throw new Error("Failed to recover data");
    }

    const result = await response.json();
    return result;  // Should return the decrypted text as `data`
  } catch (error) {
    console.error("Error recovering data:", error);
    throw error;
  }
}


// utils/api.ts
export async function checkTampering() {
  try {
    const response = await fetch(`${API_URL}/check-tampering`, {
      method: "POST",  // Use POST method
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({})  // Sending an empty body (optional if server does not require any specific data)
    });

    if (!response.ok) {
      throw new Error("Failed to check tampering");
    }

    const result = await response.json();
    return result;  // Should return { success: true/false, tamperedVersions: [] }
  } catch (error) {
    console.error("Error checking tampering:", error);
    throw new Error("Error checking tampering");
  }
}

