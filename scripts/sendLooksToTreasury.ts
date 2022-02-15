import { BigNumber, ContractTransaction } from 'ethers'
import hre, { ethers } from 'hardhat'

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

async function main() {
  const CAPACITOR_ADDRESS = '0xDd973C6FF681913AFd5615EDe5aA66d301C35c46' // v1
  // const CAPACITOR_ADDRESS = '' // v2

  const looksAmount = 10
  const amount = BigNumber.from(looksAmount * 10 ** 18 + '')

  const capacitorContract = await ethers.getContractAt('FlyzLOOKSCapacitor', CAPACITOR_ADDRESS)

  await executeTx('sendLooksToTreasury', capacitorContract.sendLooksToTreasury(amount))

}

main()
  .then(() => console.log('done'))
  .catch((e) => console.error(e))
