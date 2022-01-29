// @dev. This script will deploy this V1.1 of Flyz. It will deploy the whole ecosystem.

const { ethers } = require('hardhat')

const LOOKS = '0xf4d2888d29d722226fafa5d9b24f9164c092421e'
const TIME_LOCK = '1' // 6600 blocks ~ 86400 seconds
const firstEpochTime = 1642377600 // 2022-1-17 00:00 UTC set to the launch date
const addresses = {
  FLYZ_ADDRESS: '0xf4d2888d29d722226fafa5d9b24f9164c092421e',
  SFLYZ_ADDRESS: '0xf4d2888d29d722226fafa5d9b24f9164c092421e',
  FLYZ_ETH: '0xf4d2888d29d722226fafa5d9b24f9164c092421e',
  LOOKS,
  TREASURY_ADDRESS: '0xf4d2888d29d722226fafa5d9b24f9164c092421e',
  BONDING_CALC_ADDRESS: '0xf4d2888d29d722226fafa5d9b24f9164c092421e',
  STAKING_ADDRESS: '0xf4d2888d29d722226fafa5d9b24f9164c092421e',
  STAKING_HELPER_ADDRESS: '0xf4d2888d29d722226fafa5d9b24f9164c092421e',
  STAKING_WARMUP_ADDRESS: '0xf4d2888d29d722226fafa5d9b24f9164c092421e',
  STAKING_DISTRIBUTOR_ADDRESS: '0xf4d2888d29d722226fafa5d9b24f9164c092421e',
  LOOKS_BOND_DEPOSITORY_ADDRESS: '0xf4d2888d29d722226fafa5d9b24f9164c092421e',
  LP_BOND_DEPOSITORY_ADDRESS: '0xf4d2888d29d722226fafa5d9b24f9164c092421e',
}

async function main() {
  const deployer = await ethers.getSigner()
  console.log('Deploying contracts with the account: ' + deployer.address)

  // TODO: change to DAO or vault address
  const rewardAddress = deployer.address

  // Initial staking index
  const initialIndex = '1000000000'

  // What epoch will be first epoch
  const firstEpochNumber = '1'

  // How many seconds are in each epoch
  const epochLengthInSeconds = 86400 / 3
  // const epochLengthInSeconds = 60*10

  // Initial reward rate for epoch
  const initialRewardRate = '5000'

  // 15 epoch = 5 days
  const warmupPeriod = '15'

  await verify(addresses.FLYZ_ADDRESS.address, [])
  await verify(addresses.SFLYZ_ADDRESS.address, [])
  await verify(addresses.TREASURY_ADDRESS.address, [
    addresses.FLYZ_ADDRESS,
    LOOKS,
    addresses.FLYZ_ETH,
    addresses.BONDING_CALC_ADDRESS,
    TIME_LOCK,
  ])
  await verify(addresses.STAKING_DISTRIBUTOR_ADDRESS, [
    addresses.TREASURY_ADDRESS,
    addresses.FLYZ_ADDRESS,
    epochLengthInSeconds,
    firstEpochTime,
  ])
  await verify(addresses.STAKING_ADDRESS, [
    addresses.FLYZ_ADDRESS,
    addresses.SFLYZ_ADDRESS,
    epochLengthInSeconds,
    firstEpochNumber,
    firstEpochTime,
  ])
  await verify(addresses.STAKING_WARMUP_ADDRESS, [
    addresses.STAKING_ADDRESS,
    addresses.SFLYZ_ADDRESS,
  ])
  await verify(addresses.STAKING_HELPER_ADDRESS, [
    addresses.STAKING_ADDRESS,
    addresses.FLYZ_ADDRESS,
  ])

  // verify LOOKS bond
  await verify(addresses.LOOKS_BOND_DEPOSITORY_ADDRESS, [
    addresses.FLYZ_ADDRESS,
    addresses.SFLYZ_ADDRESS,
    addresses.LOOKS,
    addresses.TREASURY_ADDRESS,
    rewardAddress,
    addresses.STAKING_ADDRESS,
    '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // ETH feed
    '0xdc00ba87cc2d99468f7f34bc04cbf72e111a32f7', // LOOKS-ETH LP
  ])
  // verify ETH-FLYZ bond
  await verify(addresses.LP_BOND_DEPOSITORY_ADDRESS, [
    addresses.FLYZ_ADDRESS,
    addresses.SFLYZ_ADDRESS,
    addresses.FLYZ_ETH,
    addresses.TREASURY_ADDRESS,
    addresses.STAKING_ADDRESS,
    addresses.BONDING_CALC_ADDRESS,
    rewardAddress,
    '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // ETH feed
  ])
}

async function verify(address, constructorArguments) {
  try {
    await hre.run('verify:verify', {
      address,
      constructorArguments,
    })
  } catch (err) {
    console.warn(`verify failed: ${address} ${err.message}`)
  }
}

main()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
