import { getNamedAccounts } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
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
const LOOKS_BOND_V2 = '0xBD3E546b78606a5f634073DeDD84a0bFdB34f26b'
const WRAPPED_LOOKS = '0x0f9ac57736216BAD72C8bd56312aD55CFde040eA'

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

const delay = (ms: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

const DEPLOYMENT_NAME = 'LooksCapacitorV2'
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre
  const { deployer } = await getNamedAccounts()
  const deployerSigner = await ethers.getSigner(deployer)

  // deploy capacitor
  console.log(`deploying FlyzLOOKSCapacitor...`)
  const capacitorDeployment = await deployments.deploy('FlyzLOOKSCapacitor', {
    from: deployer,
    args: [
      FLYZ,
      LOOKS,
      LOOKS_STAKING,
      WRAPPED_LOOKS,
      FLYZ_TREASURY,
      UNISWAP_ROUTER,
    ],
    log: true,
    autoMine: true,
    skipIfAlreadyDeployed: true,
    contract: 'FlyzLOOKSCapacitor',
  })

  console.log('capacitor deployed: ' + capacitorDeployment.address)

  const wrappedLooks = await ethers.getContractAt(
    'FlyzWrappedLOOKS',
    WRAPPED_LOOKS,
    deployerSigner
  )
  const capacitor = await ethers.getContractAt(
    'FlyzLOOKSCapacitor',
    capacitorDeployment.address,
    deployerSigner
  )
  const bondDepositoryV2 = await ethers.getContractAt(
    'FlyzLOOKSBondDepositoryV2',
    LOOKS_BOND_V2,
    deployerSigner
  )
  const treasury = await ethers.getContractAt(
    'FlyzTreasury',
    FLYZ_TREASURY,
    deployerSigner
  )

  // configure wrapped looks treasury
  await executeTx(
    'add capacitor as minter',
    wrappedLooks.addMinter(capacitor.address)
  )

  // configure depositor in capacitor
  await executeTx(
    'add bond as depositor in capacitor',
    capacitor.addDepositor(bondDepositoryV2.address)
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

  // wait
  console.log(`wait 30s...`)
  await delay(30000)

  // toggle everything
  await executeTx(
    'toggle capacitor as RESERVEDEPOSITOR',
    treasury.toggle(MANAGING.RESERVEDEPOSITOR, capacitor.address, ethers.constants.AddressZero)
  )
  await executeTx(
    'toggle capacitor as RESERVESPENDER',
    treasury.toggle(MANAGING.RESERVESPENDER, capacitor.address, ethers.constants.AddressZero)
  )
  await executeTx(
    'toggle capacitor as LIQUIDITYDEPOSITOR',
    treasury.toggle(MANAGING.LIQUIDITYDEPOSITOR, capacitor.address, ethers.constants.AddressZero)
  )
}

export default func
func.tags = [DEPLOYMENT_NAME]
