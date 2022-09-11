import { keccak256 } from "@ethersproject/keccak256";
import * as rlp from "rlp";

export function predictContractAddress(deployerAddress: string, nonce: number): string {
  const rlpEncoded = rlp.encode([deployerAddress, nonce]).toString("hex");
  const hash = keccak256("0x" + rlpEncoded).slice(12);
  const address = hash.slice(14);
  return "0x" + address;
}