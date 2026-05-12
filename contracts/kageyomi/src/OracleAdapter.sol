// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

contract OracleAdapter {
    address public owner;

    struct OracleResult {
        bytes32 jobId;
        bytes32 outcomeHash;
        bool resolved;
        uint256 updatedAt;
    }

    mapping(bytes32 jobId => OracleResult) private _results;

    event OracleResultPosted(bytes32 indexed jobId, bytes32 outcomeHash, uint256 updatedAt);

    modifier onlyOwner() {
        require(msg.sender == owner, "Ownable: caller is not the owner");
        _;
    }

    constructor(address owner_) {
        require(owner_ != address(0), "Ownable: new owner is the zero address");
        owner = owner_;
    }

    function postResult(bytes32 jobId, bytes32 outcomeHash) external onlyOwner {
        _results[jobId] = OracleResult({
            jobId: jobId,
            outcomeHash: outcomeHash,
            resolved: true,
            updatedAt: block.timestamp
        });

        emit OracleResultPosted(jobId, outcomeHash, block.timestamp);
    }

    function getResult(bytes32 jobId) external view returns (OracleResult memory) {
        return _results[jobId];
    }
}
