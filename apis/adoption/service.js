const { ethers } = require('hardhat');
const supabase = require('../../utils/supabase');
const ipfs = require('../../utils/ipfs');

class AdoptionService {
  constructor() {
    this.contractAddress = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";
  }

  async processAdoption(cowId) {
    try {
      // Validate input
      if (!this.isValidUUID(cowId)) {
        throw new Error('Invalid cow_id format');
      }

      // Get pending requests
      const pendingRequests = await supabase.getPendingRequests(cowId);
      if (pendingRequests.length === 0) {
        return { status: 404, message: 'No pending requests found' };
      }

      const request = pendingRequests[0];

      // Process metadata and IPFS
      const metadata = this.createMetadata(request, cowId);
      const ipfsResult = await ipfs.uploadMetadata(metadata);

      // Blockchain interaction
      const contract = await this.getContract();
      const priceInPaise = BigInt(Math.round(request.price * 100));
      const requiredEth = await contract.inrToEth(priceInPaise);

      const tx = await contract.approveAdoption(
        cowId,
        ipfsResult.ipfsUrl,
        priceInPaise,
        { value: requiredEth }
      );
      const receipt = await tx.wait();

      // Update database
      const tokenId = (await contract.getNextTokenId()) - 1;
      const updatedRecord = await supabase.updateAdoptionRecord(
        request.id,
        Number(receipt.blockNumber),
        Number(tokenId),
        ipfsResult.httpUrl
      );

      return {
        status: 200,
        data: {
          cowId,
          transactionHash: tx.hash,
          tokenId,
          ipfsUrl: ipfsResult.httpUrl,
          blockNumber: receipt.blockNumber
        }
      };
    } catch (error) {
      console.error('Adoption error:', error);
      return {
        status: 500,
        error: 'Processing failed',
        details: error.message
      };
    }
  }

  async getContract() {
    const CowAdoption = await ethers.getContractFactory("CowAdoption");
    return await CowAdoption.attach(this.contractAddress);
  }

  createMetadata(request, cowId) {
    return {
      name: `Cow Adoption #${request.id}`,
      description: `Adoption certificate for ${cowId}`,
      image: request.ipfsImages || "ipfs://default-image-hash",
      attributes: [
        { trait_type: "Cow ID", value: cowId },
        { trait_type: "Adopter", value: request.full_name || "Unknown" },
        { trait_type: "Price", value: `${request.price} INR` },
        { trait_type: "Date", value: new Date().toISOString() }
      ]
    };
  }

  isValidUUID(uuid) {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
  }
}

module.exports = new AdoptionService();