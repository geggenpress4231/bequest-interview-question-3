import express from "express";
import cors from "cors";
import { createMerkleTree, getProof, getRoot, validateMerkleProof } from "./utils/merkle";
import { storedData, historicalRoots } from "./utils/dataStore";
import keccak256 from "keccak256";

const app = express();
app.use(cors());
app.use(express.json());

// Types
type Entry = {
  hash: string;
  proof: string[]; 
  version: number;
  timestamp: string; 
};

// Globals
const entries: Entry[] = [];
let currentVersion = 0;

// Store endpoint
app.post("/store", (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== "string" || text.trim() === "") {
    console.log("Invalid text input:", text);
    return res.status(400).json({ success: false, message: "Invalid text input" });
  }

  // Increment version first to include it in the salt
  const version = entries.length + 1;

  // Create a unique salt using the version number and date.now
  const salt = `${version}:${Date.now()}`;
  const saltedText = `${text}:${salt}`;
  const hash = keccak256(saltedText).toString("hex");
  console.log("Generated Hash with salt:", hash);

  // Store the plain text
  storedData[hash] = text;
  console.log("Text Stored:", text);
  const timestamp = new Date().toISOString();

  // Add the new entry with an empty proof
  const newEntry: Entry = { hash, proof: [], version, timestamp };
  entries.push(newEntry);
  console.log("Entries after storing:", entries);

  // Create Merkle Tree and generate proof
  const partialHashes = entries.map((e) => e.hash);
  const tree = createMerkleTree(partialHashes);
  const newProof = getProof(tree, hash);
  newEntry.proof = newProof;
  console.log(`Generated Proof for version ${version}:`, newProof);

  // Calculate and store the new Merkle root
  const newRoot = getRoot(tree);
  historicalRoots.push({ version, root: newRoot });
  console.log("New Root:", newRoot);
  console.log("Current Merkle root:", newRoot);

  // Increment the global version counter
  currentVersion = version;

  return res.json({ success: true, root: newRoot, version, hash });
});

// Retrieve Proof for a Specific Hash and Version
app.post("/proof", (req, res) => {
  const { hash, version } = req.body;

  // Validate inputs
  if (!hash || typeof hash !== "string" || hash.length !== 64) {
    console.log("Invalid hash provided:", hash);
    return res.status(400).json({ proof: [], exists: false, message: "Invalid hash provided" });
  }

  if (!version || isNaN(Number(version))) {
    console.log("Invalid version provided:", version);
    return res.status(400).json({ proof: [], exists: false, message: "Invalid version provided" });
  }

  console.log("=== Proof Retrieval Started ===");
  console.log("Hash:", hash);
  console.log("Version:", version);

  // Find the entry matching both hash and version
  const entry = entries.find((e) => e.hash === hash && e.version === Number(version));

  if (!entry) {
    console.log(`Entry not found for hash: ${hash} and version: ${version}`);
    return res.status(404).json({ proof: [], exists: false, message: "Hash/version not found" });
  }

  console.log(`Entry found: Version ${entry.version}, Timestamp ${entry.timestamp}`);
  console.log("Stored Proof:", entry.proof);
  console.log("=== Proof Retrieval Ended ===\n");

  return res.json({ proof: entry.proof, exists: true });
});

