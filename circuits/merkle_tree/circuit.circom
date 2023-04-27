
pragma circom 2.0.0;

// Massively borrowed from tornado cash: https://github.com/tornadocash/tornado-core/tree/master/circuits
include "../../node_modules/circomlib/circuits/mimcsponge.circom";
include "../../node_modules/circomlib/circuits/poseidon.circom";

// Computes MiMC([left, right])
template HashLeftRight() {
    signal input left;
    signal input right;
    signal output hash;

    component hasher = MiMCSponge(2, 220, 1);
    hasher.ins[0] <== left;
    hasher.ins[1] <== right;
    hasher.k <== 0;
    hash <== hasher.outs[0];
}

// if s == 0 returns [in[0], in[1]]
// if s == 1 returns [in[1], in[0]]
template DualMux() {
    signal input in[2];
    signal input s;
    signal output out[2];

    s * (1 - s) === 0;
    out[0] <== (in[1] - in[0])*s + in[0];
    out[1] <== (in[0] - in[1])*s + in[1];
}

// Verifies that merkle proof is correct for given merkle root and a leaf
// pathIndices input is an array of 0/1 selectors telling whether given pathElement is on the left or right side of merkle path
template MerkleTreeChecker(levels) {
    signal input leaf;
    signal input root;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    component selectors[levels];
    component hashers[levels];

    for (var i = 0; i < levels; i++) {
        selectors[i] = DualMux();
        selectors[i].in[0] <== i == 0 ? leaf : hashers[i - 1].hash;
        selectors[i].in[1] <== pathElements[i];
        selectors[i].s <== pathIndices[i];

        hashers[i] = HashLeftRight();
        hashers[i].left <== selectors[i].out[0];
        hashers[i].right <== selectors[i].out[1];
    }

    root === hashers[levels - 1].hash;
}

template CommitmentHasher() {
    signal input commitment;
    signal output commitmentHash;

    component commitmentHasher = Poseidon(1);

    commitmentHasher.inputs[0] <== commitment;

    commitmentHash <== commitmentHasher.out;
}

// Verifies that commitment that corresponds to given secret and nullifier is included in the merkle tree of deposits
template Withdraw(levels) {
    signal input root; // public
    signal input recipient; // public

    signal input commitment; // private
    signal input pathElements[levels]; // private
    signal input pathIndices[levels]; // private

    component hasher = CommitmentHasher();
    hasher.commitment <== commitment;

    component tree = MerkleTreeChecker(levels);
    tree.leaf <== hasher.commitmentHash;
    tree.root <== root;
    for (var i = 0; i < levels; i++) {
        tree.pathElements[i] <== pathElements[i];
        tree.pathIndices[i] <== pathIndices[i];
    }

    // Squares used to prevent optimizer from removing constraints
    signal recipientSquare;
    recipientSquare <== recipient * recipient;
}

component main {public [root, recipient]} = Withdraw(13); // This value  corresponds to width of tree (2^x)

