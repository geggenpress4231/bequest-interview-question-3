import { keccak256 as keccak256Js } from "js-sha3";

export function generateHash(data) {
  return keccak256Js(data.trim());
}