// Verify Hash Against Merkle Tree (Version-Aware)
app.post("/verify", (req, res) => {
  const { hash, proof, version } = req.body;

  // Validate inputs
  if (!hash || typeof hash !== "string" || hash.length !== 64) {
    return res.status(400).json({ valid: false, message: "Invalid hash provided" });
  }

  if (!Array.isArray(proof)) {
    return res.status(400).json({ valid: false, message: "Invalid proof provided" });
  }

  if (!version || isNaN(Number(version))) {
    return res.status(400).json({ valid: false, message: "Invalid version provided" });
  }

  console.log("=== Verification Started ===");
  console.log("Hash:", hash);
  console.log("Proof:", proof);
  console.log("Version:", version);

  // Locate the entry matching (hash, version)
  const entry = entries.find((e) => e.hash === hash && e.version === Number(version));
  if (!entry) {
    console.log(`Entry not found for hash: ${hash} and version: ${version}`);
    return res.status(404).json({ valid: false, message: "Hash/version not found in entries" });
  }

  console.log(`Entry found: Version ${entry.version}, Timestamp ${entry.timestamp}`);
  console.log("Stored Proof:", entry.proof);

  // Build the partial Merkle tree for [1..version]
  const partialEntries = entries.filter((e) => e.version <= Number(version));
  const partialHashes = partialEntries.map((e) => e.hash);
  console.log(`Partial Hashes up to version ${version}:`, partialHashes);

  const tree = createMerkleTree(partialHashes);
  const expectedRoot = getRoot(tree);
  console.log("Expected Merkle Root:", expectedRoot);

  // Reconstruct the root from the proof
  let computed = Buffer.from(hash, "hex");
  console.log("Initial Computed Hash (Leaf):", computed.toString("hex"));

  for (let i = 0; i < proof.length; i++) {
    const siblingHex = proof[i];
    const sibling = Buffer.from(siblingHex, "hex");
    console.log(`Sibling ${i + 1}:`, sibling.toString("hex"));

    if (sibling.compare(computed) < 0) {
      computed = keccak256(Buffer.concat([sibling, computed]));
      console.log(`Computed Hash after concatenating [sibling, computed]:`, computed.toString("hex"));
    } else {
      computed = keccak256(Buffer.concat([computed, sibling]));
      console.log(`Computed Hash after concatenating [computed, sibling]:`, computed.toString("hex"));
    }
  }

  const reconstructedRoot = computed.toString("hex");
  console.log("Reconstructed Merkle Root from Proof:", reconstructedRoot);
  console.log("Comparison with Expected Root:", reconstructedRoot === expectedRoot ? "Match" : "Mismatch");

  // Compare the reconstructed root with the expected root
  const valid = reconstructedRoot === expectedRoot;
  if (!valid) {
    console.log("Verification failed. Mismatch between reconstructed and expected roots.");
  } else {
    console.log("Verification succeeded. Proof is valid.");
  }

  console.log("=== Verification Ended ===\n");

  return res.json({ valid, root: expectedRoot });
});

// Retrieve Original Text by Version
app.post("/recover", (req, res) => {
  const { version } = req.body; // Accepting version number

  if (!version || isNaN(Number(version))) {
    console.log("Invalid version number provided:", version);
    return res.status(400).json({ success: false, message: "Invalid version number" });
  }

  const entry = entries.find((e) => e.version === Number(version));
  if (!entry) {
    console.log(`Version not found: ${version}`);
    return res.status(404).json({ success: false, message: "Version not found" });
  }

  const { hash } = entry;

  // Retrieve text using the hash
  const text = storedData[hash];
  if (!text) {
    console.log(`Data not found for hash: ${hash}`);
    return res.status(404).json({ success: false, message: "Data not found" });
  }

  return res.json({ success: true, data: text, hash });
});

// Fetch Current Merkle Tree Root
app.get("/root", (req, res) => {
  const leaves = entries.map((e) => Buffer.from(e.hash, "hex"));
  if (leaves.length === 0) {
    return res.json({ root: null });
  }
  const tree = createMerkleTree(entries.map((e) => e.hash));
  const root = getRoot(tree);
  console.log("Current Merkle root:", root);
  return res.json({ root });
});

// Fetch Historical Roots
app.get("/historical-roots", (req, res) => {
  const rootsWithTimestamps = historicalRoots.map((hr) => ({
    version: hr.version,
    timestamp: entries.find((e) => e.version === hr.version)?.timestamp || "N/A",
  }));
  console.log("Historical Roots:", rootsWithTimestamps);
  return res.json(rootsWithTimestamps);
});

// Check Tampering
app.post("/check-tampering", (req, res) => {
  let tampered = false;
  const tamperedVersions: number[] = [];

  historicalRoots.forEach((hr) => {
    const partialEntries = entries.filter((e) => e.version <= hr.version);
    const partialHashes = partialEntries.map((e) => e.hash);
    const tree = createMerkleTree(partialHashes);
    const calculatedRoot = getRoot(tree);

    if (calculatedRoot !== hr.root) {
      tampered = true;
      tamperedVersions.push(hr.version);
      console.log(`Tampering detected for version: ${hr.version}`);
    } else {
      console.log(`No tampering detected for version: ${hr.version}`);
    }
  });

  if (tampered) {
    return res.status(400).json({
      success: false,
      message: "Tampering detected for versions.",
      tamperedVersions,
    });
  }

  console.log("No tampering detected across all versions.");
  return res.json({ success: true, message: "No tampering detected" });
});

// Start Server
app.listen(8080, () => {
  console.log("Server running on port 8080");
});
