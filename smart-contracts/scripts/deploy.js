async function main() {
  const CoffeeChainAudit = await ethers.getContractFactory("CoffeeChainAudit");
  const contract = await CoffeeChainAudit.deploy();
  await contract.waitForDeployment();

  console.log("CoffeeChainAudit deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
