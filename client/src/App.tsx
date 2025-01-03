import React, { useState, useEffect, useRef } from "react";
import {
  storeData,
  fetchRoot,
  fetchProof,
  verifyHash,
  fetchHistoricalRoots,
  recoverData,
  checkTampering,
} from "./utils/api.ts";
import { encryptText, decryptText } from "./utils/encryption.ts"; // Import encryption functions
import "./App.css";

function App() {
  const [data, setData] = useState("");
  const [root, setRoot] = useState("");
  const [currentHash, setCurrentHash] = useState<string>("");
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [tamperingResult, setTamperingResult] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const textBoxRef = useRef<HTMLInputElement>(null);

  const sanitizeInput = (input: string): string => {
    return input.replace(/[^a-zA-Z0-9 \-]/g, "").trim();
  };

  useEffect(() => {
    (async () => {
      const rootResponse = await fetchRoot();
      setRoot(rootResponse || "No root yet");

      const historicalRootsResponse = await fetchHistoricalRoots();
      setVersions(historicalRootsResponse || []);
    })();
  }, []);

  function showAlertIfEmpty() {
    if (!data.trim()) {
      alert("Please enter valid data.");
      return true;
    }
    return false;
  }

  async function submitData() {
    const cleanedData = sanitizeInput(data);
    if (!cleanedData || showAlertIfEmpty()) return;

    try {
      setLoading(true);
      const encryptedData = encryptText(cleanedData); // Encrypt the text
      const result = await storeData(encryptedData); // Send encrypted text
      if (result.success) {
        alert("Data submitted successfully.");
        const rootResponse = await fetchRoot();
        setRoot(rootResponse || "No root yet");
        const historicalRootsResponse = await fetchHistoricalRoots();
        setVersions(historicalRootsResponse || []);
        setData(""); // Clear input
        setCurrentHash(result.hash);
      } else {
        alert("Failed to submit data.");
      }
    } catch (error) {
      alert("An error occurred while submitting data.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyData() {
    if (showAlertIfEmpty()) return;

    if (selectedVersion === null) {
      alert("Please select a version to verify.");
      return;
    }

    if (!currentHash) {
      alert("No hash available. Please recover data first.");
      return;
    }

    try {
      setLoading(true);
      const proofResponse = await fetchProof(currentHash, selectedVersion); // Fetch proof from backend
      if (!proofResponse.exists) {
        alert("Proof not found for the selected version. Please submit the text first.");
        return;
      }

      const verifyResponse = await verifyHash(currentHash, proofResponse.proof, selectedVersion); // Verify with backend
      if (verifyResponse.valid) {
        alert("Text is verified.");
      } else {
        alert(`Text not verified. Reason: ${verifyResponse.message || "Unknown error."}`);
      }
    } catch (error) {
      alert("Text not verified.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVersionChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const version = parseInt(event.target.value, 10);
    
    // Validate if the selected version exists in the fetched versions
    const versionExists = versions.some((v) => v.version === version);
    if (!versionExists) {
      alert("Invalid version selected. Please choose a valid version.");
      return;
    }
  
    setSelectedVersion(version);
  
    if (!version) {
      setData("");
      setCurrentHash("");
      return;
    }
  
    try {
      setLoading(true);
      const recoveredData = await recoverData(version);
  
      if (recoveredData.success && recoveredData.data) {
        const decryptedData = decryptText(recoveredData.data);
        setData(decryptedData);
        setCurrentHash(recoveredData.hash);
        if (textBoxRef.current) {
          textBoxRef.current.focus();
        }
      } else {
        console.error("Failed to recover data:", recoveredData.message);
        alert(recoveredData.message || "Failed to recover data for the selected version.");
      }
    } catch (error) {
      console.error("Error in handleVersionChange:", error);
      alert("An error occurred while recovering data.");
    } finally {
      setLoading(false);
    }
  }
  
  async function handleTamperCheck() {
    try {
      setLoading(true);
      const result = await checkTampering();
      if (result.success) {
        setTamperingResult("No tampering detected.");
      } else {
        setTamperingResult(`Tampering detected in versions: ${result.tamperedVersions.join(", ")}`);
      }
    } catch (error) {
      setTamperingResult("An error occurred while checking for tampering.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-container">
      <div className="app-title">Saved Data</div>

      <input
        ref={textBoxRef}
        className="input-field"
        type="text"
        value={data}
        onChange={(e) => {
          setData(sanitizeInput(e.target.value));
          setSelectedVersion(null);
        }}
        placeholder="Enter your data here"
      />

      <div className="buttons-container">
        <button className="button" onClick={submitData} disabled={loading}>
          {loading ? "Submitting..." : "Submit Data"}
        </button>
        <button className="button" onClick={verifyData} disabled={loading}>
          {loading ? "Verifying..." : "Verify Data"}
        </button>
      </div>

      <div className="version-select-container">
        <label htmlFor="versionSelect" style={{ fontSize: "20px", marginRight: "10px" }}>
          Select Version:
        </label>
        <select
          id="versionSelect"
          onChange={handleVersionChange}
          value={selectedVersion || ""}
          className="version-select"
        >
          <option value="">-- Select Version --</option>
          {versions.map((version) => (
            <option key={version.version} value={version.version}>
              Version {version.version} - {new Date(version.timestamp).toLocaleString()}
            </option>
          ))}
        </select>
      </div>

      <div className="tamper-check-container">
        <button className="button" onClick={handleTamperCheck} disabled={loading}>
          {loading ? "Checking..." : "Check for Tampering"}
        </button>
        <p>{tamperingResult}</p>
      </div>
    </div>
  );
}

export default App;
