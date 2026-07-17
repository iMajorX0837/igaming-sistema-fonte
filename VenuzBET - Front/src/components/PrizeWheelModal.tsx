import { useCallback, useEffect, useState } from 'react';

import { X } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';

import { usePrizeWheel } from '../hooks/usePrizeWheel';

import {
  formatPrizeMessage,
  getPrizeWheelErrorMessage,
  girarRoleta,
  type GirarRoletaResult,
} from '../lib/prizeWheel';
import { grantPrizeWheelBonus } from '../lib/freeBonus';
import { resolveFreeBonusGameBySlug } from '../utils/resolveGameBySlug';



const WHEEL_SIZE = 434;

const CENTER_SIZE = 120;

const TITLE_SIZE = { width: 250, height: 137 };

const BANNER_SIZE = { width: 200, height: 83 };

const SPIN_DURATION_MS = 4800;

const MIN_EXTRA_SPINS = 4;

const MAX_EXTRA_SPINS = 6;



function getRandomInt(min: number, max: number) {

  return Math.floor(Math.random() * (max - min + 1)) + min;

}



function computeTargetRotation(

  currentRotation: number,

  winnerIndex: number,

  segmentCount: number,

  extraSpins: number

) {

  const segmentAngle = 360 / segmentCount;

  const targetMod = (winnerIndex * segmentAngle) % 360;

  const currentMod = ((currentRotation % 360) + 360) % 360;

  let delta = targetMod - currentMod;

  if (delta <= 0) delta += 360;

  return currentRotation + extraSpins * 360 + delta;

}



interface PrizeWheelModalProps {

  isOpen: boolean;

  onClose: () => void;

}



