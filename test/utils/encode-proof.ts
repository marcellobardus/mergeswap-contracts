import * as RLP from "rlp";

export function encodeProof(proof: string[]) {
  return (
    /// @ts-ignore
    "0x" + RLP.encode(proof.map((part) => RLP.decode(part))).toString("hex")
  );
}
