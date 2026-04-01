// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AgentDID — AgentRegistry
 * @author AgentDID Contributors (https://github.com/agentdid)
 * @notice Core registry for the AgentDID open protocol.
 *
 * AgentDID is a non-commercial, open-source protocol for decentralized
 * AI agent and robot identity — governed by the global community, not
 * any single corporation or nation-state.
 *
 * DID method: did:agent:<address>
 * Spec:       https://github.com/agentdid/spec
 *
 * Each AI agent is assigned an Ethereum address as its cryptographic
 * identity (its "passport"). The owner registers agents with a full
 * capability declaration; agents call logAction() to record every step,
 * creating a tamper-proof, community-auditable history.
 *
 * Anyone may call flagAnomaly() to report behavior that deviates from
 * the agent's declared capabilities — enabling decentralized oversight.
 *
 * @dev Non-upgradeable by design — immutability is a feature, not a bug.
 */
contract AgentRegistry {
    // ============ Enums ============

    enum RiskLevel { LOW, MEDIUM, HIGH, CRITICAL }

    enum AgentCategory {
        GENERAL,
        RESEARCH,
        FINANCE,
        MEDICAL,
        LEGAL,
        INFRASTRUCTURE,
        SOCIAL
    }

    // ============ Data Structures ============

    struct AgentIdentity {
        string name;              // Human-readable agent name
        string version;           // Semantic version string
        address owner;            // Wallet that registered this agent
        uint256 registeredAt;     // Unix timestamp of registration
        bool active;              // Can be deactivated by owner or agent
        string metadataURI;       // Pointer to off-chain capability declaration (IPFS)
        uint256 actionCount;      // Total number of logged actions
        bytes32 capabilityHash;   // keccak256 of the off-chain capability declaration JSON
        RiskLevel riskLevel;      // Declared risk level
        AgentCategory category;   // Agent function category
        uint256 anomalyCount;     // Total anomaly reports received
    }

    // ============ State ============

    mapping(address => AgentIdentity) public agents;
    mapping(address => bool) public isRegistered;

    // ============ Events ============

    event AgentRegistered(
        address indexed agentAddress,
        string name,
        string version,
        address indexed owner,
        uint256 timestamp,
        string metadataURI,
        bytes32 capabilityHash,
        RiskLevel riskLevel,
        AgentCategory category
    );

    /**
     * @dev Emitted every time an agent logs an action.
     *
     * inputHash  = keccak256(abi.encodePacked(rawInput))
     * outputHash = keccak256(abi.encodePacked(rawOutput))
     *
     * Anyone holding the original input/output can verify the hashes match.
     */
    event ActionLogged(
        address indexed agentAddress,
        uint256 indexed actionIndex,
        string actionType,
        bytes32 inputHash,
        bytes32 outputHash,
        bool success,
        uint256 timestamp
    );

    event AgentDeactivated(address indexed agentAddress, uint256 timestamp);

    /**
     * @dev Emitted when any address reports an anomaly for an agent.
     *      severity is 1 (minor) to 10 (critical).
     *      Enables decentralized, community-driven risk monitoring.
     */
    event AnomalyFlagged(
        address indexed agentAddress,
        address indexed reporter,
        string reason,
        uint8 severity,
        uint256 timestamp
    );

    // ============ Modifiers ============

    modifier onlyRegistered() {
        require(isRegistered[msg.sender], "AgentRegistry: not registered");
        _;
    }

    modifier onlyActive() {
        require(agents[msg.sender].active, "AgentRegistry: agent not active");
        _;
    }

    // ============ Registration ============

    /**
     * @dev Register a new AI agent. The caller becomes the owner.
     *      The agentAddress can be a separate hot wallet used by the agent process.
     *
     * @param agentAddress    Ethereum address the agent will use to sign transactions
     * @param name            Human-readable name (e.g. "ResearchBot-v1")
     * @param version         Semantic version string (e.g. "1.0.0")
     * @param metadataURI     URI for the off-chain capability declaration (IPFS recommended)
     * @param capabilityHash  keccak256 of the capability declaration JSON — proves document integrity
     * @param riskLevel       Declared risk classification
     * @param category        Functional category of this agent
     */
    function registerAgent(
        address agentAddress,
        string calldata name,
        string calldata version,
        string calldata metadataURI,
        bytes32 capabilityHash,
        RiskLevel riskLevel,
        AgentCategory category
    ) external {
        require(agentAddress != address(0), "AgentRegistry: zero address");
        require(!isRegistered[agentAddress], "AgentRegistry: already registered");
        require(bytes(name).length > 0, "AgentRegistry: empty name");

        agents[agentAddress] = AgentIdentity({
            name: name,
            version: version,
            owner: msg.sender,
            registeredAt: block.timestamp,
            active: true,
            metadataURI: metadataURI,
            actionCount: 0,
            capabilityHash: capabilityHash,
            riskLevel: riskLevel,
            category: category,
            anomalyCount: 0
        });

        isRegistered[agentAddress] = true;

        emit AgentRegistered(
            agentAddress,
            name,
            version,
            msg.sender,
            block.timestamp,
            metadataURI,
            capabilityHash,
            riskLevel,
            category
        );
    }

    // ============ Action Logging ============

    /**
     * @dev Called BY the agent to log an action on-chain.
     *      Must be called from the agent's registered address.
     *
     * @param actionType  Category string (e.g. "llm_query", "tool_use", "web_search")
     * @param inputHash   keccak256 hash of the action's input data
     * @param outputHash  keccak256 hash of the action's output data
     * @param success     Whether the action completed successfully
     */
    function logAction(
        string calldata actionType,
        bytes32 inputHash,
        bytes32 outputHash,
        bool success
    ) external onlyRegistered onlyActive {
        AgentIdentity storage agent = agents[msg.sender];
        uint256 actionIndex = agent.actionCount;
        agent.actionCount++;

        emit ActionLogged(
            msg.sender,
            actionIndex,
            actionType,
            inputHash,
            outputHash,
            success,
            block.timestamp
        );
    }

    // ============ Anomaly Reporting ============

    /**
     * @dev Anyone may flag an anomaly for a registered agent.
     *      This enables decentralized community oversight — no central authority required.
     *      Off-chain systems (dashboards, risk scanners) can aggregate these reports.
     *
     * @param agentAddress  The agent being reported
     * @param reason        Human-readable description of the anomaly
     * @param severity      Severity score 1 (minor) to 10 (critical)
     */
    function flagAnomaly(
        address agentAddress,
        string calldata reason,
        uint8 severity
    ) external {
        require(isRegistered[agentAddress], "AgentRegistry: not registered");
        require(severity >= 1 && severity <= 10, "AgentRegistry: severity must be 1-10");
        require(bytes(reason).length > 0, "AgentRegistry: empty reason");

        agents[agentAddress].anomalyCount++;

        emit AnomalyFlagged(
            agentAddress,
            msg.sender,
            reason,
            severity,
            block.timestamp
        );
    }

    // ============ View Functions ============

    function getAgent(address agentAddress)
        external
        view
        returns (AgentIdentity memory)
    {
        return agents[agentAddress];
    }

    // ============ Management ============

    /**
     * @dev Deactivate an agent. Only the owner or agent itself may do this.
     *      Irreversible — immutability is a core protocol guarantee.
     */
    function deactivateAgent(address agentAddress) external {
        require(isRegistered[agentAddress], "AgentRegistry: not registered");
        AgentIdentity storage agent = agents[agentAddress];
        require(
            msg.sender == agentAddress || msg.sender == agent.owner,
            "AgentRegistry: unauthorized"
        );
        agent.active = false;
        emit AgentDeactivated(agentAddress, block.timestamp);
    }
}
