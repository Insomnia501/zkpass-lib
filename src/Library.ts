/**
 * Library which abstracts away much of the details required to interact with the private airdrop contract.
 */
const snarkjs = require("snarkjs");

import { MerkleTree } from './MerkleTree';
import { poseidon1, poseidon2 } from './Poseidon';

export async function generateSigProofCallData(
        privateKey: string, 
        circuitWasmBuffer: Buffer,
        zkeyBuffer: Buffer): Promise<string> {
    let privateKeyChunks = splitPrivateKey(privateKey);
    let inputs = await generateSigCircuitInputJson(privateKeyChunks);

    let { proof, publicSignals } = await snarkjs.plonk.fullProve(inputs, circuitWasmBuffer, zkeyBuffer);

    let proofProcessed = unstringifyBigInts(proof);
    let pubProcessed = unstringifyBigInts(publicSignals);
    let allSolCallData: string = await snarkjs.plonk.exportSolidityCallData(proofProcessed, pubProcessed);
    let solCallDataProof = allSolCallData.split(',')[0];
    return solCallDataProof;
}

export async function generateMerkleProofCallData(
        merkleTree: MerkleTree, 
        mainAddr: BigInt, 
        receiverAddr: string,
        circuitWasmBuffer: Buffer,
        zkeyBuffer: Buffer): Promise<string> {
    let inputs = await generateMerkleCircuitInputJson(merkleTree, BigInt(mainAddr), BigInt(receiverAddr));

    let { proof, publicSignals } = await snarkjs.plonk.fullProve(inputs, circuitWasmBuffer, zkeyBuffer);

    let proofProcessed = unstringifyBigInts(proof);
    let pubProcessed = unstringifyBigInts(publicSignals);
    let allSolCallData: string = await snarkjs.plonk.exportSolidityCallData(proofProcessed, pubProcessed);
    let solCallDataProof = allSolCallData.split(',')[0];
    return solCallDataProof;
}

export function toHex(number: BigInt, length = 32) {
    const str: string = number.toString(16);
    return '0x' + str.padStart(length * 2, '0');
}

// Non-exported 

function splitPrivateKey(privateKeyHex: string): number[] {
  if (privateKeyHex.length !== 64) {
    throw new Error("Invalid private key length. Expected 64 hex characters.");
  }

  // 将私钥转换为 BigInt 类型的十进制值
  const privateKeyDecimal = BigInt(0x${privateKeyHex});

  // 计算每部分的大小
  const chunkSize = privateKeyDecimal / BigInt(4);

  // 分割私钥
  const privateKeyChunks = [
    Number(privateKeyDecimal - chunkSize * BigInt(3)),
    Number(privateKeyDecimal - chunkSize * BigInt(2)),
    Number(privateKeyDecimal - chunkSize * BigInt(1)),
    Number(privateKeyDecimal)
  ];

  return privateKeyChunks;
}

interface SigCircuitInput {
    privkey: number[];
}

interface MerkleCircuitInput {
    root: BigInt;
    commitment: BigInt;
    pathIndices: number[];
    pathElements: BigInt[];
    recipient: BigInt;
}

async function generateSigCircuitInputJson(
    privateKeyChunks: number[]): Promise<SigCircuitInput> {
    let inputObj = {
        privkey: privateKeyChunks
    }
    return inputObj;
}

async function generateMerkleCircuitInputJson(
    mt: MerkleTree, 
    mainAddrBi: BigInt, 
    receiverAddr: BigInt): Promise<MerkleCircuitInput> {
    let commitment = await poseidon1(mainAddrBi);
    let mp = mt.getMerkleProof(commitment);

    let inputObj = {
        root: mt.root.val,
        commitment: commitment,
        pathIndices: mp.indices,
        pathElements: mp.vals,
        recipient: receiverAddr
    }
    return inputObj;
}

// Lifted from ffutils: https://github.com/iden3/ffjavascript/blob/master/src/utils_bigint.js
function unstringifyBigInts(o: any): any {
    if ((typeof(o) == "string") && (/^[0-9]+$/.test(o) ))  {
        return BigInt(o);
    } else if ((typeof(o) == "string") && (/^0x[0-9a-fA-F]+$/.test(o) ))  {
        return BigInt(o);
    } else if (Array.isArray(o)) {
        return o.map(unstringifyBigInts);
    } else if (typeof o == "object") {
        const res: {[key: string]: any}= {};
        const keys = Object.keys(o);
        keys.forEach( (k) => {
            res[k] = unstringifyBigInts(o[k]);
        });
        return res;
    } else {
        return o;
    }
}

function toBufferLE(bi: BigInt, width: number): Buffer {
    const hex = bi.toString(16);
    const buffer =
        Buffer.from(hex.padStart(width * 2, '0').slice(0, width * 2), 'hex');
    buffer.reverse();
    return buffer;
}