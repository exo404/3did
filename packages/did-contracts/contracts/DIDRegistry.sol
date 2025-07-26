// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DIDRegistry
 * @dev A simple DID registry contract for managing decentralized identifiers
 * This contract allows users to register DIDs, update their documents, and manage delegates
 */
contract DIDRegistry {
    struct DIDDocument {
        address owner;
        string documentHash; // IPFS hash or JSON string
        uint256 created;
        uint256 updated;
        bool revoked;
    }

    struct Delegate {
        address delegate;
        bytes32 delegateType;
        uint256 validity;
    }

    // Mapping from DID (keccak256 hash) to document
    mapping(bytes32 => DIDDocument) public didDocuments;
    
    // Mapping from DID to delegates
    mapping(bytes32 => mapping(address => mapping(bytes32 => uint256))) public delegates;
    
    // Mapping from address to their primary DID
    mapping(address => bytes32) public primaryDID;

    // Events
    event DIDRegistered(bytes32 indexed did, address indexed owner, string documentHash);
    event DIDUpdated(bytes32 indexed did, string documentHash);
    event DIDRevoked(bytes32 indexed did);
    event DelegateAdded(bytes32 indexed did, address indexed delegate, bytes32 delegateType, uint256 validity);
    event DelegateRevoked(bytes32 indexed did, address indexed delegate, bytes32 delegateType);

    // Modifiers
    modifier onlyOwner(bytes32 did) {
        require(didDocuments[did].owner == msg.sender, "Only DID owner can perform this action");
        _;
    }

    modifier onlyOwnerOrDelegate(bytes32 did, bytes32 delegateType) {
        require(
            didDocuments[did].owner == msg.sender || 
            delegates[did][msg.sender][delegateType] > block.timestamp,
            "Not authorized to perform this action"
        );
        _;
    }

    modifier didExists(bytes32 did) {
        require(didDocuments[did].owner != address(0), "DID does not exist");
        _;
    }

    modifier didNotRevoked(bytes32 did) {
        require(!didDocuments[did].revoked, "DID has been revoked");
        _;
    }

    /**
     * @dev Register a new DID
     * @param did The DID identifier (keccak256 hash)
     * @param documentHash The IPFS hash or JSON string of the DID document
     */
    function registerDID(bytes32 did, string memory documentHash) external {
        require(didDocuments[did].owner == address(0), "DID already exists");
        require(bytes(documentHash).length > 0, "Document hash cannot be empty");

        didDocuments[did] = DIDDocument({
            owner: msg.sender,
            documentHash: documentHash,
            created: block.timestamp,
            updated: block.timestamp,
            revoked: false
        });

        // Set as primary DID if user doesn't have one
        if (primaryDID[msg.sender] == bytes32(0)) {
            primaryDID[msg.sender] = did;
        }

        emit DIDRegistered(did, msg.sender, documentHash);
    }

    /**
     * @dev Update a DID document
     * @param did The DID identifier
     * @param documentHash The new document hash
     */
    function updateDID(bytes32 did, string memory documentHash) 
        external 
        didExists(did) 
        didNotRevoked(did) 
        onlyOwner(did) 
    {
        require(bytes(documentHash).length > 0, "Document hash cannot be empty");
        
        didDocuments[did].documentHash = documentHash;
        didDocuments[did].updated = block.timestamp;

        emit DIDUpdated(did, documentHash);
    }

    /**
     * @dev Revoke a DID
     * @param did The DID identifier
     */
    function revokeDID(bytes32 did) 
        external 
        didExists(did) 
        didNotRevoked(did) 
        onlyOwner(did) 
    {
        didDocuments[did].revoked = true;
        didDocuments[did].updated = block.timestamp;

        emit DIDRevoked(did);
    }

    /**
     * @dev Add a delegate to a DID
     * @param did The DID identifier
     * @param delegate The delegate address
     * @param delegateType The type of delegation
     * @param validity The validity period in seconds
     */
    function addDelegate(bytes32 did, address delegate, bytes32 delegateType, uint256 validity) 
        external 
        didExists(did) 
        didNotRevoked(did) 
        onlyOwner(did) 
    {
        require(delegate != address(0), "Invalid delegate address");
        require(validity > 0, "Validity must be greater than 0");

        delegates[did][delegate][delegateType] = block.timestamp + validity;

        emit DelegateAdded(did, delegate, delegateType, block.timestamp + validity);
    }

    /**
     * @dev Revoke a delegate
     * @param did The DID identifier
     * @param delegate The delegate address
     * @param delegateType The type of delegation
     */
    function revokeDelegate(bytes32 did, address delegate, bytes32 delegateType) 
        external 
        didExists(did) 
        onlyOwner(did) 
    {
        delegates[did][delegate][delegateType] = 0;

        emit DelegateRevoked(did, delegate, delegateType);
    }

    /**
     * @dev Get DID document
     * @param did The DID identifier
     * @return The DID document
     */
    function getDIDDocument(bytes32 did) 
        external 
        view 
        didExists(did) 
        returns (DIDDocument memory) 
    {
        return didDocuments[did];
    }

    /**
     * @dev Check if a delegate is valid
     * @param did The DID identifier
     * @param delegate The delegate address
     * @param delegateType The type of delegation
     * @return True if delegate is valid
     */
    function isValidDelegate(bytes32 did, address delegate, bytes32 delegateType) 
        external 
        view 
        returns (bool) 
    {
        return delegates[did][delegate][delegateType] > block.timestamp;
    }

    /**
     * @dev Get the primary DID for an address
     * @param owner The owner address
     * @return The primary DID
     */
    function getPrimaryDID(address owner) external view returns (bytes32) {
        return primaryDID[owner];
    }

    /**
     * @dev Set primary DID for the caller
     * @param did The DID to set as primary
     */
    function setPrimaryDID(bytes32 did) external didExists(did) onlyOwner(did) {
        primaryDID[msg.sender] = did;
    }

    /**
     * @dev Check if DID exists and is not revoked
     * @param did The DID identifier
     * @return True if DID is active
     */
    function isDIDActive(bytes32 did) external view returns (bool) {
        return didDocuments[did].owner != address(0) && !didDocuments[did].revoked;
    }

    /**
     * @dev Generate DID from string
     * @param didString The DID string
     * @return The DID hash
     */
    function generateDID(string memory didString) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(didString));
    }
}