const { ethers } = require("hardhat");
const supabase = require("../utils/supabase");
const ipfs = require("../utils/ipfs");

async function main() {
    try {
        console.log("Starting adoption process...");

        if (!process.env.COW_ID) {
            throw new Error("Please provide COW_ID as an environment variable");
        }

        const cowId = process.env.COW_ID;

        // const input = process.argv[2];
        // const cowId = input;
        console.log(`Processing adoption for cow: ${cowId}`);

        console.log("Fetching pending requests from Supabase...");
        const pendingRequests = await supabase.getPendingRequests(cowId);

        if (pendingRequests.length === 0) {
            console.log("No pending requests found for this cow");
            return;
        }

        const request = pendingRequests[0];
        console.log(`Found request ID: ${request.id}`);

        console.log("Preparing metadata...");
        const metadata = {
            name: `Cow Adoption #${request.id}`,
            description: `Adoption certificate for cow ${cowId}`,
            image: request.ipfsimages || "ipfs://default-image-hash",
            attributes: [
                { trait_type: "Cow ID", value: cowId },
                { trait_type: "Adopter", value: request.full_name || "Unknown" },
                { trait_type: "Price", value: `${request.price || 0} INR` },
                { trait_type: "Date", value: new Date().toISOString() }
            ]
        };

        console.log("Uploading metadata to IPFS...");
        const ipfsResult = await ipfs.uploadMetadata(metadata);
        console.log(`IPFS Hash: ${ipfsResult.hash}`);
        console.log(`Access URL: ${ipfsResult.httpUrl}`);

        console.log("Connecting to smart contract...");
        const CowAdoption = await ethers.getContractFactory("CowAdoption");
        const cowAdoption = await CowAdoption.attach("0x8A791620dd6260079BF849Dc5567aDC3F2FdC318"); // <-- Replace with your contract address

        const priceInPaise = BigInt(Math.round((request.price || 0) * 100));
        const requiredEth = await cowAdoption.inrToEth(priceInPaise);
        console.log(`Required ETH: ${ethers.formatEther(requiredEth)}`);

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

        const nextTokenId = await cowAdoption.getNextTokenId();
        const tokenId = Number(nextTokenId) - 1;
        console.log(`Minted Token ID: ${tokenId}`);

        console.log("Updating Supabase record...");
        const updatedRecord = await supabase.updateAdoptionRecord(
            request.id,
            tx.hash, 
            tokenId,
            ipfsResult.httpUrl
        );

        console.log("Inserting into gomini_ewallet...");
        const walletRecord = await supabase.insertGominiWallet(updatedRecord);

        console.log("Process completed successfully!");
        console.log("Updated adoption record:", updatedRecord);
        console.log("Inserted wallet record:", walletRecord);

    } catch (error) {
        console.error("❌ Process failed:", error);
        if (error.reason) console.error("Reason:", error.reason);
        if (error.code) console.error("Error code:", error.code);
        process.exit(1);
    }
}

main();