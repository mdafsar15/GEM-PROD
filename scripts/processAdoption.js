const { ethers } = require("hardhat");
const supabase = require("../utils/supabase");
const ipfs = require("../utils/ipfs");

async function main() {
    try {
        if (!process.env.ID) {
            throw new Error("Please provide ID as an environment variable");
        }

        const adoptionDetailId = process.env.ID;
        const pendingRequest = await supabase.getPendingRequest(adoptionDetailId);

        if (!pendingRequest) {
            console.log(JSON.stringify({
                message: "No pending request found for this adoption detail ID"
            }, null, 2));
            return;
        }

        const metadata = {
            name: `Cow Adoption #${pendingRequest.id}`,
            description: `Adoption certificate for adoption detail ID ${adoptionDetailId}`,
            image: pendingRequest.ipfs_images || "ipfs://default-image-hash",
            attributes: [
                { trait_type: "Adoption Detail ID", value: adoptionDetailId },
                { trait_type: "Order ID", value: pendingRequest.order_id },
                { trait_type: "Inventory ID", value: pendingRequest.inventory_id || "Unknown" },
                { trait_type: "Date", value: new Date().toISOString() }
            ]
        };

        const ipfsResult = await ipfs.uploadMetadata(metadata);
        
        const CowAdoption = await ethers.getContractFactory("CowAdoption");
        const cowAdoption = await CowAdoption.attach("0xa513E6E4b8f2a923D98304ec87F64353C4D5C853");

        // Using a default price since we don't have price in adoptions_details table
        const defaultPriceInPaise = BigInt(100000); // 1000 INR as default
        const requiredEth = await cowAdoption.inrToEth(defaultPriceInPaise);

        const tx = await cowAdoption.approveAdoption(
            adoptionDetailId, // Using adoption detail ID instead of cow ID
            ipfsResult.ipfsUrl,
            defaultPriceInPaise,
            { value: requiredEth }
        );

        const receipt = await tx.wait();
        const nextTokenId = await cowAdoption.getNextTokenId();
        const tokenId = Number(nextTokenId) - 1;

        const updatedRecord = await supabase.updateAdoptionDetailRecord(
            adoptionDetailId,
            tx.hash, 
            tokenId,
            ipfsResult.httpUrl
        );

        // Format the final output
        const response = {
            message: "Adoption fulfillment created successfully",
            adoption_detail: {
                id: updatedRecord.id,
                order_id: updatedRecord.order_id,
                inventory_id: updatedRecord.inventory_id,
                ipfs_hash_metadata: updatedRecord.ipfs_hash_metadata,
                ipfs_images: updatedRecord.ipfs_images,
                order_status: updatedRecord.order_status,
                created_at: updatedRecord.created_at,
                updated_at: updatedRecord.updated_at,
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