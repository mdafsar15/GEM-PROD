const express = require('express');
const { ethers } = require("hardhat");
const supabase = require("./utils/supabase");
const ipfs = require("./utils/ipfs");
require('dotenv').config();

const app = express();
const port = 3000;

app.get('/generateFullfillment', async (req, res) => {
    try {
        const cowId = req.query.COW_ID;
        
        if (!cowId) {
            return res.status(400).json({ error: "Please provide COW_ID as a query parameter" });
        }

        console.log(`Processing adoption for cow: ${cowId}`);

        // Fetch pending requests from Supabase
        const pendingRequests = await supabase.getPendingRequests(cowId);

        if (pendingRequests.length === 0) {
            return res.status(404).json({ error: "No pending requests found for this cow" });
        }

        const request = pendingRequests[0];

        // Prepare metadata
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

        // Upload to IPFS
        const ipfsResult = await ipfs.uploadMetadata(metadata);

        // Connect to smart contract
        const CowAdoption = await ethers.getContractFactory("CowAdoption");
        const cowAdoption = await CowAdoption.attach("0x8A791620dd6260079BF849Dc5567aDC3F2FdC318");

        const priceInPaise = BigInt(Math.round((request.price || 0) * 100));
        const requiredEth = await cowAdoption.inrToEth(priceInPaise);

        // Send transaction
        const tx = await cowAdoption.approveAdoption(
            cowId,
            ipfsResult.ipfsUrl,
            priceInPaise,
            { value: requiredEth }
        );

        const receipt = await tx.wait();
        const nextTokenId = await cowAdoption.getNextTokenId();
        const tokenId = Number(nextTokenId) - 1;

        // Update Supabase record
        const updatedRecord = await supabase.updateAdoptionRecord(
            request.id,
            tx.hash,
            tokenId,
            ipfsResult.httpUrl
        );

        // Insert into gomini_ewallet
        const walletRecord = await supabase.insertGominiWallet(updatedRecord);

        // Send success response
        res.json({
            success: true,
            data: {
                transactionHash: tx.hash,
                tokenId: tokenId,
                blockNumber: receipt.blockNumber,
                ipfsUrl: ipfsResult.httpUrl,
                adoptionRecord: updatedRecord,
                walletRecord: walletRecord
            }
        });

    } catch (error) {
        console.error("Process failed:", error);
        res.status(500).json({
            success: false,
            error: error.message,
            reason: error.reason,
            code: error.code
        });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://165.22.213.239:${port}`);
});