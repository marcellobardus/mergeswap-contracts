// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {TrieProofs} from "./lib/TrieProofs.sol";
import {RLP} from "./lib/RLP.sol";

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract WrappedPoWETH is ERC20 {
    using TrieProofs for bytes;
    using RLP for RLP.RLPItem;
    using RLP for bytes;

    event Withdrawal(uint256 id, uint256 amount, address withdrawMadeBy, address recipient);

    uint8 private constant ACCOUNT_STORAGE_ROOT_INDEX = 2;

    address public immutable relayer;
    address public immutable depositContract;
    uint256 public immutable depositsMapSlotIndex;

    uint256 public withdrawalsCount;
    mapping(uint256 => bytes32) public withdrawals;

    mapping(uint256 => bytes32) public stateRoots;
    mapping(uint256 => bytes32) public depositContractStorageRoots;

    mapping(uint256 => bool) public processedDeposits;

    constructor(
        address _relayer,
        address _depositContract,
        uint256 _depositsMapSlotIndex
    ) ERC20("WrappedPoWETH", "WPOWETH") {
        relayer = _relayer;
        depositContract = _depositContract;
        depositsMapSlotIndex = _depositsMapSlotIndex;
    }

    function updateDepositContractStorageRoot(uint256 blockNumber, bytes memory accountProof) public {
        bytes32 stateRoot = stateRoots[blockNumber];
        require(stateRoot != bytes32(0), "ERR_STATE_ROOT_NOT_AVAILABLE");

        bytes32 accountProofPath = keccak256(abi.encodePacked(depositContract));
        bytes memory accountRLP = accountProof.verify(stateRoot, accountProofPath); // reverts if proof is invalid
        bytes32 accountStorageRoot = bytes32(accountRLP.toRLPItem().toList()[ACCOUNT_STORAGE_ROOT_INDEX].toUint());

        depositContractStorageRoots[blockNumber] = accountStorageRoot;
    }

    // TODO make it secure currently anyone can claim a deposit
    // Solution: the value under deposit id should be keccak(value, recipient)
    // Solution: include a new parameter deposit data which is a tuple of (value, recipient)
    function mint(
        uint256 depositId,
        address recipient,
        uint256 amount,
        uint256 depositBlockNumber,
        bytes memory storageProof
    ) public {
        bytes32 accountStorageRoot = depositContractStorageRoots[depositBlockNumber];
        require(accountStorageRoot != bytes32(0), "ERR_STORAGE_ROOT_NOT_AVAILABLE");

        uint256 slot = uint256(keccak256(abi.encode(depositId, depositsMapSlotIndex)));

        require(!processedDeposits[depositId], "ERR_DEPOSIT_ALREADY_PROCESSED");

        bytes32 proofPath = keccak256(abi.encodePacked(slot));
        uint256 slotValue = storageProof.verify(accountStorageRoot, proofPath).toRLPItem().toUint(); // reverts if proof is invalid
        // TODO ensure slotValue == keccak(recipient, amount)

        processedDeposits[depositId] = true;
        _mint(recipient, slotValue);
    }

    function withdraw(uint256 amount, address recipient) public {
        _burn(msg.sender, amount);
        withdrawals[withdrawalsCount] = keccak256(abi.encode(amount, recipient));
        emit Withdrawal(withdrawalsCount++, amount, msg.sender, recipient);
    }

    function relayStateRoot(
        uint256 blockNumber,
        bytes32 stateRoot,
        bytes calldata signature
    ) public {
        require(relayer == ECDSA.recover(stateRoot, signature));
        stateRoots[blockNumber] = stateRoot;
    }
}
