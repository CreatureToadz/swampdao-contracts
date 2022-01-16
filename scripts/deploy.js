// @dev. This script will deploy this V1.1 of Flyz. It will deploy the whole ecosystem.

const { ethers } = require('hardhat')
const UniswapV2ABI = require('./IUniswapV2Factory.json').abi

const DAI = '0xa3Fa99A148fA48D14Ed51d610c367C61876997F1'
const WETH = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'
const UNISWAP_FACTORY = '0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f'

async function main() {
  const [deployer] = await ethers.getSigners()
  const daoAddr = '0x929A27c46041196e1a49C7B459d63eC9A20cd879'
  console.log('Deploying contracts with the account: ' + deployer.address)

  // Initial staking index
  const initialIndex = '1000000000'

  const firstEpochTime = 1642377600 // 2022-1-17 00:00 UTC
  console.log('First epoch timestamp: ' + firstEpochTime)

  // What epoch will be first epoch
  const firstEpochNumber = '1'

  // How many seconds are in each epoch
  const epochLengthInSeconds = 86400 / 3
  // const epochLengthInSeconds = 60*10

  // Initial reward rate for epoch
  const initialRewardRate = '5000'

  // Ethereum 0 address, used when toggling changes in treasury
  const zeroAddress = '0x0000000000000000000000000000000000000000'

  const warmupPeriod = '0'

  // const chainId = (await provider.getNetwork()).chainId

  const FLYZ = await ethers.getContractFactory('FlyzERC20')
  const flyz = await FLYZ.deploy()
  await flyz.deployTransaction.wait()
  console.log('FLYZ deployed: ' + flyz.address)

  const uniswapFactory = new ethers.Contract(
    UNISWAP_FACTORY,
    UniswapV2ABI,
    deployer
  )
  await (await uniswapFactory.createPair(flyz.address, WETH)).wait()
  const lpAddress = await uniswapFactory.getPair(flyz.address, WETH)
  console.log('FLYZ-WETH LP: ' + lpAddress)

  const BondingCalculator = await ethers.getContractFactory(
    'FlyzBondingCalculator'
  )
  const bondingCalculator = await BondingCalculator.deploy(flyz.address)
  await bondingCalculator.deployTransaction.wait()
  console.log('Bonding calculator: ' + bondingCalculator.address)

  const Treasury = await ethers.getContractFactory('FlyzTreasury')
  const treasury = await Treasury.deploy(
    flyz.address,
    DAI,
    lpAddress,
    bondingCalculator.address,
    '43200'
  )
  await treasury.deployTransaction.wait()
  console.log('treasury deployed: ' + treasury.address)

  const StakingDistributor = await ethers.getContractFactory(
    'FlyzStakingDistributor'
  )
  const stakingDistributor = await StakingDistributor.deploy(
    treasury.address,
    flyz.address,
    epochLengthInSeconds,
    firstEpochTime
  )
  await stakingDistributor.deployTransaction.wait()

  const sFlyzERC20 = await ethers.getContractFactory('sFlyzERC20')
  const sFlyz = await sFlyzERC20.deploy()
  await sFlyz.deployTransaction.wait()

  const Staking = await ethers.getContractFactory('FlyzStaking')
  const staking = await Staking.deploy(
    flyz.address,
    sFlyz.address,
    epochLengthInSeconds,
    firstEpochNumber,
    firstEpochTime
  )
  await staking.deployTransaction.wait()

  const StakingWarmup = await ethers.getContractFactory('FlyzStakingWarmup')
  const stakingWarmup = await StakingWarmup.deploy(
    staking.address,
    sFlyz.address
  )
  await stakingWarmup.deployTransaction.wait()

  const StakingHelper = await ethers.getContractFactory('FlyzStakingHelper')
  const stakingHelper = await StakingHelper.deploy(
    staking.address,
    flyz.address
  )
  await stakingHelper.deployTransaction.wait()

  console.log(
    JSON.stringify({
      SFLYZ_ADDRESS: sFlyz.address,
      FLYZ_ADDRESS: flyz.address,
      // MAI_ADDRESS: maiAddr,
      TREASURY_ADDRESS: treasury.address,
      BONDING_CALC_ADDRESS: bondingCalculator.address,
      STAKING_ADDRESS: staking.address,
      STAKING_HELPER_ADDRESS: stakingHelper.address,
    })
  )

  // Initialize sFlyz and set the index
  await (await sFlyz.initialize(staking.address)).wait()
  await (await sFlyz.setIndex(initialIndex)).wait()

  // set distributor contract and warmup contract
  await (await staking.setContract('0', stakingDistributor.address)).wait()
  await (await staking.setContract('1', stakingWarmup.address)).wait()
  await (await staking.setWarmup(warmupPeriod)).wait()

  // Set treasury for FLYZ token
  await (await flyz.setVault(treasury.address)).wait()

  // Add staking contract as distributor recipient
  await (
    await stakingDistributor.addRecipient(staking.address, initialRewardRate)
  ).wait()

  // queue and toggle reward manager
  await (await treasury.queue('8', stakingDistributor.address)).wait()
}

main()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
