// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract CowAdoption is ERC721, Ownable {
    using SafeMath for uint256;
    
    uint256 private _nextTokenId;
    mapping(uint256 => string) private _tokenURIs;
    uint256 public ethToInrRate;
    
    event AdoptionApproved(
        uint256 indexed transactionId,
        uint256 indexed tokenId,
        string cowId,
        string ipfsUrl,
        uint256 priceInEth
    );

    constructor(uint256 initialRate) ERC721("CowAdoption", "COW") Ownable() {
        ethToInrRate = initialRate;
    }

    function updateConversionRate(uint256 newRate) external onlyOwner {
        ethToInrRate = newRate;
    }

    function inrToEth(uint256 inrAmount) public view returns (uint256) {
        return inrAmount.mul(1 ether).div(ethToInrRate);
    }

    function approveAdoption(
        string memory cowId,
        string memory ipfsUrl,
        uint256 priceInInr
    ) external payable returns (uint256, uint256) {
        uint256 requiredEth = inrToEth(priceInInr);
        require(msg.value >= requiredEth, "Insufficient ETH sent");
        
        uint256 transactionId = block.number;
        uint256 tokenId = _nextTokenId++;
        
        _safeMint(msg.sender, tokenId);
        _tokenURIs[tokenId] = ipfsUrl;
        
        if (msg.value > requiredEth) {
            payable(msg.sender).transfer(msg.value.sub(requiredEth));
        }
        
        emit AdoptionApproved(transactionId, tokenId, cowId, ipfsUrl, requiredEth);
        return (transactionId, tokenId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Nonexistent token");
        return _tokenURIs[tokenId]; // Returns ipfs://Qm... format
    }

    function getNextTokenId() public view returns (uint256) {
        return _nextTokenId;
    }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}