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

    error IncorrectNetwork();

    uint8 private constant ACCOUNT_STORAGE_ROOT_INDEX = 2;
    uint256 internal constant MAX_DIFFICULTY = 2**64;

    address public immutable relayer;
    address public immutable withdrawalContract;
    uint256 public immutable withdrawalsMapSlotIndex;

    uint256 public depositsCount;
    mapping(uint256 => bytes32) public deposits;

    mapping(uint256 => bytes32) public withdrawalContractStorageRoots;
    mapping(uint256 => bytes32) public stateRoots;

    mapping(uint256 => bool) public processedWithdrawals;

    constructor(
        address _relayer,
        address _withdrawalContract,
        uint256 _withdrawalsMapSlotIndex
    ) {
        relayer = _relayer;
        withdrawalContract = _withdrawalContract;
        withdrawalsMapSlotIndex = _withdrawalsMapSlotIndex;
    }

    // Only succeeds for PoW network
    modifier onlyPoW() {
        if (isEthMainnet()) {
            revert IncorrectNetwork();
        }
        _;
    }

    function deposit(uint256 amount, address recipient) public payable nonReentrant whenNotPaused onlyPoW {
        require(msg.value == amount, "ERR_INVALID_AMOUNT");
        deposits[depositsCount] = keccak256(abi.encode(amount, recipient));
        emit Deposit(depositsCount++, amount, msg.sender, recipient);
    }

    function updateWithdrawalContractStorageRoot(uint256 blockNumber, bytes memory accountProof) public onlyPoW {
        bytes32 stateRoot = stateRoots[blockNumber];
        require(stateRoot != bytes32(0), "ERR_STATE_ROOT_NOT_AVAILABLE");

        bytes32 accountProofPath = keccak256(abi.encodePacked(withdrawalContract));
        bytes memory accountRLP = accountProof.verify(stateRoot, accountProofPath); // reverts if proof is invalid
        bytes32 accountStorageRoot = bytes32(accountRLP.toRLPItem().toList()[ACCOUNT_STORAGE_ROOT_INDEX].toUint());

        withdrawalContractStorageRoots[blockNumber] = accountStorageRoot;
    }

    // TODO nonreentrant
    function withdraw(
        uint256 withdrawalId,
        address recipient,
        uint256 amount,
        uint256 withdrawalBlockNumber,
        bytes memory storageProof
    ) public nonReentrant onlyPoW {
        bytes32 contractStorageRoot = withdrawalContractStorageRoots[withdrawalBlockNumber];
        require(contractStorageRoot != bytes32(0), "ERR_STORAGE_ROOT_NOT_AVAILABLE");

        uint256 slot = uint256(keccak256(abi.encode(withdrawalId, withdrawalsMapSlotIndex)));

        require(!processedWithdrawals[withdrawalId], "ERR_WITHDRAWAL_ALREADY_PROCESSED");

        bytes32 proofPath = keccak256(abi.encodePacked(slot));
        uint256 slotValue = storageProof.verify(contractStorageRoot, proofPath).toRLPItem().toUint(); // reverts if proof is invalid
        // TODO ensure slotValue == keccak(recipient, amount)

        processedWithdrawals[withdrawalId] = true;
        payable(recipient).transfer(amount);
    }

    function relayStateRoot(
        uint256 blockNumber,
        bytes32 stateRoot,
        bytes calldata signature
    ) public onlyPoW {
        require(relayer == ECDSA.recover(stateRoot, signature), "ERR_INVALID_SIGNATURE");
        stateRoots[blockNumber] = stateRoot;
    }

    function isEthMainnet() internal view returns (bool result) {
        return (block.difficulty > MAX_DIFFICULTY);
    }
}
