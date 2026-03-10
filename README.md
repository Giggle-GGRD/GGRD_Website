# GGRD Website

Official static website for Giggle Reloaded (GGRD): [https://ggrd.me](https://ggrd.me)

## Current Scope (BSC Mainnet)
- Token: GGRD on BNB Smart Chain mainnet
- Token contract: `0xA0d5663d57b7D7EF975D2F02BcAEaf5c94c671f9`
- Presale contract: `0xd8983534dd3c369d85127f6C9B85d98768139387`
- Payment asset in presale: USDC (`0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`)
- Governance: Safe multisig (2/3) + timelocks

## Main Files
- `index.html` - landing page with tokenomics, live presale dashboard (stages, raised funds), wallet interaction panel, and mobile CTA quick actions
- `GGRD_Whitepaper_EN.html` - whitepaper v3.1 (BSC)
- `donation-policy.html` - charity operations policy

## Deploy (GitHub Pages)
Run in `C:\ggrd-staking-fixed\GGRD_Website`:

```powershell
Set-Location 'C:\ggrd-staking-fixed\GGRD_Website'
git add .
git commit -m "Update website and whitepaper to BSC mainnet v3.1"
git push origin main
```

## Notes
- Always verify contract addresses on BscScan before publishing announcements.
- Keep tokenomics text aligned with `ggrd-bsc-contracts` deployment artifacts.
