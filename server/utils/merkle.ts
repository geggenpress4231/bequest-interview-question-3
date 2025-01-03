import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

// Merkle tree related functions
export function createMerkleTree(hashes: string[]) {
  const leaves = hashes.map((hash) => Buffer.from(hash, "hex"));
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  return tree;
}

export function getProof(tree: MerkleTree, hash: string) {
  const leaf = Buffer.from(hash, "hex");
  return tree.getProof(leaf).map((x) => x.data.toString("hex"));
}

export function getRoot(tree: MerkleTree) {
  return tree.getRoot().toString("hex");
}


export function validateMerkleProof(hash: string, proof: string[], historicalRoot: string): boolean {
    let computedHash = Buffer.from(hash, "hex");
    console.log("Initial hash:", computedHash.toString("hex"));
  
    for (const siblingHex of proof) {
      const sibling = Buffer.from(siblingHex, "hex");
      console.log("Sibling hash:", sibling.toString("hex"));
  
      computedHash = computedHash.compare(sibling) < 0
        ? keccak256(Buffer.concat([computedHash, sibling]))
        : keccak256(Buffer.concat([sibling, computedHash]));
  

    }
  

  
    return computedHash.toString("hex").trim() === historicalRoot.trim();
  }
