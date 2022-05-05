import { BigNumber, ContractTransaction } from 'ethers'
import hre, { ethers } from 'hardhat'
import { executeTx } from './utils'

async function main() {
  const CAPACITOR_ADDRESS = ''

  const amount = ethers.utils.parseEther('250.0') // amount in LOOKS
  const capacitorContract = await ethers.getContractAt('FlyzLOOKSCapacitorV3', CAPACITOR_ADDRESS)

  await executeTx('sendLooksToTreasury', capacitorContract.sendLooksToTreasury(amount))

}

main()
  .then(() => console.log('done'))
  .catch((e) => console.error(e))