export default function PrizeWheelModal({ isOpen, onClose }: PrizeWheelModalProps) {

  const { isAuthenticated, user } = useAuth();

  const { segments, status, images, refreshStatus } = usePrizeWheel(isAuthenticated);

  const [rotation, setRotation] = useState(0);

  const [isSpinning, setIsSpinning] = useState(false);

  const [hasSpun, setHasSpun] = useState(false);

  const [prizeResult, setPrizeResult] = useState<GirarRoletaResult | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);



  const segmentCount = segments.length;

  const canSpin = isAuthenticated && (status?.pode_girar ?? false) && !hasSpun && !isSpinning;



  const resetState = useCallback(() => {

    setRotation(0);

    setIsSpinning(false);

    setHasSpun(false);

    setPrizeResult(null);

    setErrorMessage(null);

  }, []);



  useEffect(() => {

    if (!isOpen) {

      resetState();

    } else {

      void refreshStatus();

    }

  }, [isOpen, resetState, refreshStatus]);



  const handleSpin = useCallback(async () => {

    if (!canSpin || segmentCount === 0) return;



    if (!isAuthenticated) {

      setErrorMessage('Faça login para girar a roleta.');

      return;

    }



    setIsSpinning(true);

    setErrorMessage(null);



    const result = await girarRoleta();

    if (!result.ok || result.winner_index == null) {
      setIsSpinning(false);
      setErrorMessage(getPrizeWheelErrorMessage(result.error));
      return;
    }

    if (!result.requer_deposito && user?.email) {
      const winningSegment = segments[result.winner_index];
      const jogoSlug = result.jogo_slug || winningSegment?.jogo_slug;
      const providerSlug = result.provider_slug || winningSegment?.provider_slug;
      const jogoNome = result.jogo_nome || winningSegment?.jogo_nome;
      const rounds = result.quantidade_giros ?? winningSegment?.quantidade_giros ?? 0;

      if (rounds > 0) {
        const resolved = jogoSlug ? await resolveFreeBonusGameBySlug(jogoSlug, providerSlug) : null;

        if (!resolved?.game_code) {
          result.grant_error = `Não foi possível identificar o jogo "${jogoNome || jogoSlug || 'desconhecido'}" na PlayFivers.`;
        } else {
          const grantResult = await grantPrizeWheelBonus({
            userCode: user.email,
            gameCode: resolved.game_code,
            rounds,
          });

          if (!grantResult.ok) {
            result.grant_error =
              grantResult.msg ||
              'Prêmio sorteado, mas não foi possível enviar as rodadas grátis. Verifique em Rodadas Grátis na carteira.';
          }
        }
      } else {
        result.grant_error = 'Quantidade de rodadas do prêmio inválida.';
      }
    }

    const extraSpins = getRandomInt(MIN_EXTRA_SPINS, MAX_EXTRA_SPINS);

    const nextRotation = computeTargetRotation(rotation, result.winner_index, segmentCount, extraSpins);



    setRotation(nextRotation);



    window.setTimeout(() => {

      setIsSpinning(false);

      setHasSpun(true);

      setPrizeResult(result);

      void refreshStatus();

    }, SPIN_DURATION_MS);

  }, [canSpin, segmentCount, isAuthenticated, user, segments, rotation, refreshStatus]);



  const handleClose = useCallback(() => {

    resetState();

    onClose();

  }, [onClose, resetState]);



  if (!isOpen) return null;



  return (

    <div

      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-md"

      onClick={handleClose}

    >

      <div

        className="relative flex max-h-[92vh] w-full max-w-[434px] flex-col"

        onClick={(event) => event.stopPropagation()}

      >

        <button

          type="button"

          onClick={handleClose}

          className="absolute right-0 top-0 z-10 rounded-lg p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"

          aria-label="Fechar roleta"

        >

          <X className="h-5 w-5" />

        </button>



        <div className="overflow-y-auto px-2 pb-2 pt-8">

          <div className="flex flex-col items-center">

            <div className="z-[1] -mb-20 flex flex-col items-center">

              <img

                src={images.titulo}

                alt="Roleta Diária de Prêmios"

                width={TITLE_SIZE.width}

                height={TITLE_SIZE.height}

                className="shrink-0 object-contain"

                style={{ width: TITLE_SIZE.width, height: TITLE_SIZE.height }}

                loading="lazy"

                draggable={false}

              />



              <img

                src={images.banner}

                alt="Seu Prêmio"

                width={BANNER_SIZE.width}

                height={BANNER_SIZE.height}

                className="-mt-2 shrink-0 object-contain"

                style={{ width: BANNER_SIZE.width, height: BANNER_SIZE.height }}

                loading="lazy"

                draggable={false}

              />

            </div>



            <div

              className="relative shrink-0"

              style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}

            >

              <img

                src={images.roleta}

                alt="Roleta Urano"

                width={WHEEL_SIZE}

                height={WHEEL_SIZE}

                className={`prize-wheel-modal__wheel ${isSpinning ? 'is-spinning' : ''}`}

                style={{

                  width: WHEEL_SIZE,

                  height: WHEEL_SIZE,

                  transform: `rotate(${rotation}deg)`,

                }}

                loading="lazy"

                draggable={false}

              />



              <button

                type="button"

                onClick={handleSpin}

                disabled={!canSpin}

                className={`prize-wheel-modal__spin-btn ${isSpinning ? 'is-spinning' : ''} ${!canSpin && !isSpinning ? 'is-unavailable' : ''}`}

                aria-label={isSpinning ? 'Roleta girando' : 'Girar roleta'}

              >

                <img

                  src={images.centro}

                  alt=""

                  width={CENTER_SIZE}

                  height={CENTER_SIZE}

                  className="object-contain"

                  style={{ width: CENTER_SIZE, height: CENTER_SIZE }}

                  draggable={false}

                />

              </button>

            </div>



            <div className="mt-4 w-full px-2 text-center">

              {!isAuthenticated && (

                <p className="text-sm text-amber-300">Faça login para girar a roleta.</p>

              )}

              {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}

              {prizeResult?.ok && (
                <p className="text-sm font-medium text-green-300">{formatPrizeMessage(prizeResult)}</p>
              )}

              {prizeResult?.grant_error && (
                <p className="text-sm text-amber-300">{prizeResult.grant_error}</p>
              )}

            </div>

          </div>

        </div>

      </div>

    </div>

  );

}

