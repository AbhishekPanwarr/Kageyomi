// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

contract DisputeRegistry {
    enum DisputeStatus {
        None,
        Open,
        Resolved
    }

    struct Dispute {
        bytes32 jobId;
        address filer;
        uint8 reasonCode;
        DisputeStatus status;
        uint256 filedAt;
        uint256 resolvedAt;
    }

    address public owner;
    mapping(bytes32 jobId => Dispute) private _disputes;

    event DisputeFiled(bytes32 indexed jobId, address indexed filer, uint8 reasonCode, uint256 filedAt);
    event DisputeResolved(bytes32 indexed jobId, address indexed resolver, uint256 resolvedAt);

    modifier onlyOwner() {
        require(msg.sender == owner, "Ownable: caller is not the owner");
        _;
    }

    constructor(address owner_) {
        require(owner_ != address(0), "Ownable: new owner is the zero address");
        owner = owner_;
    }

    function fileDispute(bytes32 jobId, uint8 reasonCode) external {
        Dispute storage dispute = _disputes[jobId];
        require(dispute.status == DisputeStatus.None, "Dispute already exists");

        _disputes[jobId] = Dispute({
            jobId: jobId,
            filer: msg.sender,
            reasonCode: reasonCode,
            status: DisputeStatus.Open,
            filedAt: block.timestamp,
            resolvedAt: 0
        });

        emit DisputeFiled(jobId, msg.sender, reasonCode, block.timestamp);
    }

    function resolveDispute(bytes32 jobId) external onlyOwner {
        Dispute storage dispute = _disputes[jobId];
        require(dispute.status == DisputeStatus.Open, "Dispute is not open");
        dispute.status = DisputeStatus.Resolved;
        dispute.resolvedAt = block.timestamp;
        emit DisputeResolved(jobId, msg.sender, block.timestamp);
    }

    function getDispute(bytes32 jobId) external view returns (Dispute memory) {
        return _disputes[jobId];
    }
}
