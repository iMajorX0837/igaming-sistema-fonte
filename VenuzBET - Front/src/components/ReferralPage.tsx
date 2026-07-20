import { Copy } from 'lucide-react';
import Footer from './Footer';
import AppPageScaffold from './AppPageScaffold';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { appPageContainerClass } from '../constants/homeLayout';
import { useHomeConfig } from '../hooks/useHomeConfig';
import { usePlataformaConfig } from '../hooks/usePlataformaConfig';
import { useSiteBrand } from '../hooks/useSiteBrand';
import { buildReferralLink } from '../lib/siteBrand';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function ReferralPage() {
  const { user, isAuthenticated } = useAuth();
  const { config: homeConfig } = useHomeConfig();
  const { config: plataformaConfig } = usePlataformaConfig();
  const { nomeBet, siteDominio } = useSiteBrand();
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [qualifiedReferrals, setQualifiedReferrals] = useState(0);
  const [ganhosTotais, setGanhosTotais] = useState(0);
  const [recompensa, setRecompensa] = useState(plataformaConfig.indicacao_recompensa);
  const [depositoMinimo, setDepositoMinimo] = useState(plataformaConfig.indicacao_deposito_minimo);

  const referralLink = buildReferralLink(siteDominio, referralCode);
  const cardBg = `color-mix(in srgb, ${homeConfig.fundo} 88%, black)`;

  useEffect(() => {
    setRecompensa(plataformaConfig.indicacao_recompensa);
    setDepositoMinimo(plataformaConfig.indicacao_deposito_minimo);
  }, [plataformaConfig.indicacao_recompensa, plataformaConfig.indicacao_deposito_minimo]);

  useEffect(() => {
    // Garante que o Iconify escaneia os ícones após renderizar
    const timer = setTimeout(() => {
      if ((window as any).Iconify) {
        (window as any).Iconify.scan();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchReferralData = async () => {
      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }

      try {
        const { data: indicacaoConfig, error: indicacaoConfigError } = await supabase.rpc(
          'obter_indicacao_config_usuario',
          { p_usuario_id: user.id },
        );

        if (!indicacaoConfigError && indicacaoConfig) {
          const config = indicacaoConfig as {
            ok?: boolean;
            link_indicacao?: string | null;
            recompensa?: number;
            deposito_minimo?: number;
            total_indicados?: number;
            indicados_qualificados?: number;
            ganhos_totais?: number;
          };

          if (config.ok !== false) {
            if (config.link_indicacao) {
              setReferralCode(config.link_indicacao);
            }
            if (Number.isFinite(Number(config.recompensa))) {
              setRecompensa(Number(config.recompensa));
            }
            if (Number.isFinite(Number(config.deposito_minimo))) {
              setDepositoMinimo(Number(config.deposito_minimo));
            }
            if (Number.isFinite(Number(config.total_indicados))) {
              setTotalReferrals(Number(config.total_indicados));
            }
            if (Number.isFinite(Number(config.indicados_qualificados))) {
              setQualifiedReferrals(Number(config.indicados_qualificados));
            }
            if (Number.isFinite(Number(config.ganhos_totais))) {
              setGanhosTotais(Number(config.ganhos_totais));
            }
          }
        } else if (indicacaoConfigError) {
          console.error('Erro ao buscar config de indicação:', indicacaoConfigError);

          const { data: userData, error: userError } = await supabase
            .from('usuarios')
            .select('link_indicação')
            .eq('id', user.id)
            .single();

          if (!userError && userData?.link_indicação) {
            const code = userData.link_indicação as string;
            setReferralCode(code);

            const { count } = await supabase
              .from('usuarios')
              .select('*', { count: 'exact', head: true })
              .eq('indicado_por', code);

            setTotalReferrals(count || 0);

            const { data: qualifiedData } = await supabase.rpc('count_qualified_referrals', {
              referral_code_param: code,
            });
            setQualifiedReferrals(Number(qualifiedData) || 0);
          }
        }
      } catch (err) {
        console.error('Erro ao buscar dados de indicação:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReferralData();
  }, [user, isAuthenticated]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppPageScaffold>
      <div
        className={`flex flex-col min-h-full ${appPageContainerClass}`}
        style={{ backgroundColor: homeConfig.fundo }}
      >
        <div className="flex-1 py-4 sm:py-6 max-md:pb-2">
          <div className="space-y-5 md:space-y-6">
              <div>
                <div className="flex items-start gap-2 mb-3 md:mb-4">
                  <svg data-v-3bc5e6e0="" id="fi_9590121" enableBackground="new 0 0 512 512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" className="w-7 h-7 md:w-8 md:h-8 shrink-0 mt-0.5">
                    <linearGradient id="lg1">
                      <stop offset=".0022" stopColor="#236568"></stop>
                      <stop offset=".8472" stopColor="#2f878a"></stop>
                      <stop offset="1" stopColor="#06daae"></stop>
                    </linearGradient>
                    <linearGradient id="SVGID_1_" gradientUnits="userSpaceOnUse" x1="15.919" x2="190.23" xlinkHref="#lg1" y1="365.785" y2="365.785"></linearGradient>
                    <linearGradient id="lg2">
                      <stop offset="0" stopColor="#236568"></stop>
                      <stop offset="1" stopColor="#2f878a"></stop>
                    </linearGradient>
                    <linearGradient id="SVGID_00000101072497200446218720000015861062420264693632_" gradientUnits="userSpaceOnUse" x1="174.209" x2="194.013" xlinkHref="#lg2" y1="388.804" y2="388.804"></linearGradient>
                    <linearGradient id="SVGID_00000119105501022878576560000014153628273261551489_" gradientUnits="userSpaceOnUse" x1="174.209" x2="194.013" xlinkHref="#lg2" y1="379.256" y2="379.256"></linearGradient>
                    <linearGradient id="SVGID_00000036251416998256588930000009476649650106129336_" gradientUnits="userSpaceOnUse" x1="174.209" x2="194.013" xlinkHref="#lg2" y1="369.814" y2="369.814"></linearGradient>
                    <linearGradient id="SVGID_00000063595893238047319340000005096091193383327634_" gradientUnits="userSpaceOnUse" x1="174.209" x2="194.013" xlinkHref="#lg2" y1="360.266" y2="360.266"></linearGradient>
                    <linearGradient id="SVGID_00000061458640768143766450000003341112368131560617_" gradientUnits="userSpaceOnUse" x1="174.209" x2="194.013" xlinkHref="#lg2" y1="350.505" y2="350.505"></linearGradient>
                    <linearGradient id="lg3">
                      <stop offset="0" stopColor="#1a4c4e"></stop>
                      <stop offset="1" stopColor="#1a4c4e" stopOpacity="0"></stop>
                    </linearGradient>
                    <linearGradient id="SVGID_00000178902485617187154780000001409697252689639607_" gradientUnits="userSpaceOnUse" x1="-22.6" x2="233.515" xlinkHref="#lg3" y1="311.261" y2="459.129"></linearGradient>
                    <linearGradient id="lg4">
                      <stop offset="0" stopColor="#06daae"></stop>
                      <stop offset="1" stopColor="#9bf0df"></stop>
                    </linearGradient>
                    <linearGradient id="SVGID_00000078750398250412142780000008858755781094843292_" gradientUnits="userSpaceOnUse" x1="108.931" x2="373.369" xlinkHref="#lg4" y1="216.292" y2="368.966"></linearGradient>
                    <linearGradient id="lg5">
                      <stop offset="0" stopColor="#2f878a"></stop>
                      <stop offset="1" stopColor="#06daae"></stop>
                    </linearGradient>
                    <linearGradient id="SVGID_00000174565981644613903090000009814456956783333269_" gradientUnits="userSpaceOnUse" x1="147.327" x2="456.604" xlinkHref="#lg5" y1="238.46" y2="417.021"></linearGradient>
                    <linearGradient id="SVGID_00000036253493001505670350000005749550877650853791_" gradientUnits="userSpaceOnUse" x1="139.824" x2="335.325" xlinkHref="#lg5" y1="234.128" y2="347.001"></linearGradient>
                    <linearGradient id="lg6">
                      <stop offset="0" stopColor="#ffa538"></stop>
                      <stop offset="1" stopColor="#ffc538"></stop>
                    </linearGradient>
                    <linearGradient id="SVGID_00000124854794250760285970000003032097043517281426_" gradientUnits="userSpaceOnUse" x1="327.336" x2="327.336" xlinkHref="#lg6" y1="397.214" y2="251.492"></linearGradient>
                    <linearGradient id="lg7">
                      <stop offset="0" stopColor="#ffc538"></stop>
                      <stop offset="1" stopColor="#f7e041"></stop>
                    </linearGradient>
                    <linearGradient id="SVGID_00000093873578953920101870000012029293926901290130_" gradientTransform="matrix(.866 -.5 1 .577 79.248 -237.218)" gradientUnits="userSpaceOnUse" x1="-436.3" x2="-436.3" xlinkHref="#lg7" y1="437.237" y2="640.745"></linearGradient>
                    <linearGradient id="SVGID_00000160875236277510682090000014743657489279716512_" gradientUnits="userSpaceOnUse" x1="334.711" x2="348.96" y1="326.272" y2="350.952">
                      <stop offset="0" stopColor="#0d2627"></stop>
                      <stop offset="1" stopColor="#0d2627" stopOpacity="0"></stop>
                    </linearGradient>
                    <linearGradient id="SVGID_00000069365243619821651120000009783536715873294511_" gradientUnits="userSpaceOnUse" x1="59.311" x2="270.174" xlinkHref="#lg3" y1="294.858" y2="434.843"></linearGradient>
                    <linearGradient id="SVGID_00000061450818095137148100000009347823746281288854_" gradientUnits="userSpaceOnUse" x1="58.296" x2="232.607" xlinkHref="#lg1" y1="301.132" y2="301.132"></linearGradient>
                    <linearGradient id="SVGID_00000103241244723885632190000013612257476498407357_" gradientUnits="userSpaceOnUse" x1="216.586" x2="236.389" xlinkHref="#lg2" y1="324.151" y2="324.151"></linearGradient>
                    <linearGradient id="SVGID_00000079487984241370392720000016578770994935877040_" gradientUnits="userSpaceOnUse" x1="216.586" x2="236.389" xlinkHref="#lg2" y1="314.603" y2="314.603"></linearGradient>
                    <linearGradient id="SVGID_00000041988750697066700220000008896621971636224931_" gradientUnits="userSpaceOnUse" x1="216.586" x2="236.389" xlinkHref="#lg2" y1="305.161" y2="305.161"></linearGradient>
                    <linearGradient id="SVGID_00000040546825542028229130000013481962599481143221_" gradientUnits="userSpaceOnUse" x1="216.586" x2="236.389" xlinkHref="#lg2" y1="295.612" y2="295.612"></linearGradient>
                    <linearGradient id="SVGID_00000008121392477418329070000000792082031545480628_" gradientUnits="userSpaceOnUse" x1="216.586" x2="236.389" xlinkHref="#lg2" y1="285.852" y2="285.852"></linearGradient>
                    <linearGradient id="SVGID_00000074401317466244254690000016038301375059558576_" gradientUnits="userSpaceOnUse" x1="68.75" x2="224.064" xlinkHref="#lg3" y1="290.803" y2="380.474"></linearGradient>
                    <linearGradient id="SVGID_00000178914414621442392020000005596685627470042795_" gradientUnits="userSpaceOnUse" x1="151.307" x2="415.745" xlinkHref="#lg4" y1="151.639" y2="304.312"></linearGradient>
                    <linearGradient id="SVGID_00000158014704345547339290000016494649559852784300_" gradientUnits="userSpaceOnUse" x1="189.703" x2="498.98" xlinkHref="#lg5" y1="173.807" y2="352.368"></linearGradient>
                    <linearGradient id="SVGID_00000169531576223107312920000003651580625823966598_" gradientUnits="userSpaceOnUse" x1="182.2" x2="377.702" xlinkHref="#lg5" y1="169.475" y2="282.348"></linearGradient>
                    <linearGradient id="SVGID_00000168107474088649747130000004344528308460544681_" gradientUnits="userSpaceOnUse" x1="369.712" x2="369.712" xlinkHref="#lg6" y1="332.56" y2="186.839"></linearGradient>
                    <linearGradient id="SVGID_00000032614030094262496080000004517125037453224080_" gradientTransform="matrix(.866 -.5 1 .577 79.248 -237.218)" gradientUnits="userSpaceOnUse" x1="-347.181" x2="-347.181" xlinkHref="#lg7" y1="402.436" y2="605.944"></linearGradient>
                    <linearGradient id="SVGID_00000056399265785088990070000011306652201036093597_" gradientUnits="userSpaceOnUse" x1="32.314" x2="206.625" xlinkHref="#lg1" y1="249.841" y2="249.841"></linearGradient>
                    <linearGradient id="SVGID_00000031911176672358920120000005489672320189203880_" gradientUnits="userSpaceOnUse" x1="190.604" x2="210.408" xlinkHref="#lg2" y1="272.86" y2="272.86"></linearGradient>
                    <linearGradient id="SVGID_00000080171500772247854420000013982735007769899411_" gradientUnits="userSpaceOnUse" x1="190.604" x2="210.408" xlinkHref="#lg2" y1="263.312" y2="263.312"></linearGradient>
                    <linearGradient id="SVGID_00000093169367931510524910000016129778611485577627_" gradientUnits="userSpaceOnUse" x1="190.604" x2="210.408" xlinkHref="#lg2" y1="253.87" y2="253.87"></linearGradient>
                    <linearGradient id="SVGID_00000123428514402270943150000006416947569683988662_" gradientUnits="userSpaceOnUse" x1="190.604" x2="210.408" xlinkHref="#lg2" y1="244.321" y2="244.321"></linearGradient>
                    <linearGradient id="SVGID_00000167368448542779109550000004897286947612652197_" gradientUnits="userSpaceOnUse" x1="190.604" x2="210.408" xlinkHref="#lg2" y1="234.561" y2="234.561"></linearGradient>
                    <linearGradient id="SVGID_00000098215608085546586830000007402636996879978153_" gradientUnits="userSpaceOnUse" x1="125.326" x2="389.764" xlinkHref="#lg4" y1="100.348" y2="253.021"></linearGradient>
                    <linearGradient id="SVGID_00000103953337385262383600000008168024021655968682_" gradientUnits="userSpaceOnUse" x1="163.722" x2="472.999" xlinkHref="#lg5" y1="122.516" y2="301.077"></linearGradient>
                    <linearGradient id="SVGID_00000140714572826244592020000004572149336927403420_" gradientUnits="userSpaceOnUse" x1="156.219" x2="351.72" xlinkHref="#lg5" y1="118.184" y2="231.057"></linearGradient>
                    <linearGradient id="SVGID_00000041267466201203304830000012179485810799738520_" gradientUnits="userSpaceOnUse" x1="343.731" x2="343.731" xlinkHref="#lg6" y1="281.269" y2="135.548"></linearGradient>
                    <linearGradient id="SVGID_00000083080120241724797030000009184134110946004889_" gradientTransform="matrix(.866 -.5 1 .577 79.248 -237.218)" gradientUnits="userSpaceOnUse" x1="-310.893" x2="-310.893" xlinkHref="#lg7" y1="345.03" y2="548.537"></linearGradient>
                    <g>
                      <g>
                        <g>
                          <g>
                            <path d="m469.613 307.025.007-.001v-49.147l-469.62 62.137v49.119l.007-.001c-.011 1.517 1.086 3.119 3.251 4.369l170.279 98.31c3.939 2.274 9.897 2.521 13.308.552l99.331-57.349 46.712-29.596 35.607-17.931 98.826-57.057c1.573-.908 2.32-2.13 2.292-3.405z" fill="url(#SVGID_1_)"></path>
                            <path d="m467.321 306.471-280.476 161.933c-3.411 1.969-9.369 1.722-13.308-.552l-170.279-98.31c-2.165-1.25-3.262-2.852-3.251-4.369l-.007.001v4.81l.007-.001c-.011 1.517 1.086 3.119 3.251 4.369l170.279 98.311c3.939 2.274 9.897 2.521 13.308.552l99.331-57.349 2.227-4.155 77.328-44.211 2.764.84 98.826-57.057c1.573-.908 2.319-2.13 2.292-3.405l.007-.001v-4.809l-.007.001c.028 1.273-.719 2.494-2.292 3.402z" fill="url(#SVGID_00000101072497200446218720000015861062420264693632_)"></path>
                            <path d="m467.321 296.923-280.476 161.933c-3.411 1.969-9.369 1.722-13.308-.552l-170.279-98.31c-2.165-1.25-3.262-2.852-3.251-4.369h-.007v4.809l.007-.001c-.011 1.517 1.086 3.119 3.251 4.369l170.279 98.311c3.939 2.274 9.897 2.521 13.308.552l280.476-161.933c1.573-.908 2.319-2.13 2.292-3.405l.007-.001v-4.81l-.007.001c.028 1.276-.719 2.498-2.292 3.406z" fill="url(#SVGID_00000119105501022878576560000014153628273261551489_)"></path>
                            <path d="m467.321 287.481-280.476 161.933c-3.411 1.969-9.369 1.722-13.308-.552l-170.279-98.311c-2.165-1.25-3.262-2.852-3.251-4.369l-.007.001v4.81l.007-.001c-.011 1.517 1.086 3.119 3.251 4.369l170.279 98.311c3.939 2.274 9.897 2.521 13.308.552l280.476-161.934c1.573-.908 2.319-2.13 2.292-3.405l.007-.001v-4.809l-.007.001c.028 1.275-.719 2.497-2.292 3.405z" fill="url(#SVGID_00000036251416998256588930000009476649650106129336_)"></path>
                            <path d="m467.321 277.933-280.476 161.932c-3.411 1.969-9.369 1.722-13.308-.552l-170.279-98.31c-2.165-1.25-3.262-2.852-3.251-4.369l-.007.001v4.809l.007-.001c-.011 1.517 1.086 3.119 3.251 4.369l170.279 98.311c3.939 2.274 9.897 2.521 13.308.552l280.476-161.933c1.573-.908 2.319-2.13 2.292-3.405l.007-.001v-4.81l-.007.001c.028 1.276-.719 2.497-2.292 3.406z" fill="url(#SVGID_00000063595893238047319340000005096091193383327634_)"></path>
                            <path d="m467.321 268.172-280.476 161.933c-3.411 1.969-9.369 1.722-13.308-.552l-170.279-98.31c-2.165-1.25-3.262-2.852-3.251-4.369h-.007v4.809l.007-.001c-.011 1.517 1.086 3.119 3.251 4.369l170.279 98.311c3.939 2.274 9.897 2.521 13.308.552l280.476-161.933c1.573-.908 2.319-2.13 2.292-3.405l.007-.001v-4.809l-.007.001c.028 1.275-.719 2.497-2.292 3.405z" fill="url(#SVGID_00000061458640768143766450000003341112368131560617_)"></path>
                            <path d="m3.258 374.352 104.86 60.541 43.306-25.003-89.611-98.055-61.813 8.179v49.969l.007-.001c-.011 1.517 1.086 3.119 3.251 4.37z" fill="url(#SVGID_00000178902485617187154780000001409697252689639607_)"></path>
                            <path d="m282.324 156.004-277.816 160.396c-3.379 1.951-2.955 5.358.947 7.611l168.663 97.378c3.901 2.253 9.803 2.497 13.182.546l277.815-160.397c3.379-1.951 2.955-5.358-.946-7.61l-168.664-97.378c-3.901-2.252-9.803-2.497-13.181-.546z" fill="url(#SVGID_00000078750398250412142780000008858755781094843292_)"></path>
                            <path d="m282.779 154.73-99.007 57.161-31.284 23.28-51.268 24.382-98.917 57.11c-3.411 1.969-2.983 5.41.955 7.684l170.279 98.311c3.939 2.274 9.897 2.521 13.308.552l280.476-161.933c3.411-1.969 2.983-5.409-.956-7.683l-170.279-98.311c-3.938-2.275-9.896-2.522-13.307-.553zm101.999 82.714c-14.806 8.548-12.949 23.479 4.147 33.35 6.139 3.544 13.41 5.948 20.892 7.185l-194.042 112.03c-2.143-4.32-6.306-8.518-12.445-12.062-17.096-9.87-42.958-10.943-57.764-2.394-5.317 3.07-8.473 6.964-9.558 11.15l-70.474-40.688c7.25-.627 13.995-2.449 19.312-5.518 14.806-8.548 12.949-23.479-4.147-33.35-6.139-3.545-13.41-5.948-20.892-7.185l194.042-112.03c2.143 4.32 6.306 8.518 12.445 12.062 17.096 9.87 42.958 10.943 57.764 2.394 5.317-3.07 8.473-6.964 9.558-11.15l70.474 40.688c-7.25.626-13.995 2.448-19.312 5.518z" fill="url(#SVGID_00000174565981644613903090000009814456956783333269_)"></path>
                            <path d="m288.864 257.075c-34.85-20.121-87.568-22.306-117.749-4.881s-26.396 47.862 8.454 67.982 87.568 22.306 117.749 4.881c30.181-17.424 26.396-47.861-8.454-67.982z" fill="url(#SVGID_00000036253493001505670350000005749550877650853791_)"></path>
                          </g>
                          <g>
                            <path d="m286.176 365.86v50.005l82.319-47.527v-50.005l-41.159 17.064z" fill="url(#SVGID_00000124854794250760285970000003032097043517281426_)"></path>
                            <path d="m183.772 211.892-82.552 47.661 184.956 106.307 82.319-47.527z" fill="url(#SVGID_00000093873578953920101870000012029293926901290130_)"></path>
                            <g>
                              <path d="m273.496 304.768 9.198 5.31c3.241 1.871 3.241 4.177 0 6.049-2.502 1.444-8.757 1.444-11.258 0l-8.901-5.139c-4.005 1.676-8.457 3.036-13.114 4.042-8.023 1.732-18.767.29-20.911-2.815l-.036-.052c-2.089-3.026 2.224-6.145 10.508-7.565 6.604-1.132 12.465-2.897 15.931-4.898 4.412-2.547 5.304-5.241 1.813-7.257-11.228-6.483-34.587 14.848-57.987 1.338-10.473-6.047-11.202-14.015-2.724-21.198l-8.632-4.984c-3.242-1.872-3.242-4.177 0-6.049 2.502-1.444 8.757-1.444 11.258 0l8.146 4.703c1.998-.894 4.1-1.703 6.265-2.422 7.59-2.519 20.54-1.281 23.044 2.19 1.998 2.77-1.434 5.643-8.505 7.244-5.617 1.272-10.532 2.854-13.333 4.471-3.595 2.076-4.455 4.315-1.436 6.059 10.945 6.319 34.87-14.685 58.647-.957 11.607 6.703 10.718 15.06 2.027 21.93z" fill="#fff"></path>
                            </g>
                          </g>
                          <g>
                            <path d="m183.772 211.892-82.552 47.661 184.956 106.307 82.319-47.527z" fill="url(#SVGID_00000093873578953920101870000012029293926901290130_)"></path>
                          </g>
                          <path d="m469.62 257.878-42.527 5.627-217.179 146.385c0 6.51 7.048 10.579 12.686 7.324l247.02-142.617z" fill="url(#SVGID_00000160875236277510682090000014743657489279716512_)"></path>
                        </g>
                        <path d="m209.914 409.89 4.629-2.672-110.424-149.338-101.816 58.783c-3.411 1.969-2.983 5.409.956 7.683l148.165 85.543h58.49z" fill="url(#SVGID_00000069365243619821651120000009783536715873294511_)"></path>
                        <g>
                          <g>
                            <path d="m511.989 242.372.007-.001v-49.147l-469.62 62.136v49.119l.007-.001c-.011 1.517 1.086 3.119 3.251 4.369l170.279 98.31c3.939 2.274 9.897 2.521 13.308.552l99.331-57.349 46.712-29.596 35.606-17.931 98.826-57.057c1.574-.907 2.321-2.129 2.293-3.404z" fill="url(#SVGID_00000061450818095137148100000009347823746281288854_)"></path>
                            <path d="m509.697 241.818-280.476 161.933c-3.411 1.969-9.369 1.722-13.308-.552l-170.278-98.31c-2.165-1.25-3.263-2.853-3.251-4.369l-.007.001v4.81l.007-.001c-.011 1.517 1.086 3.119 3.251 4.369l170.279 98.31c3.939 2.274 9.897 2.521 13.308.552l99.331-57.349 2.227-4.155 77.328-44.211 2.764.839 98.826-57.057c1.573-.908 2.32-2.13 2.292-3.405l.007-.001v-4.809l-.007.001c.027 1.274-.72 2.496-2.293 3.404z" fill="url(#SVGID_00000103241244723885632190000013612257476498407357_)"></path>
                            <path d="m509.697 232.27-280.476 161.933c-3.411 1.969-9.369 1.722-13.308-.552l-170.278-98.311c-2.165-1.25-3.263-2.852-3.251-4.369l-.007.001v4.81l.007-.001c-.011 1.517 1.086 3.119 3.251 4.369l170.279 98.311c3.939 2.274 9.897 2.521 13.308.552l280.476-161.933c1.573-.908 2.32-2.13 2.292-3.405l.007-.001v-4.81l-.007.001c.027 1.275-.72 2.497-2.293 3.405z" fill="url(#SVGID_00000079487984241370392720000016578770994935877040_)"></path>
                            <path d="m509.697 222.828-280.476 161.932c-3.411 1.969-9.369 1.722-13.308-.552l-170.278-98.31c-2.165-1.25-3.263-2.853-3.251-4.369l-.007.001v4.81l.007-.001c-.011 1.517 1.086 3.119 3.251 4.369l170.279 98.31c3.939 2.274 9.897 2.521 13.308.552l280.476-161.933c1.573-.908 2.32-2.13 2.292-3.405l.007-.001v-4.809l-.007.001c.027 1.275-.72 2.496-2.293 3.405z" fill="url(#SVGID_00000041988750697066700220000008896621971636224931_)"></path>
                            <path d="m509.697 213.279-280.476 161.933c-3.411 1.969-9.369 1.722-13.308-.552l-170.278-98.31c-2.165-1.25-3.263-2.852-3.251-4.369l-.007.001v4.81l.007-.001c-.011 1.517 1.086 3.119 3.251 4.369l170.279 98.311c3.939 2.274 9.897 2.521 13.308.552l280.476-161.933c1.573-.908 2.32-2.13 2.292-3.405l.007-.001v-4.81l-.007.001c.027 1.274-.72 2.496-2.293 3.404z" fill="url(#SVGID_00000040546825542028229130000013481962599481143221_)"></path>
                            <path d="m509.697 203.519-280.476 161.932c-3.411 1.969-9.369 1.722-13.308-.552l-170.278-98.31c-2.165-1.25-3.263-2.852-3.251-4.369l-.007.001v4.81l.007-.001c-.011 1.517 1.086 3.119 3.251 4.369l170.279 98.311c3.939 2.274 9.897 2.521 13.308.552l280.476-161.933c1.573-.908 2.32-2.13 2.292-3.405l.007-.001v-4.809l-.007.001c.027 1.274-.72 2.496-2.293 3.404z" fill="url(#SVGID_00000008121392477418329070000000792082031545480628_)"></path>
                            <g>
                              <path d="m42.376 305.33.007-.001c-.011 1.517 1.086 3.119 3.251 4.369l120.001 69.283 43.306-25.002-149.62-100.861-16.945 2.242z" fill="url(#SVGID_00000074401317466244254690000016038301375059558576_)"></path>
                            </g>
                            <path d="m324.7 91.35-277.815 160.397c-3.379 1.951-2.955 5.358.946 7.611l168.663 97.378c3.901 2.253 9.803 2.497 13.182.547l277.815-160.397c3.379-1.951 2.955-5.358-.946-7.611l-168.663-97.378c-3.902-2.253-9.803-2.497-13.182-.547z" fill="url(#SVGID_00000178914414621442392020000005596685627470042795_)"></path>
                            <path d="m325.155 90.077-99.007 57.161-31.284 23.28-51.268 24.382-98.917 57.11c-3.411 1.969-2.983 5.409.955 7.684l170.279 98.31c3.939 2.274 9.897 2.521 13.308.552l280.476-161.933c3.411-1.969 2.983-5.409-.956-7.684l-170.279-98.31c-3.938-2.274-9.896-2.521-13.307-.552zm101.999 82.713c-14.806 8.548-12.949 23.479 4.147 33.35 6.139 3.544 13.41 5.948 20.892 7.185l-194.043 112.03c-2.143-4.32-6.306-8.517-12.445-12.062-17.096-9.871-42.958-10.943-57.764-2.394-5.317 3.07-8.473 6.964-9.558 11.15l-70.474-40.688c7.25-.627 13.995-2.449 19.312-5.518 14.806-8.548 12.949-23.48-4.147-33.35-6.139-3.545-13.41-5.948-20.892-7.185l194.043-112.03c2.143 4.32 6.306 8.518 12.445 12.062 17.096 9.87 42.958 10.943 57.764 2.394 5.317-3.07 8.473-6.964 9.558-11.15l70.474 40.688c-7.25.626-13.995 2.449-19.312 5.518z" fill="url(#SVGID_00000158014704345547339290000016494649559852784300_)"></path>
                            <path d="m331.24 192.422c-34.85-20.121-87.568-22.306-117.749-4.881s-26.396 47.862 8.454 67.982 87.568 22.306 117.749 4.881 26.396-47.862-8.454-67.982z" fill="url(#SVGID_00000169531576223107312920000003651580625823966598_)"></path>
                          </g>
                          <g>
                            <path d="m328.552 301.207v50.005l82.319-47.527v-50.005l-41.159 17.064z" fill="url(#SVGID_00000168107474088649747130000004344528308460544681_)"></path>
                            <path d="m226.148 147.239-82.552 47.661 184.956 106.307 82.319-47.527z" fill="url(#SVGID_00000032614030094262496080000004517125037453224080_)"></path>
                            <g>
                              <path d="m315.872 240.115 9.198 5.31c3.242 1.872 3.242 4.177 0 6.049-2.502 1.445-8.757 1.445-11.259 0l-8.901-5.139c-4.005 1.676-8.457 3.036-13.114 4.042-8.023 1.732-18.767.29-20.91-2.815l-.036-.052c-2.089-3.026 2.224-6.145 10.508-7.565 6.604-1.132 12.465-2.897 15.931-4.898 4.412-2.548 5.304-5.241 1.813-7.257-11.228-6.483-34.587 14.848-57.987 1.338-10.473-6.047-11.202-14.015-2.724-21.198l-8.632-4.984c-3.241-1.871-3.241-4.177 0-6.049 2.502-1.444 8.757-1.444 11.258 0l8.146 4.703c1.999-.894 4.1-1.703 6.265-2.422 7.59-2.519 20.54-1.281 23.044 2.19 1.998 2.77-1.434 5.643-8.505 7.245-5.618 1.272-10.532 2.854-13.333 4.471-3.595 2.076-4.455 4.315-1.435 6.058 10.945 6.319 34.87-14.685 58.647-.957 11.606 6.702 10.718 15.06 2.026 21.93z" fill="#fff"></path>
                            </g>
                          </g>
                        </g>
                        <g>
                          <g>
                            <path d="m486.008 191.081.007-.001v-49.147l-469.62 62.137v49.119l.007-.001c-.011 1.517 1.086 3.119 3.251 4.369l170.279 98.31c3.939 2.274 9.897 2.521 13.308.552l99.331-57.349 46.712-29.596 35.607-17.931 98.826-57.057c1.573-.908 2.319-2.13 2.292-3.405z" fill="url(#SVGID_00000056399265785088990070000011306652201036093597_)"></path>
                            <path d="m483.716 190.527-280.476 161.933c-3.411 1.969-9.369 1.722-13.308-.552l-170.279-98.31c-2.165-1.25-3.263-2.853-3.251-4.369l-.007.001v4.81l.007-.001c-.011 1.517 1.086 3.119 3.251 4.369l170.279 98.31c3.939 2.274 9.897 2.521 13.308.552l99.331-57.349 2.227-4.155 77.328-44.211 2.764.839 98.826-57.057c1.573-.908 2.319-2.13 2.292-3.405l.007-.001v-4.81l-.007.001c.027 1.275-.719 2.497-2.292 3.405z" fill="url(#SVGID_00000031911176672358920120000005489672320189203880_)"></path>
                            <path d="m483.716 180.979-280.476 161.933c-3.411 1.969-9.369 1.722-13.308-.552l-170.279-98.311c-2.165-1.25-3.263-2.852-3.251-4.369l-.007.001v4.81l.007-.001c-.011 1.517 1.086 3.119 3.251 4.369l170.279 98.31c3.939 2.274 9.897 2.521 13.308.552l280.476-161.933c1.573-.908 2.319-2.13 2.292-3.405l.007-.001v-4.81l-.007.001c.027 1.276-.719 2.498-2.292 3.406z" fill="url(#SVGID_00000080171500772247854420000013982735007769899411_)"></path>
                            <path d="m483.716 171.537-280.476 161.932c-3.411 1.969-9.369 1.722-13.308-.552l-170.279-98.31c-2.165-1.25-3.263-2.853-3.251-4.369l-.007.001v4.81l.007-.001c-.011 1.517 1.086 3.119 3.251 4.369l170.279 98.311c3.939 2.274 9.897 2.521 13.308.552l280.476-161.933c1.573-.908 2.319-2.13 2.292-3.405l.007-.001v-4.81l-.007.001c.027 1.275-.719 2.496-2.292 3.405z" fill="url(#SVGID_00000093169367931510524910000016129778611485577627_)"></path>
                            <path d="m483.716 161.988-280.476 161.933c-3.411 1.969-9.369 1.722-13.308-.552l-170.279-98.31c-2.165-1.25-3.263-2.852-3.251-4.369l-.007.001v4.81l.007-.001c-.011 1.517 1.086 3.119 3.251 4.369l170.279 98.31c3.939 2.274 9.897 2.521 13.308.552l280.476-161.933c1.573-.908 2.319-2.13 2.292-3.405l.007-.001v-4.809l-.007.001c.027 1.275-.719 2.496-2.292 3.404z" fill="url(#SVGID_00000123428514402270943150000006416947569683988662_)"></path>
                            <path d="m483.716 152.228-280.476 161.932c-3.411 1.969-9.369 1.722-13.308-.552l-170.279-98.31c-2.165-1.25-3.263-2.852-3.251-4.369l-.007.001v4.81l.007-.001c-.011 1.517 1.086 3.119 3.251 4.369l170.279 98.311c3.939 2.274 9.897 2.521 13.308.552l280.476-161.933c1.573-.908 2.319-2.13 2.292-3.405l.007-.001v-4.81l-.007.001c.027 1.275-.719 2.497-2.292 3.405z" fill="url(#SVGID_00000167368448542779109550000004897286947612652197_)"></path>
                            <path d="m298.719 40.06-277.816 160.396c-3.379 1.951-2.955 5.358.946 7.611l168.663 97.378c3.901 2.253 9.803 2.497 13.182.547l277.816-160.397c3.379-1.951 2.955-5.358-.946-7.61l-168.664-97.379c-3.901-2.252-9.803-2.497-13.181-.546z" fill="url(#SVGID_00000098215608085546586830000007402636996879978153_)"></path>
                            <path d="m299.173 38.786-99.007 57.161-31.284 23.28-51.268 24.382-98.917 57.11c-3.411 1.969-2.983 5.41.955 7.683l170.279 98.311c3.939 2.274 9.897 2.521 13.308.552l280.476-161.933c3.411-1.969 2.983-5.409-.956-7.684l-170.279-98.31c-3.937-2.274-9.895-2.521-13.307-.552zm102 82.713c-14.806 8.548-12.949 23.479 4.147 33.35 6.139 3.545 13.41 5.948 20.892 7.185l-194.042 112.031c-2.143-4.32-6.306-8.517-12.445-12.062-17.096-9.871-42.958-10.943-57.764-2.394-5.317 3.07-8.473 6.964-9.558 11.15l-70.475-40.689c7.25-.627 13.995-2.449 19.312-5.518 14.806-8.548 12.949-23.48-4.147-33.35-6.139-3.545-13.41-5.948-20.892-7.185l194.043-112.03c2.143 4.32 6.306 8.517 12.445 12.062 17.096 9.87 42.958 10.942 57.764 2.394 5.317-3.07 8.473-6.964 9.558-11.15l70.474 40.688c-7.25.627-13.995 2.449-19.312 5.518z" fill="url(#SVGID_00000103953337385262383600000008168024021655968682_)"></path>
                            <path d="m305.259 141.131c-34.85-20.121-87.568-22.306-117.749-4.881s-26.396 47.862 8.454 67.982 87.568 22.306 117.749 4.881 26.396-47.861-8.454-67.982z" fill="url(#SVGID_00000140714572826244592020000004572149336927403420_)"></path>
                          </g>
                          <g>
                            <path d="m302.571 249.916v50.005l82.319-47.527v-50.005l-41.16 17.064z" fill="url(#SVGID_00000041267466201203304830000012179485810799738520_)"></path>
                            <path d="m200.167 95.948-82.552 47.661 184.956 106.307 82.319-47.527z" fill="url(#SVGID_00000083080120241724797030000009184134110946004889_)"></path>
                            <g>
                              <path d="m289.89 188.824 9.198 5.31c3.241 1.872 3.241 4.177 0 6.048-2.502 1.445-8.757 1.445-11.258 0l-8.901-5.139c-4.005 1.676-8.457 3.036-13.114 4.042-8.023 1.732-18.767.29-20.911-2.815l-.036-.052c-2.089-3.026 2.224-6.145 10.508-7.565 6.604-1.132 12.465-2.897 15.931-4.898 4.412-2.548 5.304-5.241 1.813-7.257-11.228-6.483-34.587 14.848-57.987 1.338-10.473-6.047-11.201-14.015-2.724-21.198l-8.632-4.984c-3.241-1.871-3.241-4.177 0-6.048 2.502-1.444 8.756-1.444 11.258 0l8.146 4.703c1.999-.894 4.1-1.703 6.265-2.422 7.59-2.519 20.54-1.281 23.044 2.19 1.998 2.77-1.434 5.643-8.505 7.245-5.617 1.272-10.532 2.854-13.333 4.471-3.595 2.076-4.455 4.315-1.436 6.058 10.945 6.319 34.87-14.684 58.647-.957 11.607 6.703 10.719 15.06 2.027 21.93z" fill="#fff"></path>
                            </g>
                          </g>
                        </g>
                      </g>
                    </g>
                  </svg>
                  <h1 className="text-white text-base sm:text-xl font-bold leading-snug">
                    Ganhe {formatCurrency(recompensa)} de SALDO REAL
                  </h1>
                </div>

                <p className="text-slate-300 leading-relaxed text-sm max-md:text-[13px]">
                  {recompensa > 0 ? (
                    <>
                      Indique seus amigos para a {nomeBet} e receba{' '}
                      <span className="text-brand-light font-bold">{formatCurrency(recompensa)}</span> em
                      saldo real por cada um que se cadastrar com o seu link e fizer o primeiro depósito de
                      no mínimo{' '}
                      <span className="text-brand-light font-bold">{formatCurrency(depositoMinimo)}</span>.
                      A recompensa cai direto na sua carteira e pode ser sacada.
                    </>
                  ) : (
                    <>O programa Indique e Ganhe está temporariamente desativado. Volte em breve!</>
                  )}
                </p>
              </div>

              <div className="border-t border-slate-800 pt-5 md:pt-6">
                <div className="flex flex-col max-md:gap-2 sm:flex-row gap-2 mb-4">
                  <input
                    type="text"
                    value={loading ? 'Carregando...' : referralLink}
                    readOnly
                    disabled={loading}
                    className="flex-1 min-w-0 px-3 py-2.5 rounded-lg border border-brand/30 text-slate-300 font-mono text-xs focus:outline-none disabled:opacity-50"
                    style={{ backgroundColor: cardBg }}
                  />
                  <button
                    onClick={handleCopyLink}
                    disabled={loading || !referralCode}
                    className="max-md:w-full px-4 py-2.5 rounded-lg text-white font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: 'var(--brand-primary)' }}
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? 'Link Copiado!' : 'Copiar link'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-lg p-3 flex items-center gap-3" style={{ backgroundColor: cardBg }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--brand-primary)' }}>
                      <span className="iconify" data-icon="fa6-solid:money-bill-trend-up" aria-hidden="true" style={{ fontSize: '20px', color: '#fff' }}></span>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Indicações qualificadas</p>
                      <p className="text-white text-sm font-bold">{loading ? '...' : qualifiedReferrals}</p>
                    </div>
                  </div>

                  <div className="rounded-lg p-3 flex items-center gap-3" style={{ backgroundColor: cardBg }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--brand-primary)' }}>
                      <span className="iconify" data-icon="material-symbols:person-add-rounded" aria-hidden="true" style={{ fontSize: '20px', color: '#fff' }}></span>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Registros ao seu link</p>
                      <p className="text-white text-sm font-bold">{loading ? '...' : totalReferrals}</p>
                    </div>
                  </div>

                  <div className="rounded-lg p-3 flex items-center gap-3" style={{ backgroundColor: cardBg }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--brand-primary)' }}>
                      <span className="iconify" data-icon="fluent:person-money-24-filled" aria-hidden="true" style={{ fontSize: '20px', color: '#fff' }}></span>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Seus ganhos totais</p>
                      <p className="text-white text-sm font-bold">
                        {loading ? '...' : formatCurrency(ganhosTotais)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="max-md:min-h-[6vh] md:min-h-[20vh]" aria-hidden="true" />

        <Footer containerClassName="w-full" />
      </div>
    </AppPageScaffold>
  );
}
