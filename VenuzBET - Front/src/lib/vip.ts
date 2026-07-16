export const VIP_IMAGE_BASE = 'https://cdn.royalbetsolutions.com/default/vip';

export type VipNivelRow = {
  nivel: number;
  nome: string;
  grupo: string;
  subnivel: number;
  deposito_minimo: number;
  cashback_pct: number;
  bonus_upgrade: number;
  imagem_url: string | null;
  cor: string | null;
};

export type VipProfile = {
  ok: boolean;
  vip_nivel: number;
  vip_nome: string;
  vip_grupo: string;
  vip_imagem: string | null;
  vip_cor: string | null;
  cashback_pct: number;
  total_depositado: number;
  deposito_minimo_atual: number;
  proximo_nivel: number | null;
  proximo_nome: string | null;
  proximo_deposito_minimo: number | null;
  falta_para_proximo: number;
  progresso_pct: number;
};

export type DepositVipResult = {
  ok?: boolean;
  already?: boolean;
  subiu_nivel?: boolean;
  bonus_upgrade?: number;
  vip_nivel?: number;
  vip_nome?: string;
  vip_imagem?: string | null;
  falta_para_proximo?: number;
  proximo_nome?: string | null;
};

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function getVipImageUrl(grupo: string): string {
  return `${VIP_IMAGE_BASE}/${grupo}.webp`;
}

export const VIP_PROFILE_UPDATED_EVENT = 'vipProfileUpdated';

export function dispatchVipProfileUpdated(): void {
  document.dispatchEvent(new CustomEvent(VIP_PROFILE_UPDATED_EVENT));
}
