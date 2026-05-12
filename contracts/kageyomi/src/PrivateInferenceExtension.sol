// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

contract PrivateInferenceExtension {
    address public owner;

    struct AgentJobMetadata {
        bytes32 receiptRoot;
        string receiptsCID;
        bytes32 traceHash;
        bytes32 outputHash;
        bool isAgentJob;
        address submitter;
        uint256 timestamp;
    }

    mapping(bytes32 jobId => AgentJobMetadata) private _agentJobs;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event AgentJobSubmitted(
        bytes32 indexed jobId,
        bytes32 receiptRoot,
        string receiptsCID,
        bytes32 traceHash,
        bytes32 outputHash,
        address submitter,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Ownable: caller is not the owner");
        _;
    }

    constructor(address owner_) {
        require(owner_ != address(0), "Ownable: new owner is the zero address");
        owner = owner_;
        emit OwnershipTransferred(address(0), owner_);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function postAgentCommitment(
        bytes32 jobId,
        bytes32 receiptRoot,
        string calldata receiptsCID,
        bytes32 traceHash,
        bytes32 outputHash
    ) external onlyOwner {
        require(bytes(receiptsCID).length > 0, "Invalid CID");
        require(receiptRoot != bytes32(0), "Invalid receipt root");

        _agentJobs[jobId] = AgentJobMetadata({
            receiptRoot: receiptRoot,
            receiptsCID: receiptsCID,
            traceHash: traceHash,
            outputHash: outputHash,
            isAgentJob: true,
            submitter: msg.sender,
            timestamp: block.timestamp
        });

        emit AgentJobSubmitted(jobId, receiptRoot, receiptsCID, traceHash, outputHash, msg.sender, block.timestamp);
    }

    function getAgentJobMetadata(bytes32 jobId) external view returns (AgentJobMetadata memory) {
        return _agentJobs[jobId];
    }
}
