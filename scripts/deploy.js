const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying contracts with the account:", deployer.address);
    
    // Correct way to get balance in ethers v6
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "MATIC");

    const CowAdoption = await ethers.getContractFactory("CowAdoption");
    const cowAdoption = await CowAdoption.deploy();
    
    await cowAdoption.waitForDeployment();

    console.log("CowAdoption deployed to:", await cowAdoption.getAddress());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });