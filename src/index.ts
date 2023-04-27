export { MerkleTree, MerkleProof, TreeNode } from './MerkleTree';
export { generateMerkleProofCallData, generateSigProofCallData, toHex } from './Library';
export { mimcSponge } from "./Mimc";
export { poseidon1, poseidon2 } from "./Poseidon";
import { MerkleTree, generateSigProofCallData, generateMerkleProofCallData, poseidon1, poseidon2, toHex } from 'zkdrops-lib';
import { providers, Contract, ethers, BigNumber } from 'ethers';

// from index.js
//import * as AIRDROP_JSON from "../ABIs/PrivateAirdrop.json";
//import * as ERC20_JSON from "@openzeppelin/contracts/build/contracts/ERC20PresetFixedSupply.json";

//import React from 'react';
//import 'bootstrap/dist/css/bootstrap.min.css';

// for verify the eth_addr ownership
async function calculateSigProof(privateKey, proof) {
  // Connect to wallet, get address
  let provider = new providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  let signer = provider.getSigner();
  let address = await signer.getAddress();

  // Load files and run proof locally
  // TODO: zkey file path
  let zkFilePath = "";
  let wasmBuff = await getFileBuffer(`${zkFilePath}/circuit.wasm`);
  let zkeyBuff = await getFileBuffer(`${zkFilePath}/circuit_final.zkey`);

  let preTime = new Date().getTime();
  proof = await generateSigProofCallData(privateKey, wasmBuff, zkeyBuff);
  let elapsed =  new Date().getTime() - preTime;
  console.log(`Time to compute proof: ${elapsed}ms`);
}

// for verify the eth_addr hold certain resource 
async function calculateMerkleProof(mainAddr, proof) {
  // Connect to wallet, get address
  let provider = new providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  let signer = provider.getSigner();
  let address = await signer.getAddress();

  // Load files and run proof locally
  // TODO: zkey file path
  let zkFilePath = "";
  // TODO:fetch address set
  //let contract = new Contract(contractAddr, AIRDROP_JSON.abi, provider.getSigner());
  //try {
  //  let addresses = await contract.getAllAddresses().call();
  //} catch (error) {
  //  alert("get addresses failed")
  //}
  // fetch address set done
  let mtSs = await getFileString(`${zkFilePath}/mt_8192.txt`);
  let wasmBuff = await getFileBuffer(`${zkFilePath}/circuit.wasm`);
  let zkeyBuff = await getFileBuffer(`${zkFilePath}/circuit_final.zkey`);

  // Load the Merkle Tree locally
  let mt = MerkleTree.createFromStorageString(mtSs);
  //let mt = MerkleTree.createFromLeaves(addresses);
  
  let preTime = new Date().getTime();
  let biMainAddr = BigInt(mainAddr);
  proof = await generateMerkleProofCallData(mt, biMainAddr, address, wasmBuff, zkeyBuff);
  let elapsed =  new Date().getTime() - preTime;
  console.log(`Time to compute proof: ${elapsed}ms`);
}

/*
async function collectDrop(key, airdropAddr, state, setState) {
  if (state.proof === '') {
    alert("No proof calculated yet!")
    return
  }
  if (state.airdropAddress === '') {
    alert("No airdrop address entered!")
    return
  }
  setState({...state, loading:true})

  let provider = new providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  let contract = new Contract(airdropAddr, AIRDROP_JSON.abi, provider.getSigner());
  let keyHash = await poseidon1(BigInt(key));

  try {
    let tx = await contract.collectAirdrop(state.proof, toHex(keyHash));
    await tx.wait()
  } catch (error) {
    alert("Airdrop collection failed: " + error['data']['message'])
  }

  setState({...state, loading:false})
}
*/


async function getFileString(filename) {
  let req = await fetch(filename);
  return await req.text();
}
async function getFileBuffer(filename) {
  let req = await fetch(filename);
  return Buffer.from(await req.arrayBuffer());
}
