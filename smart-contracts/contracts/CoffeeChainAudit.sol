// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CoffeeChainAudit {
    event TransactionAnchored(string transactionId, string hashValue, uint256 timestamp);

    function anchorTransaction(string calldata transactionId, string calldata hashValue) external {
        emit TransactionAnchored(transactionId, hashValue, block.timestamp);
    }
}
