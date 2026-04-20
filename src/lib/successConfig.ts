import {
  CheckCircle, BadgeCheck, ShieldCheck, CircleCheck, ThumbsUp,
  Trophy, Award, Star, Crown, Gift, PartyPopper, Sparkles, Medal, Heart, Rocket,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const DEFAULT_SUCCESS_MESSAGE = `<h2>Muito obrigado pela sua compra!</h2><p>Seu pedido foi processado com sucesso e você receberá todas as informações no e-mail cadastrado em breve. Qualquer dúvida, nossa equipe está pronta para ajudar.</p>`;
export const DEFAULT_SUCCESS_ICON    = 'CheckCircle';
export const DEFAULT_SUCCESS_COLOR   = '#00C9A7';

export const ICON_MAP: Record<string, LucideIcon> = {
  CheckCircle, BadgeCheck, ShieldCheck, CircleCheck, ThumbsUp,
  Trophy, Award, Star, Crown, Gift, PartyPopper, Sparkles, Medal, Heart, Rocket,
};

export interface IconOption { id: string; label: string; }
export interface IconGroup  { group: string; items: IconOption[]; }

export const ICON_OPTIONS: IconGroup[] = [
  {
    group: 'Aprovado',
    items: [
      { id: 'CheckCircle',  label: 'Check'    },
      { id: 'BadgeCheck',   label: 'Badge'    },
      { id: 'ShieldCheck',  label: 'Escudo'   },
      { id: 'CircleCheck',  label: 'Círculo'  },
      { id: 'ThumbsUp',     label: 'Joinha'   },
    ],
  },
  {
    group: 'Parabéns',
    items: [
      { id: 'Trophy',       label: 'Troféu'   },
      { id: 'Award',        label: 'Prêmio'   },
      { id: 'Medal',        label: 'Medalha'  },
      { id: 'Crown',        label: 'Coroa'    },
      { id: 'Star',         label: 'Estrela'  },
      { id: 'PartyPopper',  label: 'Festa'    },
      { id: 'Sparkles',     label: 'Brilhos'  },
      { id: 'Gift',         label: 'Presente' },
      { id: 'Heart',        label: 'Coração'  },
      { id: 'Rocket',       label: 'Foguete'  },
    ],
  },
];

export const COLOR_OPTIONS = [
  { hex: '#00C9A7', label: 'Verde'    },
  { hex: '#0055FE', label: 'Azul'     },
  { hex: '#7C3AED', label: 'Roxo'     },
  { hex: '#F59E0B', label: 'Âmbar'   },
  { hex: '#FF4D6D', label: 'Vermelho' },
  { hex: '#06B6D4', label: 'Ciano'    },
  { hex: '#F97316', label: 'Laranja'  },
  { hex: '#EC4899', label: 'Rosa'     },
];
