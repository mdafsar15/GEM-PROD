const { ethers } = require("hardhat");
const supabase = require("../utils/supabase");
const ipfs = require("../utils/ipfs");

async function main() {
    try {
        if (!process.env.COW_ID) {
            throw new Error("Please provide COW_ID as an environment variable");
        }

        const cowId = process.env.COW_ID;
        const pendingRequests = await supabase.getPendingRequests(cowId);

        if (pendingRequests.length === 0) {
            console.log(JSON.stringify({
                message: "No pending requests found for this cow"
            }, null, 2));
            return;
        }

        const request = pendingRequests[0];
        
        const metadata = {
            name: `Cow Adoption #${request.id}`,
            description: `Adoption certificate for cow ${cowId}`,
            image: request.ipfsimages || "ipfs://default-image-hash",
            attributes: [
                { trait_type: "Cow ID", value: cowId },
                { trait_type: "Adopter", value: request.user_id || "Unknown" },
                { trait_type: "Price", value: `${request.price || 0} INR` },
                { trait_type: "Date", value: new Date().toISOString() }
            ]
        };

        const ipfsResult = await ipfs.uploadMetadata(metadata);
        
        const CowAdoption = await ethers.getContractFactory("CowAdoption");
        const cowAdoption = await CowAdoption.attach("0x8A791620dd6260079BF849Dc5567aDC3F2FdC318");

        const priceInPaise = BigInt(Math.round((request.price || 0) * 100));
        const requiredEth = await cowAdoption.inrToEth(priceInPaise);

        const tx = await cowAdoption.approveAdoption(
            cowId,
            ipfsResult.ipfsUrl,
            priceInPaise,
            { value: requiredEth }
        );

        const receipt = await tx.wait();
        const nextTokenId = await cowAdoption.getNextTokenId();
        const tokenId = Number(nextTokenId) - 1;

        const updatedRecord = await supabase.updateAdoptionRecord(
            request.id,
            tx.hash, 
            tokenId,
            ipfsResult.httpUrl
        );

        await supabase.insertGominiWallet(updatedRecord);

        // Format the final output
        const response = {
            message: "Adoption fulfillment created successfully",
            adoption: {
                id: updatedRecord.id,
                user_id: updatedRecord.user_id,
                cow_id: updatedRecord.cow_id,
                ipfshashmetadata: updatedRecord.ipfshashmetadata,
                ipfsimages: updatedRecord.ipfsimages,
                price: updatedRecord.price,
                status: updatedRecord.status,
                created_at: updatedRecord.created_at,
                blk_transaction_id: updatedRecord.blk_transaction_id,
                blk_nft_token: updatedRecord.blk_nft_token
            }
        };

        // Print the formatted response
        console.log(JSON.stringify(response, null, 2));

    } catch (error) {
        console.log(JSON.stringify({
            message: "Process failed",
            error: error.message,
            reason: error.reason,
            code: error.code
        }, null, 2));
        process.exit(1);
    }
}

main();