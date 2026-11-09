import { formatDate } from '../../../core/utils/date.util';
import { Role } from '../../auth/domain/entities/account.entity';
import { ApiEntiteResume } from '../../dossiers/domain/entities/dossier-api.entity';

export type CritereRecherche = 'COMPTE' | 'CLIENT' | 'ETAT' | 'AGENCE' | 'MATRICULE';

export interface CritereOption {
  value: CritereRecherche;
  label: string;
  field: string;
  placeholder: string;
  numeric?: boolean;
}

export const CRITERES: readonly CritereOption[] = [
  {
    value: 'COMPTE',
    label: 'N° compte',
    field: 'Numéro de compte',
    placeholder: '9 chiffres, clé facultative',
    numeric: true,
  },
  {
    value: 'CLIENT',
    label: 'Nom client',
    field: 'Nom ou prénom du client',
    placeholder: 'Ex. Koffi',
  },
  { value: 'ETAT', label: 'N° état', field: "Numéro de l'état", placeholder: 'Ex. ET-2026-0047' },
  { value: 'AGENCE', label: 'Code agence', field: "Code de l'agence", placeholder: 'Ex. AG-014' },
  {
    value: 'MATRICULE',
    label: 'Matricule',
    field: "Matricule de l'agent",
    placeholder: 'Ex. a.diallo',
  },
];

/** Une agence ne voit que ses propres états : chercher par code agence n'a pas de sens pour elle. */
export function criteresPour(role: Role | null): readonly CritereOption[] {
  return role === 'agence' ? CRITERES.filter((critere) => critere.value !== 'AGENCE') : CRITERES;
}

export interface EtatTrouve {
  id: string;
  reference: string;
  entiteEmettrice: ApiEntiteResume;
  agentEmetteur: string | null;
  typeEtatNom: string | null;
  nombreDossiers: number;
  nombreRecus: number;
  statut: 'TEMPORAIRE' | 'TRANSMIS' | 'RECU_PARTIELLEMENT' | 'RECU';
  transmisLe: string | null;
  recuLe: string | null;
}

export interface AttestationTrouvee {
  dossierId: string;
  reference: string;
  client: string;
  compte: string | null;
  typeAttestation: string | null;
  entiteEmettrice: ApiEntiteResume;
  creeLe: string;
  statut: string;
  etatId: string | null;
}

export interface Reception {
  label: string;
  recu: boolean;
}

export function receptionOf(etat: EtatTrouve): Reception {
  if (!etat.nombreRecus) {
    return { label: 'Non reçu', recu: false };
  }
  return {
    label: `${formatDate(etat.recuLe ?? '')} (${etat.nombreRecus}/${etat.nombreDossiers})`,
    recu: true,
  };
}
