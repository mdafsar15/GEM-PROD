const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying with account:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "MATIC");
  
  const initialRate = 200000 * 100;
  const CowAdoption = await ethers.getContractFactory("CowAdoption");
  const cowAdoption = await CowAdoption.deploy(initialRate);
  
  await cowAdoption.waitForDeployment();

  console.log("Contract deployed to:", await cowAdoption.getAddress());
  console.log("Initial rate set to:", initialRate / 100, "INR per ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });