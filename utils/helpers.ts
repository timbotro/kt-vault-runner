import 'dotenv/config'
import { ApiPromise, WsProvider } from '@polkadot/api'
import { Keyring } from '@polkadot/api'

export const setup = async () => {
  const tokenPair = { collateral: { Token: 'KSM' }, wrapped: { Token: 'KBTC' } }

  const provider = new WsProvider(process.env.WSS_URI)
  const api = await ApiPromise.create({ provider })
  await api.isReady

  const ss58Prefix = api.consts.system.ss58Prefix as unknown

  const keyring = new Keyring({ type: 'sr25519' })
  const signer = keyring.addFromMnemonic(process.env.SEED_PHRASE as string)
  const address = keyring.encodeAddress(signer.publicKey, ss58Prefix as number)

  const blob = api.consts.system.version.toJSON() as any
  const vaultInfo = (
    await api.query.vaultRegistry.vaults({
      accountId: 'a3aPvmjypKaDtjRgYbDL2CCkseYR3SLwvPevL6j7wF67aFtV4',
      currencies: tokenPair,
    })
  ).toJSON() as any

  const active = (await vaultInfo.status.active) ? true : false
  const unbanned = (await vaultInfo.bannedUntil) === null ? true : false

  const ksmCollateral = (await api.query.tokens.accounts("a3aPvmjypKaDtjRgYbDL2CCkseYR3SLwvPevL6j7wF67aFtV4", {Token: "KSM"}) as any).reserved

  const kbtcIssued = vaultInfo.issuedTokens
//   const ratio = 

  return { api, signer, address, blob, active, unbanned, ksmCollateral, kbtcIssued }
}
