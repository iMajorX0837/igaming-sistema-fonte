import type { AppLanguage } from './types';
import { pickCopy } from './types';
import { COMMON_COPY, type CommonCopy } from './common';
import { AUTH_COPY, type AuthCopy } from './auth';
import { NAVIGATION_COPY, type NavigationCopy } from './navigation';
import { GAMES_COPY, type GamesCopy } from './games';
import { WALLET_COPY, type WalletCopy } from './wallet';
import { DEPOSIT_WITHDRAW_COPY, type DepositWithdrawCopy } from './depositWithdraw';
import { COUPON_COPY, type CouponCopy } from './coupon';
import { PROFILE_COPY, type ProfileCopy } from './profile';
import {
  VIP_COPY,
  REFERRAL_COPY,
  PROMOTIONS_COPY,
  HOME_COPY,
  LEGAL_PAGE_COPY,
  MOBILE_APP_COPY,
  FREE_BONUS_COPY,
  PRIZE_WHEEL_COPY,
  type VipCopy,
  type ReferralCopy,
  type PromotionsCopy,
  type HomeCopy,
  type LegalPageCopy,
  type MobileAppCopy,
  type FreeBonusCopy,
  type PrizeWheelCopy,
} from './pages';
import {
  DEFAULT_HEADER_FOOTER_COPY,
  getHeaderFooterCopy,
  getLocaleForLanguage,
  type HeaderFooterCopy,
} from './headerFooter';
import { DEFAULT_SIDEBAR_COPY, type SidebarCopy } from './sidebar';

export type AppCopy = {
  common: CommonCopy;
  auth: AuthCopy;
  navigation: NavigationCopy;
  games: GamesCopy;
  wallet: WalletCopy;
  depositWithdraw: DepositWithdrawCopy;
  coupon: CouponCopy;
  profile: ProfileCopy;
  vip: VipCopy;
  referral: ReferralCopy;
  promotions: PromotionsCopy;
  home: HomeCopy;
  legal: LegalPageCopy;
  mobileApp: MobileAppCopy;
  freeBonus: FreeBonusCopy;
  prizeWheel: PrizeWheelCopy;
  headerFooter: HeaderFooterCopy;
  sidebar: SidebarCopy;
};

const APP_COPY: Record<AppLanguage, AppCopy> = {
  pt: {
    common: COMMON_COPY.pt,
    auth: AUTH_COPY.pt,
    navigation: NAVIGATION_COPY.pt,
    games: GAMES_COPY.pt,
    wallet: WALLET_COPY.pt,
    depositWithdraw: DEPOSIT_WITHDRAW_COPY.pt,
    coupon: COUPON_COPY.pt,
    profile: PROFILE_COPY.pt,
    vip: VIP_COPY.pt,
    referral: REFERRAL_COPY.pt,
    promotions: PROMOTIONS_COPY.pt,
    home: HOME_COPY.pt,
    legal: LEGAL_PAGE_COPY.pt,
    mobileApp: MOBILE_APP_COPY.pt,
    freeBonus: FREE_BONUS_COPY.pt,
    prizeWheel: PRIZE_WHEEL_COPY.pt,
    headerFooter: DEFAULT_HEADER_FOOTER_COPY.pt,
    sidebar: DEFAULT_SIDEBAR_COPY.pt,
  },
  en: {
    common: COMMON_COPY.en,
    auth: AUTH_COPY.en,
    navigation: NAVIGATION_COPY.en,
    games: GAMES_COPY.en,
    wallet: WALLET_COPY.en,
    depositWithdraw: DEPOSIT_WITHDRAW_COPY.en,
    coupon: COUPON_COPY.en,
    profile: PROFILE_COPY.en,
    vip: VIP_COPY.en,
    referral: REFERRAL_COPY.en,
    promotions: PROMOTIONS_COPY.en,
    home: HOME_COPY.en,
    legal: LEGAL_PAGE_COPY.en,
    mobileApp: MOBILE_APP_COPY.en,
    freeBonus: FREE_BONUS_COPY.en,
    prizeWheel: PRIZE_WHEEL_COPY.en,
    headerFooter: DEFAULT_HEADER_FOOTER_COPY.en,
    sidebar: DEFAULT_SIDEBAR_COPY.en,
  },
  es: {
    common: COMMON_COPY.es,
    auth: AUTH_COPY.es,
    navigation: NAVIGATION_COPY.es,
    games: GAMES_COPY.es,
    wallet: WALLET_COPY.es,
    depositWithdraw: DEPOSIT_WITHDRAW_COPY.es,
    coupon: COUPON_COPY.es,
    profile: PROFILE_COPY.es,
    vip: VIP_COPY.es,
    referral: REFERRAL_COPY.es,
    promotions: PROMOTIONS_COPY.es,
    home: HOME_COPY.es,
    legal: LEGAL_PAGE_COPY.es,
    mobileApp: MOBILE_APP_COPY.es,
    freeBonus: FREE_BONUS_COPY.es,
    prizeWheel: PRIZE_WHEEL_COPY.es,
    headerFooter: DEFAULT_HEADER_FOOTER_COPY.es,
    sidebar: DEFAULT_SIDEBAR_COPY.es,
  },
};

export function getAppCopy(lang: AppLanguage): AppCopy {
  return pickCopy(lang, APP_COPY);
}

export { getHeaderFooterCopy, getLocaleForLanguage };
export type { AppLanguage };
