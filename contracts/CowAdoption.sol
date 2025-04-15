// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CowAdoption is ERC721, Ownable {
    uint256 private _nextTokenId;
    mapping(uint256 => string) private _tokenURIs;

    // Event to log adoption approval
    event AdoptionApproved(
        uint256 indexed transactionId,
        uint256 indexed tokenId,
        string cowId,
        string ipfsHash
    );

    constructor() ERC721("CowAdoption", "COW") Ownable() {}

    /**
     * @dev Approves an adoption and mints an NFT
     * @param cowId The UUID of the cow from Supabase
     * @param ipfsHash The IPFS hash of the metadata
     * @return transactionId and tokenId
     */
    function approveAdoption(
        string memory cowId,
        string memory ipfsHash
    ) external onlyOwner returns (uint256, uint256) {
        uint256 transactionId = block.number;
        uint256 tokenId = _nextTokenId++;
        
        _safeMint(msg.sender, tokenId);
        _tokenURIs[tokenId] = ipfsHash;
        
        emit AdoptionApproved(transactionId, tokenId, cowId, ipfsHash);
        
        return (transactionId, tokenId);
    }

    /**
     * @dev Returns the token URI for a given tokenId
     * @param tokenId The NFT token ID
     */
    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        return _tokenURIs[tokenId];
    }

    /**
     * @dev Returns the next token ID that will be minted
     */
    function getNextTokenId() public view returns (uint256) {
        return _nextTokenId;
    }
}