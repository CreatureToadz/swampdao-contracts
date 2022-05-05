import hre from 'hardhat'

async function main() {
  const deployments = await hre.deployments.all()
  const verifyContract = async (
    contract: string,
    fullContractPath?: string,
  ) => {
    try {
      const deployment = deployments[contract]
      if (!deployment)
        throw new Error(`Contract deployment not found ${contract}`)

      console.log('---------------------------')
      console.log(`Verifying ${contract}...`)
      await hre.run('verify:verify', {
        contract: fullContractPath,
        address: deployment.address,
        constructorArguments: deployment.args,
      })
    } catch (e) {
      console.log(`Error while verifying ${contract}`)
      console.error(e)
    }
  }

  // await verifyContract('FlyzLOOKSCapacitor')
  await verifyContract('FlyzLOOKSCapacitorV3')
}

main()
  .then(() => console.log('done'))
  .catch((e) => console.error(e))
