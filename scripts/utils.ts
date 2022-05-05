import { ContractTransaction } from 'ethers'

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
