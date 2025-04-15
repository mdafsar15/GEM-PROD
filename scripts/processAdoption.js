const { ethers } = require("hardhat");
const supabase = require("../utils/supabase");
const ipfs = require("../utils/ipfs");

async function main() {
    try {
        console.log("Starting adoption process...");
        
        // 1. Get cow_id (from command line or default)
        const cowId = process.argv[2] || "d9e5b8f0-6342-4e53-98d7-6a3273e4abf8";
        console.log(`Processing adoption for cow: ${cowId}`);

        // 2. Get pending requests
        console.log("Fetching pending requests from Supabase...");
        const pendingRequests = await supabase.getPendingRequests(cowId);
        
        if (pendingRequests.length === 0) {
            console.log("No pending requests found for this cow");
            return;
        }

        const request = pendingRequests[0];
        console.log(`Found request ID: ${request.id}`);

        // 3. Prepare metadata
        console.log("Preparing metadata...");
        const metadata = {
            name: `Cow Adoption #${request.id}`,
            description: `Adoption certificate for cow ${cowId}`,
            image: request.ipfsImages || "ipfs://default-image-hash",
            attributes: [
                { trait_type: "Cow ID", value: cowId },
                { trait_type: "Adopter", value: request.full_name || "Unknown" },
                { trait_type: "Price", value: `${request.price || 0} INR` },
                { trait_type: "Date", value: new Date().toISOString() }
            ]
        };

        // 4. Upload to IPFS
        console.log("Uploading metadata to IPFS...");
        const ipfsResult = await ipfs.uploadMetadata(metadata);
        console.log(`IPFS Hash: ${ipfsResult.hash}`);
        console.log(`Access URL: ${ipfsResult.httpUrl}`);

        // 5. Connect to contract
        console.log("Connecting to smart contract...");
        const CowAdoption = await ethers.getContractFactory("CowAdoption");
        const cowAdoption = await CowAdoption.attach("0x8A791620dd6260079BF849Dc5567aDC3F2FdC318");

        // 6. Calculate required ETH (convert price to paise and handle BigInt properly)
        const priceInPaise = BigInt(Math.round((request.price || 0) * 100));
        const requiredEth = await cowAdoption.inrToEth(priceInPaise);
        console.log(`Required ETH: ${ethers.formatEther(requiredEth)}`);

        // 7. Execute adoption
        console.log("Sending transaction...");
        const tx = await cowAdoption.approveAdoption(
            cowId,
            ipfsResult.ipfsUrl,
            priceInPaise,
            { value: requiredEth }
        );
        
        console.log(`Transaction hash: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);

        // 8. Get token ID (handle BigInt conversion)
        const nextTokenId = await cowAdoption.getNextTokenId();
        const tokenId = Number(nextTokenId) - 1;
        console.log(`Minted Token ID: ${tokenId}`);

        // 9. Update Supabase (convert BigInt to Number)
        console.log("Updating Supabase record...");
        const updatedRecord = await supabase.updateAdoptionRecord(
            request.id,
            Number(receipt.blockNumber),
            tokenId,
            ipfsResult.httpUrl
        );
        
        console.log("Process completed successfully!");
        console.log("Updated record:", updatedRecord);

    } catch (error) {
        console.error("❌ Process failed:", error);
        if (error.reason) console.error("Reason:", error.reason);
        if (error.code) console.error("Error code:", error.code);
        process.exit(1);
    }
}

main();