import { useEffect, useRef } from 'react';
import { BigNumber, utils } from 'ethers';
import {
  TokenId,
  ChainName,
  ChainId,
  MAINNET_CHAINS,
  Context,
} from '@wormhole-foundation/wormhole-connect-sdk';
import { CHAINS_ARR, TOKENS, TOKENS_ARR } from '../config';
import { NetworkConfig, TokenConfig } from '../config/types';
import { toDecimals } from './balance';
import { isValidTransactionDigest, SUI_TYPE_ARG } from '@mysten/sui.js';

export const MAX_DECIMALS = 6;
export const NORMALIZED_DECIMALS = 8;

export function convertAddress(address: string): string {
  if (address.length === 22) return address;
  return `0x${address.slice(address.length - 40, address.length)}`;
}

export function displayEvmAddress(address: string): string {
  const evmAddress = convertAddress(address);
  return (
    evmAddress.slice(0, 6) +
    '...' +
    evmAddress.slice(evmAddress.length - 4, evmAddress.length)
  );
}

export function displaySuiAddress(address: string): string {
  if (address === SUI_TYPE_ARG) return 'Native';
  return (
    address.slice(0, 6) +
    '...' +
    address.slice(address.length - 4, address.length)
  );
}

export function displayAptosAddress(address: string): string {
  if (address === '0x1::aptos_coin::AptosCoin') return 'Native';
  return (
    address.slice(0, 6) +
    '...' +
    address.slice(address.length - 4, address.length)
  );
}

export function displayAddress(chain: ChainName, address: string): string {
  if (chain === 'solana') {
    return (
      address.slice(0, 4) +
      '...' +
      address.slice(address.length - 4, address.length)
    );
  } else if (chain === 'sui') {
    return displaySuiAddress(address);
  } else if (chain === 'aptos') {
    return displayAptosAddress(address);
  } else {
    return displayEvmAddress(address);
  }
}

export function displayWalletAddress(
  walletType: Context,
  address: string,
): string {
  if (walletType === Context.ETH) {
    return displayEvmAddress(address);
  } else if (walletType === Context.SUI) {
    return displaySuiAddress(address);
  } else if (walletType === Context.APTOS) {
    return displayAptosAddress(address);
  }
  return displayAddress('solana', address);
}

export function getNetworkByChainId(chainId: number): NetworkConfig | void {
  return CHAINS_ARR.filter((c) => chainId === c.chainId)[0];
}

export function getWrappedToken(token: TokenConfig): TokenConfig {
  if (!token) throw new Error('token must be defined');

  // if token is not native, return token
  if (token.tokenId) return token;

  // otherwise get wrapped token
  if (!token.tokenId && !token.wrappedAsset)
    throw new Error(`token details misconfigured for ${token.key}`);
  if (!token.tokenId && token.wrappedAsset) {
    const wrapped = TOKENS[token.wrappedAsset];
    if (!wrapped) throw new Error('wrapped token not found');
    return wrapped;
  }
  return token;
}

export function getWrappedTokenId(token: TokenConfig): TokenId {
  const wrapped = getWrappedToken(token);
  return wrapped.tokenId!;
}

export function getTokenById(tokenId: TokenId): TokenConfig | void {
  return TOKENS_ARR.filter(
    (t) =>
      t.tokenId &&
      tokenId.address.toLowerCase() === t.tokenId!.address.toLowerCase(),
  )[0];
}

export function getTokenDecimals(
  chain: ChainId,
  tokenId: TokenId | 'native',
): number {
  if (tokenId === 'native') {
    return chain === MAINNET_CHAINS.solana
      ? 9
      : chain === MAINNET_CHAINS.sui
      ? 9
      : chain === MAINNET_CHAINS.aptos
      ? 8
      : 18;
  }
  const tokenConfig = getTokenById(tokenId);
  if (!tokenConfig) throw new Error('token config not found');
  return chain === MAINNET_CHAINS.solana
    ? tokenConfig.solDecimals
    : chain === MAINNET_CHAINS.sui
    ? tokenConfig.suiDecimals
    : chain === MAINNET_CHAINS.aptos
    ? tokenConfig.aptosDecimals
    : tokenConfig.decimals;
}

function fallbackCopyTextToClipboard(text: string) {
  const textArea = document.createElement('textarea');
  textArea.value = text;

  // Avoid scrolling to bottom
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.position = 'fixed';

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    document.execCommand('copy');
    return true;
  } catch (err) {
    return false;
  } finally {
    document.body.removeChild(textArea);
  }
}

export function copyTextToClipboard(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(
      function () {
        return true;
      },
      function () {
        return fallbackCopyTextToClipboard(text);
      },
    );
  }
  return fallbackCopyTextToClipboard(text);
}

export function isValidTxId(chain: string, tx: string) {
  if (chain === 'sui') {
    return isValidTransactionDigest(tx);
  } else {
    if (tx.startsWith('0x') && tx.length === 66) return true;
    return tx.length > 70 && tx.length < 100;
  }
}

export function debounce(callback: any, wait: number) {
  let timeout: any;
  return (...args: any) => {
    clearTimeout(timeout);
    timeout = setTimeout(function (this: any) {
      callback.apply(this, args);
    }, wait);
  };
}

export function usePrevious(value: any) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export function fromNormalizedDecimals(
  amount: BigNumber,
  decimals: number,
): BigNumber {
  return decimals > NORMALIZED_DECIMALS
    ? utils.parseUnits(amount.toString(), decimals - NORMALIZED_DECIMALS)
    : amount;
}

export function toNormalizedDecimals(
  amount: BigNumber,
  decimals: number,
  numDecimals?: number,
): string {
  const normalizedDecimals =
    decimals > NORMALIZED_DECIMALS ? NORMALIZED_DECIMALS : decimals;
  return toDecimals(amount, normalizedDecimals, numDecimals);
}
