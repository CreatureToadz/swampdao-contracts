// @dev. This script will deploy this V1.1 of Flyz. It will deploy the whole ecosystem.

const { ethers } = require('hardhat')
const UniswapV2ABI = require('./IUniswapV2Factory.json').abi

const LOOKS = '0xf4d2888d29d722226fafa5d9b24f9164c092421e'
const WETH = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'
const UNISWAP_FACTORY = '0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f'
const zeroAddress = '0x0000000000000000000000000000000000000000'
const TIME_LOCK = '1' // 6600 blocks ~ 86400 seconds
const firstEpochTime = 1642377600 // 2022-1-17 00:00 UTC set to the launch date

console.log('First epoch timestamp: ' + firstEpochTime)

async function main() {
  const deployer = await ethers.getSigner()

  console.log('Deploying contracts with the account: ' + deployer.address)

  // change to DAO or vault address
  const rewardAddress = deployer.address

  // Initial staking index
  const initialIndex = '1000000000'

  // What epoch will be first epoch
  const firstEpochNumber = '1'

  // How many seconds are in each epoch
  const epochLengthInSeconds = 86400 / 3

  // Initial reward rate for epoch
  const initialRewardRate = '5000'

  // 15 epoch = 5 days
  const warmupPeriod = '15'

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
    LOOKS,
    lpAddress,
    bondingCalculator.address,
    TIME_LOCK
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

  const LOOKSBondDepository = await ethers.getContractFactory(
    'FlyzLOOKSBondDepository'
  )
  const looksBondDepository = await LOOKSBondDepository.deploy(
    flyz.address,
    sFlyz.address,
    LOOKS,
    treasury.address,
    rewardAddress,
    staking.address,
    '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // ETH feed
    '0xdc00ba87cc2d99468f7f34bc04cbf72e111a32f7' // LOOKS-ETH LP
  )
  await looksBondDepository.deployTransaction.wait()

  const FlyzETHLPBondDepository = await ethers.getContractFactory(
    'FlyzETHLPBondDepository'
  )
  let lpBondDepository = await FlyzETHLPBondDepository.deploy(
    flyz.address,
    sFlyz.address,
    lpAddress,
    treasury.address,
    staking.address,
    bondingCalculator.address,
    rewardAddress,
    '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419' // ETH feed
  )

  console.log(
    JSON.stringify({
      FLYZ_ADDRESS: flyz.address,
      SFLYZ_ADDRESS: sFlyz.address,
      FLYZ_ETH: lpAddress,
      LOOKS,
      TREASURY_ADDRESS: treasury.address,
      BONDING_CALC_ADDRESS: bondingCalculator.address,
      STAKING_ADDRESS: staking.address,
      STAKING_HELPER_ADDRESS: stakingHelper.address,
      STAKING_WARMUP_ADDRESS: stakingWarmup.address,
      STAKING_DISTRIBUTOR_ADDRESS: stakingDistributor.address,
      LOOKS_BOND_DEPOSITORY_ADDRESS: looksBondDepository.address,
      LP_BOND_DEPOSITORY_ADDRESS: lpBondDepository.address,
    })
  )

  // Initialize sFlyz and set the index
  await (await sFlyz.initialize(staking.address)).wait()
  await (await sFlyz.setIndex(initialIndex)).wait()
  console.log('setup sFlyz')

  // set distributor contract and warmup contract
  await (await staking.setContract('0', stakingDistributor.address)).wait()
  await (await staking.setContract('1', stakingWarmup.address)).wait()
  await (await staking.setWarmup(warmupPeriod)).wait()

  console.log('setup staking')

  // Set treasury for FLYZ token
  await (await flyz.setVault(treasury.address)).wait()
  console.log('setup vault')

  // Add staking contract as distributor recipient
  await (
    await stakingDistributor.addRecipient(staking.address, initialRewardRate)
  ).wait()

  // queue and toggle reward manager
  await (await treasury.queue('0', deployer.address)).wait()
  await (await treasury.queue('4', deployer.address)).wait()
  await (await treasury.queue('8', deployer.address)).wait()
  await (await treasury.queue('8', stakingDistributor.address)).wait()
  await (await treasury.queue('8', looksBondDepository.address)).wait()
  await (await treasury.queue('8', lpBondDepository.address)).wait()
  // await (await treasury.queue('8', claim contract address)).wait()

  console.log('queue treasury')

  // toggle 24 hours later
  await (await treasury.toggle('0', deployer.address, zeroAddress)).wait()
  await (await treasury.toggle('4', deployer.address, zeroAddress)).wait()
  await (await treasury.toggle('8', deployer.address, zeroAddress)).wait()
  // await (
  //   await treasury.toggle('8', stakingDistributor.address, zeroAddress)
  // ).wait()
  // await (await treasury.toggle('8', looksBondDepository.address, zeroAddress)).wait()
  // await (
  //   await treasury.toggle('8', lpBondDepository.address, zeroAddress)
  // ).wait()
  // await (await treasury.toggle('8', claim contract address, zeroAddress)).wait()
}

main()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
