const { ethers } = require("hardhat");
const supabase = require("../utils/supabase");
const ipfs = require("../utils/ipfs");

async function main() {
    // Get cow_id
    const cowId = "d9e5b8f0-6342-4e53-98d7-6a3273e4abf8";
    if (!cowId) {
        console.error("Please provide a cow_id");
        process.exit(1);
    }

    // 1. Get pending requests
    const pendingRequests = await supabase.getPendingRequests(cowId);
    if (pendingRequests.length === 0) {
        console.log("No pending requests found for cow_id:", cowId);
        return;
    }

    const request = pendingRequests[0];
    console.log("Processing request:", request.id);

    // 2. Prepare and upload metadata
    const metadata = {
        name: `Cow Adoption #${request.id}`,
        description: `Adoption certificate for cow ${request.cow_id}`,
        image: request.ipfsImages,
        attributes: [
            { trait_type: "Cow ID", value: request.cow_id },
            { trait_type: "Adopter", value: request.full_name },
            { trait_type: "Date", value: new Date(request.created_at).toLocaleDateString() }
        ]
    };
    const ipfsHash = await ipfs.uploadMetadata(metadata);
    console.log("Metadata uploaded to IPFS:", ipfsHash);

    // 3. Connect to contract
    const CowAdoption = await ethers.getContractFactory("CowAdoption");
    const cowAdoption = await CowAdoption.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3");

    // 4. Approve adoption and handle transaction
    try {
        const tx = await cowAdoption.approveAdoption(request.cow_id, ipfsHash);
        console.log("Transaction hash:", tx.hash);
        
        const receipt = await tx.wait();
        console.log("Transaction confirmed in block:", receipt.blockNumber);

        // Get the tokenId (convert BigInt to Number before subtraction)
        const nextTokenId = await cowAdoption.getNextTokenId();
        const tokenId = Number(nextTokenId) - 1; // Convert to Number before subtraction
        const transactionId = Number(receipt.blockNumber); // Also convert blockNumber to Number
        
        console.log(`Adoption approved. Transaction ID: ${transactionId}, Token ID: ${tokenId}`);

        // 5. Update Supabase (ensure these are Numbers, not BigInt)
        const updatedRecord = await supabase.updateAdoptionRecord(
            request.id,
            transactionId,
            tokenId
        );
        console.log("Supabase record updated:", updatedRecord);
    } catch (error) {
        console.error("Transaction failed:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });