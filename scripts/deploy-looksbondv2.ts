import { ContractTransaction } from 'ethers'
import hre, { ethers } from 'hardhat'

const FLYZ = '0x5A1912749d2b7c3cdb832b81601C8C3f437a0dE8'
const FLYZ_TREASURY = '0xE742799d9c8b1401c35F2137791d9Cb5e7dEc5d6'
const FLYZ_STAKING = '0x5CF2F480e62F357E8fa5aA2c3791d02cC1d26ded'
const sFLYZ = '0x064D8bF7ac3a36d1326EEbCD4216376E236adcd1'
const LOOKS = '0xf4d2888d29d722226fafa5d9b24f9164c092421e'
const LOOKS_STAKING = '0xBcD7254A1D759EFA08eC7c3291B2E85c5dCC12ce'
const LOOKS_WETH_LP = '0xDC00bA87Cc2D99468f7f34BC04CBf72E111A32f7'
const ETH_FEED = '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419'
const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const UNISWAP_ROUTER = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
const DAO = '0xAeD9A2acFdFAC17AFF3c6ecf20D412E601d13A90'

enum MANAGING {
  RESERVEDEPOSITOR,
  RESERVESPENDER,
  RESERVETOKEN,
  RESERVEMANAGER,
  LIQUIDITYDEPOSITOR,
  LIQUIDITYTOKEN,
  LIQUIDITYMANAGER,
  DEBTOR,
  REWARDMANAGER,
  SFLYZ,
}

export async function executeTx(
  message: string,
  request: Promise<ContractTransaction>
) {
  try {
    process.stdout.write(`executing ${message}...`)
    const tx = await request
    process.stdout.write(` tx: ${tx.hash}\n`)
    return tx.wait()
  } catch (e) {
    console.error(e)
    throw e
  }
}

async function verify(address: string, constructorArguments?: any[]) {
  try {
    await hre.run('verify:verify', {
      address,
      constructorArguments,
    })
  } catch (err: any) {
    console.warn(`verify failed: ${address} ${err.message}`)
  }
}

async function main() {
  const [deployer] = await hre.ethers.getSigners()

  console.log('Deploying contracts with the account: ' + deployer.address)

  // deploy looks bond receipt
  console.log(`deploying FlyzWrappedLOOKS...`)
  const FlyzWrappedLOOKS = await ethers.getContractFactory('FlyzWrappedLOOKS')
  const wrappedLooks = await FlyzWrappedLOOKS.deploy()
  await wrappedLooks.deployTransaction.wait()
  console.log('wrappedLooks deployed: ' + wrappedLooks.address)

  // deploy capacitor
  console.log(`deploying FlyzLOOKSCapacitor...`)
  const FlyzLOOKSCapacitor = await ethers.getContractFactory(
    'FlyzLOOKSCapacitor'
  )
  const capacitor = await FlyzLOOKSCapacitor.deploy(
    FLYZ,
    LOOKS,
    LOOKS_STAKING,
    wrappedLooks.address,
    FLYZ_TREASURY,
    UNISWAP_ROUTER
  )
  await capacitor.deployTransaction.wait()
  console.log('capacitor deployed: ' + capacitor.address)

  // deploy bond V2
  console.log(`deploying FlyzLOOKSBondDepositoryV2...`)
  const FlyzLOOKSBondDepositoryV2 = await ethers.getContractFactory(
    'FlyzLOOKSBondDepositoryV2'
  )
  const bondDepositoryV2 = await FlyzLOOKSBondDepositoryV2.deploy(
    FLYZ,
    sFLYZ,
    LOOKS,
    FLYZ_TREASURY,
    DAO,
    FLYZ_STAKING,
    ETH_FEED,
    LOOKS_WETH_LP,
    capacitor.address
  )
  await bondDepositoryV2.deployTransaction.wait()
  console.log('bondDepositoryV2 deployed: ' + bondDepositoryV2.address)

  const treasury = await ethers.getContractAt(
    'FlyzTreasury',
    FLYZ_TREASURY,
    deployer
  )

  // configure wrapped looks treasury
  await executeTx(
    'add wrapped LOOKS as a reserve token',
    treasury.queue(MANAGING.RESERVETOKEN, wrappedLooks.address)
  )

  // configure capacitor access in treasury
  await executeTx(
    'queue capacitor as RESERVEDEPOSITOR',
    treasury.queue(MANAGING.RESERVEDEPOSITOR, capacitor.address)
  )
  await executeTx(
    'queue capacitor as RESERVESPENDER',
    treasury.queue(MANAGING.RESERVESPENDER, capacitor.address)
  )
  await executeTx(
    'queue capacitor as LIQUIDITYDEPOSITOR',
    treasury.queue(MANAGING.LIQUIDITYDEPOSITOR, capacitor.address)
  )

  // configure bond
  await executeTx(
    'add bond to treasury as REWARDMANAGER',
    treasury.queue(MANAGING.REWARDMANAGER, bondDepositoryV2.address)
  )

  await executeTx(
    'initialize bond terms',
    bondDepositoryV2.initializeBondTerms(
      '60',
      '432000',
      '20',
      '10000',
      '8000000000000000',
      '0'
    )
  )

  // wait & verify contracts
  // verify wrapped looks
  await verify(wrappedLooks.address)
  // verify capacitor
  await verify(capacitor.address, [
    FLYZ,
    LOOKS,
    LOOKS_STAKING,
    wrappedLooks.address,
    FLYZ_TREASURY,
    UNISWAP_ROUTER,
  ])
  // verify LOOKS bond
  await verify(bondDepositoryV2.address, [
    FLYZ,
    sFLYZ,
    LOOKS,
    FLYZ_TREASURY,
    DAO,
    FLYZ_STAKING,
    ETH_FEED,
    LOOKS_WETH_LP,
    capacitor.address,
  ])

  // toggle everything
  await executeTx(
    'toggle wrapped looks as RESERVETOKEN',
    treasury.queue(MANAGING.RESERVETOKEN, wrappedLooks.address)
  )
  await executeTx(
    'toggle capacitor as RESERVEDEPOSITOR',
    treasury.queue(MANAGING.RESERVEDEPOSITOR, capacitor.address)
  )
  await executeTx(
    'toggle capacitor as RESERVESPENDER',
    treasury.queue(MANAGING.RESERVESPENDER, capacitor.address)
  )
  await executeTx(
    'toggle capacitor as LIQUIDITYDEPOSITOR',
    treasury.queue(MANAGING.LIQUIDITYDEPOSITOR, capacitor.address)
  )
  await executeTx(
    'toggle bond as REWARDMANAGER',
    treasury.queue(MANAGING.REWARDMANAGER, bondDepositoryV2.address)
  )
}

main()
  .then(() => {
    console.log('done.')
    process.exit()
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
