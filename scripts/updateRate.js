const { ethers } = require("hardhat");

async function main() {
    const newRateInr = 250000; // 1 ETH = 250,000 INR
    const newRate = newRateInr * 100; // Store as 25000000
    
    const CowAdoption = await ethers.getContractFactory("CowAdoption");
    const cowAdoption = await CowAdoption.attach("YOUR_CONTRACT_ADDRESS");
    
    const tx = await cowAdoption.updateConversionRate(newRate);
    await tx.wait();
    
    console.log(`Rate updated to 1 ETH = ${newRateInr} INR`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });