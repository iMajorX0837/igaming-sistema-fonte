import type { AuthModalsConfig } from './siteConfigCache';
import { DEFAULT_AUTH_MODAL_IMAGE } from './siteConfigCache';
import { preloadImage, preloadImages } from './preloadImages';

export function resolveLoginModalImageUrl(config: AuthModalsConfig): string {
  return config.login_imagem_url.trim() || DEFAULT_AUTH_MODAL_IMAGE;
}

export function resolveRegisterModalImageUrl(config: AuthModalsConfig): string {
  return config.register_imagem_url.trim() || DEFAULT_AUTH_MODAL_IMAGE;
}

export function getAuthModalImageUrls(config: AuthModalsConfig): string[] {
  return [...new Set([resolveLoginModalImageUrl(config), resolveRegisterModalImageUrl(config)])];
}

export function preloadAuthModalImages(config: AuthModalsConfig): Promise<void> {
  return preloadImages(getAuthModalImageUrls(config));
}

export function preloadLoginModalImage(config: AuthModalsConfig): Promise<void> {
  return preloadImage(resolveLoginModalImageUrl(config));
}

export function preloadRegisterModalImage(config: AuthModalsConfig): Promise<void> {
  return preloadImage(resolveRegisterModalImageUrl(config));
}
