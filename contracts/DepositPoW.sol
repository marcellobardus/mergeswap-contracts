// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {TrieProofs} from "./lib/TrieProofs.sol";
import {RLP} from "./lib/RLP.sol";

import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract DepositPoW is ReentrancyGuard, Pausable, Ownable {
    using TrieProofs for bytes;
    using RLP for RLP.RLPItem;
    using RLP for bytes;

    event Deposit(uint256 id, uint256 amount, address depositor, address recipient);

    address public immutable relayer;
    uint256 public depositsCount;

    mapping(uint256 => bytes32) public stateRoots;
    mapping(uint256 => bytes32) public deposits;

    constructor(address _relayer) {
        relayer = _relayer;
    }

    // TODO nonreentrant
    function deposit(uint256 amount, address recipient) public payable nonReentrant whenNotPaused {
        require(msg.value == amount, "ERR_INVALID_AMOUNT");
        deposits[depositsCount] = keccak256(abi.encode(amount, recipient));
        emit Deposit(depositsCount++, amount, msg.sender, recipient);
    }

    // TODO nonreentrant
    function withdraw(uint256 withdrawalId, bytes calldata proof) public payable {
        payable(msg.sender).transfer(0);
    }

    function relayStateRoot(
        uint256 blockNumber,
        bytes32 stateRoot,
        bytes calldata signature
    ) public {
        require(relayer == ECDSA.recover(stateRoot, signature), "ERR_INVALID_SIGNATURE");
        stateRoots[blockNumber] = stateRoot;
    }
}
